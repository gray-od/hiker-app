import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'prohikes-cache';
// v2 adds the `generations` store: durable per-key write stamps (see GenerationRecord).
// The upgrade creates only what is missing, so a v1 database keeps every cached row.
const DB_VERSION = 2;

interface CacheEntry<T> {
  key: string;
  data: T;
  timestamp: number;
}

/**
 * Per-key generation stamp. A background refresh can resolve after its key was invalidated
 * or rewritten by a newer write; storing that answer then would revive data a mutation has
 * already dropped. Every write (setCache/removeCache, plus the guarded write below) bumps
 * the key's stamp, and a refresh stores its result only while the stamp it started on is
 * still current. The stamps live in IndexedDB rather than in a tab's memory, so an
 * invalidation in one tab stops a refresh already in flight in another.
 */
interface GenerationRecord {
  key: string;
  generation: number;
  timestamp: number;
}

// The read TTL is 5 minutes, but an expired entry is not garbage: getCached serves it as the
// offline fallback (and withCache does after a network failure), so it must survive a trip
// without connectivity. The periodic sweep only drops entries untouched for this long.
const STALE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

// Safety valve, not a working limit: an account holds a handful of collection entries plus
// one detail entry per list and plan (about 50 for a heavy user), so even a shared browser
// with several accounts stays well below this cap. Eviction keeps the newest entries.
const MAX_CACHE_ENTRIES = 500;

// On QuotaExceededError the oldest quarter of the store is reclaimed first: enough headroom
// for the single retry that follows, without emptying a cache that is still useful offline.
const QUOTA_RECLAIM_RATIO = 0.25;

// The sweep walks both stores, so it runs at most once per interval; every write between
// sweeps stays a single put. The clock is per tab; overlapping sweeps in two tabs are harmless.
const SWEEP_MIN_INTERVAL_MS = 5 * 60 * 1000;

// Generation records are tiny and are also pruned by age; this cap bounds a user with
// hundreds of detail keys whose records are all fresh.
const MAX_GENERATION_RECORDS = 1000;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('cache')) {
        db.createObjectStore('cache', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('generations')) {
        db.createObjectStore('generations', { keyPath: 'key' });
      }
    },
    blocked() {
      console.warn(
        'IndexedDB cache upgrade is blocked by an older tab; cache reads and writes wait' +
          ' for that tab to be reloaded or closed.',
      );
    },
  }).then((db) => {
    // A newer build can only upgrade the database once every older connection closes.
    // Releasing ours on `versionchange` keeps this tab from blocking the next upgrade.
    db.addEventListener('versionchange', () => {
      db.close();
      dbPromise = null;
    });
    return db;
  });
  return dbPromise;
}

/**
 * One-time cleanup of keys left by pre-user-schema releases (`list:<id>`, `lists:<uid>`,
 * ...). Every current key starts with `u:`; anything else in this store is dead weight that
 * would otherwise occupy quota until the retention sweep. Only this module's own database
 * is touched — the offline mutation queue lives in a separate database and is never
 * involved.
 */
async function cleanupLegacyKeys(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('cache', 'readwrite');
  const store = tx.objectStore('cache');
  let cursor = await store.openCursor();
  while (cursor) {
    if (!String(cursor.key).startsWith('u:')) {
      await cursor.delete();
    }
    cursor = await cursor.continue();
  }
  await tx.done;
}

let schemaReady: Promise<void> | null = null;

function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    // On failure the promise is cleared so a later call retries, and the error still goes
    // to the console instead of disappearing.
    schemaReady = cleanupLegacyKeys().catch((err) => {
      console.error('IndexedDB cache legacy cleanup failed:', err);
      schemaReady = null;
    });
  }
  return schemaReady;
}

/** The database, with the legacy-key cleanup guaranteed to have run at least once. */
async function readyDB(): Promise<IDBPDatabase> {
  await ensureSchema();
  return getDB();
}

