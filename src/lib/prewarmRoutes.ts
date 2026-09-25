import { listCachedKeys } from '@/lib/cache';

// Private documents to keep in the service worker's page cache (`pages-<buildId>`).
// SPA clicks never reach the worker's navigation handler, so without this the cache
// only fills on a full document load (F5) and an offline tap on Android — where
// there is no F5 — falls through to /offline.html. The six static routes are warmed
// unconditionally; a dynamic `[id]`, print or shopping document is warmed only when
// IndexedDB already holds the record it renders (see dynamicRoutes), so a warmed
// page can never open empty offline.
const ROUTES = ['/', '/gear', '/food', '/lists', '/meals', '/settings'];

const MAX_CONCURRENT_REQUESTS = 3;

// The worker's page cache evicts past 50 entries (src/sw.ts), which leaves headroom
// for the 6 static routes plus this dynamic tail.
const MAX_DYNAMIC_DOCUMENTS = 40;

// `list:<id>` and `meal-plan:<id>` are the IndexedDB keys written through
// cacheKeys.listDetail / cacheKeys.mealPlanDetail (src/lib/cache.ts) by the exact reads
// those documents perform at render time. Keys that cannot prove one record is cached
// are skipped: collections (`lists:`, `meals:`, `meals-light:`) carry no route id, and
// `list-items:<id>` alone does not prove the parent list detail is cached.
function dynamicRoutes(keys: string[]): string[] {
  const routes = new Set<string>();
  for (const key of keys) {
    const listId = /^list:([^:]+)$/.exec(key)?.[1];
    const planId = /^meal-plan:([^:]+)$/.exec(key)?.[1];
    if (listId) {
      routes.add(`/lists/${listId}`);
      routes.add(`/lists/${listId}/print`);
    }
    if (planId) {
      routes.add(`/meals/${planId}`);
      routes.add(`/meals/${planId}/print`);
      routes.add(`/meals/${planId}/shopping`);
    }
  }
  return [...routes].slice(0, MAX_DYNAMIC_DOCUMENTS);
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

  const pending = [...ROUTES, ...dynamicRoutes(await listCachedKeys())];
  const warm = async () => {
    for (let route = pending.shift(); route !== undefined; route = pending.shift()) {
      try {
        // `x-prohikes-prewarm` is what the worker's matcher in src/sw.ts keys on;
        // `no-store` keeps the HTTP cache out of the way, the Cache API is the target.
        await fetch(route, {
          headers: { 'x-prohikes-prewarm': '1' },
          credentials: 'same-origin',
          cache: 'no-store',
        });
      } catch {
        // Offline mid-run or a response the worker refused: this document stays
        // uncached and offline navigation falls back to /offline.html as before.
      }
    }
  };

  await Promise.all(Array.from({ length: MAX_CONCURRENT_REQUESTS }, () => warm()));
}
