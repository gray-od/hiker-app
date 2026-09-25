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

export async function clearCache(): Promise<void> {
  try {
    const db = await getDB();
    await db.clear('cache');
  } catch {
    // Silently fail
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

  // Return cached data immediately
  if (!skipCache) {
    const cached = await getCached<T>(key, maxAge);
    if (cached) {
      // Update in background
      withNetworkTimeout(fetcher()).then((fresh) => {
        if (fresh.data && !fresh.error) {
          setCache(key, fresh.data);
        }
      }).catch((err) => { console.error('Background cache refresh failed:', err); });
      return { data: cached, error: null, fromCache: true };
    }
  }

  // No cache — fetch fresh
  try {
    const fresh = await withNetworkTimeout(fetcher());
    if (fresh.data && !fresh.error) {
      await setCache(key, fresh.data);
    }
    return { ...fresh, fromCache: false };
  } catch (err) {
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