function isQuotaExceeded(err: unknown): boolean {
  // The exception may cross realms or come from a polyfill, so match the name, which is
  // the stable part (Firefox historically used NS_ERROR_DOM_QUOTA_REACHED).
  const name = (err as { name?: unknown } | null | undefined)?.name;
  return name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED';
}

/** The key's current stamp, or null when the store could not be read. */
async function readGeneration(key: string): Promise<number | null> {
  try {
    const db = await readyDB();
    const record = (await db.get('generations', key)) as GenerationRecord | undefined;
    return record?.generation ?? 0;
  } catch (err) {
    // A refresh must not cache on top of an invalidation this read could not see, so the
    // caller learns the stamp is unknown instead of a guessed value.
    console.error('IndexedDB cache generation read failed:', key, err);
    return null;
  }
}

type EntryWriteOutcome = 'written' | 'skipped';

/**
 * One write attempt. The stamp check, the stamp bump and the entry write share a single
 * transaction over both stores: they commit atomically, and any invalidate (from this tab
 * or another) is serialised with them, so a refresh that lost the race cannot overwrite the
 * data the invalidate dropped.
 */
async function putEntryAttempt<T>(
  key: string,
  data: T,
  timestamp: number,
  expectedGeneration: number | null,
): Promise<EntryWriteOutcome> {
  const db = await readyDB();
  const tx = db.transaction(['cache', 'generations'], 'readwrite');
  const generations = tx.objectStore('generations');
  const current = (await generations.get(key)) as GenerationRecord | undefined;
  if (expectedGeneration !== null && (current?.generation ?? 0) !== expectedGeneration) {
    await tx.done;
    return 'skipped';
  }
  await generations.put({ key, generation: (current?.generation ?? 0) + 1, timestamp });
  await tx.objectStore('cache').put({ key, data, timestamp });
  await tx.done;
  return 'written';
}

interface ReclamationResult {
  expired: number;
  evicted: number;
}

/**
 * Periodic maintenance over both stores: drop entries past the retention horizon, trim the
 * store to MAX_CACHE_ENTRIES (oldest first), and prune generation stamps by the same rules.
 * Runs on a clock (and harder on quota errors) rather than on every operation, so ordinary
 * reads and writes stay single-transaction.
 */
async function collectGarbage(now: number, reclaimRatio = 0): Promise<ReclamationResult> {
  const db = await getDB();
  const tx = db.transaction(['cache', 'generations'], 'readwrite');
  const entries = tx.objectStore('cache');
  const generations = tx.objectStore('generations');

  const survivors: CacheEntry<unknown>[] = [];
  let expired = 0;
  let cursor = await entries.openCursor();
  while (cursor) {
    const entry = cursor.value as CacheEntry<unknown>;
    if (now - entry.timestamp > STALE_RETENTION_MS) {
      await cursor.delete();
      expired += 1;
    } else {
      survivors.push(entry);
    }
    cursor = await cursor.continue();
  }

  survivors.sort((a, b) => a.timestamp - b.timestamp);
  const toEvict = Math.max(
    survivors.length - MAX_CACHE_ENTRIES,
    Math.ceil(survivors.length * reclaimRatio),
  );
  let evicted = 0;
  for (const entry of survivors.slice(0, toEvict)) {
    await entries.delete(entry.key);
    evicted += 1;
  }

  // A stamp is pruned after the same quiet period. A refresh lives for seconds
  // (NETWORK_TIMEOUT_MS), so pruning can never erase a stamp a live guard still needs: a
  // guard whose stamp disappears reads 0, which differs from what it captured, and its
  // write is skipped — the conservative outcome.
  const stamps: GenerationRecord[] = [];
  let stampCursor = await generations.openCursor();
  while (stampCursor) {
    const record = stampCursor.value as GenerationRecord;
    if (now - record.timestamp > STALE_RETENTION_MS) {
      await stampCursor.delete();
    } else {
      stamps.push(record);
    }
    stampCursor = await stampCursor.continue();
  }
  stamps.sort((a, b) => a.timestamp - b.timestamp);
  for (const record of stamps.slice(0, stamps.length - MAX_GENERATION_RECORDS)) {
    await generations.delete(record.key);
  }

  await tx.done;
  return { expired, evicted };
}

