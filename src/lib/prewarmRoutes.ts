import { fetchWithTimeout } from '@/lib/fetchJson';
import { cacheKeys, getCached, listCachedKeys } from '@/lib/cache';
import { resolveUser } from '@/lib/supabase/resolveUser';
import {
  fetchListItems,
  fetchMealPlanDetail,
  fetchUserListDetail,
} from '@/lib/supabase/service';

// Private documents to keep in the service worker's page cache (`pages-<buildId>`).
// SPA clicks never reach the worker's navigation handler, so without this the cache
// only fills on a full document load (F5) and an offline tap on Android — where
// there is no F5 — falls through to /offline.html. The six static routes are warmed
// unconditionally; a dynamic `[id]`, print or shopping document is warmed only for a
// record IndexedDB already knows about — its detail key or its entry in a cached
// collection — and the warm pass fetches the record's detail data alongside, so a
// warmed page cannot open empty offline.
const ROUTES = ['/', '/gear', '/food', '/lists', '/meals', '/settings'];

const MAX_CONCURRENT_REQUESTS = 3;

// Фоновая задача не должна ждать зависшую сеть: не ответивший вовремя маршрут
// пропускается так же, как любой сбой ниже.
const PREWARM_TIMEOUT_MS = 5000;

// The worker's page cache evicts past 50 entries (src/sw.ts), which leaves headroom
// for the 6 static routes plus this dynamic tail.
const MAX_DYNAMIC_DOCUMENTS = 40;

// Upper bound, per kind, on records whose detail data one prewarm pass downloads.
// Collection payloads are ordered newest-first, so the budget first covers the records
// most likely to be opened; ids already cached do not spend it, so successive passes
// reach the rest. Worst case this adds 32 queries (a list costs two, a plan two).
const MAX_DATA_WARMUPS_PER_KIND = 8;

// A collection payload can be absent, of an unexpected shape or hold rows without an
// id; none of those may throw.
function recordIds(payload: unknown): string[] {
  if (!Array.isArray(payload)) return [];
  return payload.flatMap((row) => {
    const id = (row as { id?: unknown } | null)?.id;
    return typeof id === 'string' && id ? [id] : [];
  });
}

interface DynamicPrewarm {
  documents: string[];
  listIds: string[];
  planIds: string[];
}

// Every cache key is scoped to its owner: `u:<uid>:<kind>[:<id>]` (src/lib/cache.ts).
// Only the signed-in user's keys are prewarmed — the cache outlives a sign-out, and a
// document or detail fetch for another account's key would run under this user's RLS,
// fail, and spend the warm-up budget for nothing. Within that scope, `u:<uid>:list:<id>`
// and `u:<uid>:meal-plan:<id>` are the IndexedDB keys written through cacheKeys.listDetail
// / cacheKeys.mealPlanDetail by the exact reads those documents perform at render time.
// The collection keys — `u:<uid>:lists`, `u:<uid>:meals` (written by fetchUserMealPlans,
// used by /meals and the dashboard) and `u:<uid>:meals-light` (written by
// fetchUserMealPlansLight, used by the linked-plan select) — hold records the user has
// seen listed but may never have opened; their payloads carry the ids, whose detail data
// warmDetailData then fetches.
async function dynamicRoutes(userId: string, keys: string[]): Promise<DynamicPrewarm> {
  const documents = new Set<string>();
  const listIds = new Set<string>();
  const planIds = new Set<string>();

  const addListDocuments = (id: string) => {
    documents.add(`/lists/${id}`);
    documents.add(`/lists/${id}/print`);
  };
  const addPlanDocuments = (id: string) => {
    documents.add(`/meals/${id}`);
    documents.add(`/meals/${id}/print`);
    documents.add(`/meals/${id}/shopping`);
  };

  const userPrefix = `u:${userId}:`;

  for (const key of keys) {
    if (!key.startsWith(userPrefix)) continue;
    // `list:<id>` and `meal-plan:<id>` are single-segment kinds: `list-items:<id>`,
    // `lists` and `meals-light` cannot match either pattern.
    const scopedKey = key.slice(userPrefix.length);

    const listId = /^list:([^:]+)$/.exec(scopedKey)?.[1];
    const planId = /^meal-plan:([^:]+)$/.exec(scopedKey)?.[1];
    if (listId) {
      addListDocuments(listId);
      listIds.add(listId);
    }
    if (planId) {
      addPlanDocuments(planId);
      planIds.add(planId);
    }

    // The matched key is the cache key itself, so it goes to getCached unchanged.
    if (/^lists$/.test(scopedKey)) {
      for (const id of recordIds(await getCached(key))) listIds.add(id);
    }
    if (/^meals(?:-light)?$/.test(scopedKey)) {
      for (const id of recordIds(await getCached(key))) planIds.add(id);
    }
  }

  // Collection-derived documents are appended after the detail-derived ones, so the
  // MAX_DYNAMIC_DOCUMENTS slice keeps exactly the documents it kept before this source
  // existed and uses only the leftover slots.
  for (const id of listIds) addListDocuments(id);
  for (const id of planIds) addPlanDocuments(id);

  return {
    documents: [...documents].slice(0, MAX_DYNAMIC_DOCUMENTS),
    listIds: [...listIds],
    planIds: [...planIds],
  };
}

