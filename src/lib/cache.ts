import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'prohikes-cache';
const DB_VERSION = 1;

interface CacheEntry<T> {
  key: string;
  data: T;
  timestamp: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('cache')) {
        db.createObjectStore('cache', { keyPath: 'key' });
      }
    },
  });
  return dbPromise;
}

export async function getCached<T>(key: string, maxAge?: number): Promise<T | null> {
  try {
    const db = await getDB();
    const entry = await db.get('cache', key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (maxAge && Date.now() - entry.timestamp > maxAge) {
      // Просроченная запись не удаляется: withCache держит её резервом, пока не получит
      // свежие данные. Удаление здесь теряло копию до запроса — при висящей сети fallback пуст.
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export async function setCache<T>(key: string, data: T): Promise<void> {
  try {
    const db = await getDB();
    await db.put('cache', { key, data, timestamp: Date.now() });
  } catch {
    // Silently fail — cache is optional
  }
}

export async function removeCache(key: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete('cache', key);
  } catch {
    // Silently fail
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
    const db = await getDB();
    return (await db.getAllKeys('cache')) as string[];
  } catch {
    // Silently fail — no keys means dynamic documents simply are not prewarmed.
    return [];
  }
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
      // Update in background
      withNetworkTimeout(fetcher()).then((fresh) => {
        if (fresh.data && !fresh.error) {
          setCache(key, fresh.data);
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
    const fresh = await withNetworkTimeout(fetcher());
    if (fresh.data && !fresh.error) {
      await setCache(key, fresh.data);
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
 * Cache key helpers for service functions
 */
export const cacheKeys = {
  profile: (userId: string) => `profile:${userId}`,
  gear: (userId: string) => `gear:${userId}`,
  foodItems: (userId: string) => `food:${userId}`,
  lists: (userId: string) => `lists:${userId}`,
  listDetail: (listId: string) => `list:${listId}`,
  listItems: (listId: string) => `list-items:${listId}`,
  mealPlans: (userId: string) => `meals:${userId}`,
  mealPlanDetail: (planId: string) => `meal-plan:${planId}`,
  mealPlansLight: (userId: string) => `meals-light:${userId}`,
};