let lastSweepAt = 0;

async function maybeSweep(): Promise<void> {
  const now = Date.now();
  if (now - lastSweepAt < SWEEP_MIN_INTERVAL_MS) return;
  lastSweepAt = now;
  try {
    await collectGarbage(now);
  } catch (err) {
    console.error('IndexedDB cache sweep failed:', err);
  }
}

/**
 * Store one entry and bump its stamp. `expectedGeneration` is the stamp a background refresh
 * captured when it started; a mismatch drops the write (the key was invalidated or rewritten
 * meanwhile, possibly in another tab). Quota errors get one recovery pass — reclaim expired
 * and oldest entries, then retry — and a persistent failure is logged, never swallowed.
 */
async function writeEntry<T>(key: string, data: T, expectedGeneration: number | null): Promise<void> {
  let outcome: EntryWriteOutcome;
  try {
    outcome = await putEntryAttempt(key, data, Date.now(), expectedGeneration);
  } catch (err) {
    if (!isQuotaExceeded(err)) {
      console.error('IndexedDB cache write failed:', key, err);
      return;
    }
    let reclaimed = 0;
    try {
      const result = await collectGarbage(Date.now(), QUOTA_RECLAIM_RATIO);
      reclaimed = result.expired + result.evicted;
    } catch (sweepErr) {
      console.error('IndexedDB cache quota cleanup failed:', sweepErr);
    }
    try {
      outcome = await putEntryAttempt(key, data, Date.now(), expectedGeneration);
      if (outcome === 'written') {
        console.warn(
          `IndexedDB cache was over quota; reclaimed ${reclaimed} entries and stored "${key}".`,
        );
      }
    } catch (retryErr) {
      console.error('IndexedDB cache write failed after quota cleanup:', key, retryErr);
      return;
    }
  }
  if (outcome === 'written') {
    await maybeSweep();
  }
}

export async function getCached<T>(key: string, maxAge?: number): Promise<T | null> {
  try {
    const db = await readyDB();
    const entry = await db.get('cache', key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (maxAge && Date.now() - entry.timestamp > maxAge) {
      // Просроченная запись не удаляется здесь: withCache держит её резервом, пока не получит
      // свежие данные. Удаление при чтении теряло копию до запроса — при висящей сети fallback пуст.
      // Уборка выбрасывает только записи, которых не касались STALE_RETENTION_MS.
      return null;
    }
    return entry.data;
  } catch (err) {
    console.error('IndexedDB cache read failed:', key, err);
    return null;
  }
}

export async function setCache<T>(key: string, data: T): Promise<void> {
  await writeEntry(key, data, null);
}

export async function removeCache(key: string): Promise<void> {
  try {
    const db = await readyDB();
    const tx = db.transaction(['cache', 'generations'], 'readwrite');
    const generations = tx.objectStore('generations');
    const current = (await generations.get(key)) as GenerationRecord | undefined;
    await generations.put({ key, generation: (current?.generation ?? 0) + 1, timestamp: Date.now() });
    await tx.objectStore('cache').delete(key);
    await tx.done;
  } catch (err) {
    if (isQuotaExceeded(err)) {
      // A full quota can reject even a stamp-sized put; the drop itself must still happen.
      // The missed bump only leaves one in-flight refresh able to write, and the next write
      // or invalidate drops that entry again.
      try {
        const db = await getDB();
        await db.delete('cache', key);
        console.warn('IndexedDB cache is over quota; dropped entry without bumping its stamp:', key);
      } catch (fallbackErr) {
        console.error('IndexedDB cache delete failed:', key, fallbackErr);
      }
      return;
    }
    console.error('IndexedDB cache delete failed:', key, err);
  }
}

/**
 * Invalidate a cache entry (alias for removeCache).
 * Used by page components to invalidate IndexedDB cache after mutations.
 */
export const invalidateCache = removeCache;

/** Keys currently stored in the offline cache; dynamic-route prewarm enumerates ids from them. */
export async function listCachedKeys(): Promise<string[]> {
  try {
    const db = await readyDB();
    return (await db.getAllKeys('cache')) as string[];
  } catch (err) {
    console.error('IndexedDB cache key listing failed:', err);
    return [];
  }
}

/**
 * Invalidate every cache entry whose key starts with `prefix` (e.g. all list-item detail
 * keys when a gear weight change makes their embedded items stale). Runs through removeCache
 * so each dropped key also gets a fresh stamp — a refresh in flight in any tab cannot
 * resurrect it.
 */
export async function invalidateCacheByPrefix(prefix: string): Promise<void> {
  const keys = await listCachedKeys();
  await Promise.all(keys.filter((key) => key.startsWith(prefix)).map((key) => removeCache(key)));
}

const NETWORK_TIMEOUT_MS = 5000;

/**
 * Ограничивает ожидание сетевого промиса. Fetch в «чёрной дыре» (TCP висит) не резолвится
 * и не отклоняется — без таймаута вызывающая страница навсегда остаётся со спиннером.
 * По таймауту отклоняемся, чтобы сработал fallback на устаревший кэш. Таймер всегда очищается.
 */
function withNetworkTimeout<T>(promise: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error('Network request timed out')), NETWORK_TIMEOUT_MS);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Lie-fi: the device reports `online` while the network is dead, so every read would
// pay NETWORK_TIMEOUT_MS before failing. The fuse makes that price one-time — reads
// inside the window use the cache without touching the network at all.
const NETWORK_FAILURE_FUSE_MS = 30_000;
let lastNetworkFailureAt = 0;