// A warmed document renders from IndexedDB, so every derived record needs its detail
// data fetched as well. An id whose keys are already present is skipped without
// spending budget, which makes the steady state zero requests and lets successive passes
// drain a large collection. Failures are dropped exactly like the document failures.
async function warmDetailData(userId: string, listIds: string[], planIds: string[]): Promise<void> {
  let listBudget = MAX_DATA_WARMUPS_PER_KIND;
  let planBudget = MAX_DATA_WARMUPS_PER_KIND;

  for (const id of listIds) {
    if (listBudget === 0) break;
    try {
      const [detail, items] = await Promise.all([
        getCached(cacheKeys.listDetail(userId, id)),
        getCached(cacheKeys.listItems(userId, id)),
      ]);
      if (detail && items) continue;
      listBudget--;
      if (!detail) await fetchUserListDetail(userId, id);
      if (!items) await fetchListItems(userId, id);
    } catch {
      // This record stays without offline data; the remaining ones are still worth trying.
    }
  }

  for (const id of planIds) {
    if (planBudget === 0) break;
    try {
      if (await getCached(cacheKeys.mealPlanDetail(userId, id))) continue;
      planBudget--;
      await fetchMealPlanDetail(userId, id);
    } catch {
      // Same trade-off as above: skip past the failure instead of aborting the pass.
    }
  }
}

// On the reconnect event the browser reloads the page, which runs this module
// again, so one run per loaded document is enough.
let started = false;

/**
 * Fetch the private pages so the service worker stores their documents in the page
 * cache. Best-effort by design: any failure is dropped, nothing is surfaced.
 */
export async function prewarmRoutes(): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.onLine || started) return;
  started = true;

  // Cache keys are user-scoped, so the id is resolved first. Without a session there is
  // no dynamic tail to warm; the six static documents still warm as before.
  const user = await resolveUser();
  const { documents, listIds, planIds } = user
    ? await dynamicRoutes(user.id, await listCachedKeys())
    : { documents: [], listIds: [], planIds: [] };
  const pending = [...ROUTES, ...documents];
  const warm = async () => {
    for (let route = pending.shift(); route !== undefined; route = pending.shift()) {
      try {
        // `x-prohikes-prewarm` is what the worker's matcher in src/sw.ts keys on;
        // `no-store` keeps the HTTP cache out of the way, the Cache API is the target.
        await fetchWithTimeout(route, {
          timeoutMs: PREWARM_TIMEOUT_MS,
          headers: { 'x-prohikes-prewarm': '1' },
          credentials: 'same-origin',
          cache: 'no-store',
        });
      } catch {
        // Offline mid-run, a timeout or a response the worker refused: this document
        // stays uncached and offline navigation falls back to /offline.html as before.
      }
    }
  };

  await Promise.all([
    ...Array.from({ length: MAX_CONCURRENT_REQUESTS }, () => warm()),
    ...(user ? [warmDetailData(user.id, listIds, planIds)] : []),
  ]);
}