// Connectivity failures arrive in browser-specific shapes ("Failed to fetch",
// "Load failed", "NetworkError..."), plus undici's "fetch failed" and this module's own
// timeout. An application error (permission denied, HTTP 4xx) says nothing about the
// link and must not trip the fuse.
const NETWORK_FAILURE_RE =
  /Failed to fetch|NetworkError|Network request timed out|fetch failed|Load failed|ERR_NETWORK/;

function noteNetworkFailure(error: unknown): void {
  if (error instanceof Error && NETWORK_FAILURE_RE.test(error.message)) {
    lastNetworkFailureAt = Date.now();
  }
}

/**
 * Wraps a fetch function with cache-first strategy.
 * Returns cached data immediately if available, then updates in background from network.
 * Network waits are bounded: no call to fetcher can hang the caller past NETWORK_TIMEOUT_MS.
 */
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<{ data: T | null; error: Error | null }>,
  options?: { maxAge?: number; skipCache?: boolean },
): Promise<{ data: T | null; error: Error | null; fromCache: boolean }> {
  const { maxAge = 5 * 60 * 1000, skipCache } = options || {};

  // Offline: cache only. A doomed fetch adds latency and returns the same cached
  // value, so the network is never attempted. No TTL check — a stale copy beats a
  // spinner, mirroring the post-failure fallback below (getCached without maxAge).
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const cached = await getCached<T>(key);
    if (cached) return { data: cached, error: null, fromCache: true };
    return { data: null, error: new Error('Offline'), fromCache: false };
  }

  // Recent connectivity failure: serve any cached copy (no TTL check) instead of
  // paying for the dead network again. The window is bounded, so the network is
  // retried soon. Without a cached value there is nothing to serve — fall through.
  if (Date.now() - lastNetworkFailureAt < NETWORK_FAILURE_FUSE_MS) {
    const cached = await getCached<T>(key);
    if (cached) return { data: cached, error: null, fromCache: true };
  }

  // Return cached data immediately
  if (!skipCache) {
    const cached = await getCached<T>(key, maxAge);
    if (cached) {
      // Update in background. The stamp is read from IndexedDB, so an invalidation performed
      // by another tab is visible to the guarded write below even though this tab never ran
      // it. A null stamp means the read failed — then nothing is cached, rather than risk
      // overwriting an invalidation that could not be seen.
      const generation = await readGeneration(key);
      withNetworkTimeout(fetcher()).then(async (fresh) => {
        // The answer may predate a mutation that invalidated or rewrote this key while the
        // request was in flight; storing it now would resurrect dropped data.
        if (fresh.data && !fresh.error && generation !== null) {
          await writeEntry(key, fresh.data, generation);
        }
        noteNetworkFailure(fresh.error);
      }).catch((err) => {
        noteNetworkFailure(err);
        console.error('Background cache refresh failed:', err);
      });
      return { data: cached, error: null, fromCache: true };
    }
  }

  // No cache — fetch fresh
  try {
    const generation = await readGeneration(key);
    const fresh = await withNetworkTimeout(fetcher());
    // Same race as the background refresh: the answer may predate a mutation that invalidated
    // this key while the request was in flight. Skipping the write never serves wrong data —
    // the caller already holds the response — it just leaves the next read to the network.
    if (fresh.data && !fresh.error && generation !== null) {
      await writeEntry(key, fresh.data, generation);
    }
    noteNetworkFailure(fresh.error);
    return { ...fresh, fromCache: false };
  } catch (err) {
    noteNetworkFailure(err);
    // Network failed or timed out — try cache as fallback (skip TTL check — stale is better than nothing)
    const cached = await getCached<T>(key);
    if (cached) {
      return { data: cached, error: null, fromCache: true };
    }
    return { data: null, error: err instanceof Error ? err : new Error('Network error'), fromCache: false };
  }
}

/**
 * Cache key helpers for service functions. Every key — collection or detail — carries the
 * user: `u:<uid>:<kind>[:<id>]`. A detail key without the user would let a second account on
 * the same browser read the first account's entry through a bookmarked URL; a user-scoped
 * key misses instead, and the read goes to the network, where RLS decides.
 */
const userScope = (userId: string) => `u:${userId}`;

export const cacheKeys = {
  profile: (userId: string) => `${userScope(userId)}:profile`,
  gear: (userId: string) => `${userScope(userId)}:gear`,
  foodItems: (userId: string) => `${userScope(userId)}:food`,
  lists: (userId: string) => `${userScope(userId)}:lists`,
  listDetail: (userId: string, listId: string) => `${userScope(userId)}:list:${listId}`,
  listItems: (userId: string, listId: string) => `${userScope(userId)}:list-items:${listId}`,
  mealPlans: (userId: string) => `${userScope(userId)}:meals`,
  mealPlanDetail: (userId: string, planId: string) => `${userScope(userId)}:meal-plan:${planId}`,
  mealPlansLight: (userId: string) => `${userScope(userId)}:meals-light`,
};

/**
 * Prefixes for `invalidateCacheByPrefix`. A gear mutation rewrites weights embedded in list
 * positions, and which lists hold the item is not known here, so their detail keys are
 * dropped by prefix rather than one id at a time. The prefix carries the user, so a mutation
 * drops only the acting account's details.
 */
export const cacheKeyPrefixes = {
  listItems: (userId: string) => `${userScope(userId)}:list-items:`,
};

/**
 * Drop every cached value of one user — called on sign-out so the next account on this
 * browser cannot read the previous one's pages from IndexedDB. The offline mutation queue
 * lives in its own database and is deliberately untouched: its entries are keyed to this
 * user and may still hold writes that have to be replayed on their next sign-in.
 */
export async function clearUserCache(userId: string): Promise<void> {
  const prefix = `${userScope(userId)}:`;
  try {
    const db = await readyDB();
    const tx = db.transaction(['cache', 'generations'], 'readwrite');
    const range = IDBKeyRange.bound(prefix, `${prefix}\uffff`);
    await tx.objectStore('cache').delete(range);
    await tx.objectStore('generations').delete(range);
    await tx.done;
  } catch (err) {
    console.error('IndexedDB cache clear failed for user:', userId, err);
  }
}
