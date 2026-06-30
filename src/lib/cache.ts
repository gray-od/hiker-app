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

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const db = await getDB();
    const entry = await db.get('cache', key) as CacheEntry<T> | undefined;
    if (entry) return entry.data;
    return null;
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

/**
 * Wraps a fetch function with cache-first strategy.
 * Returns cached data immediately if available, then updates in background from network.
 */
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<{ data: T | null; error: Error | null }>,
  options?: { maxAge?: number; skipCache?: boolean },
): Promise<{ data: T | null; error: Error | null; fromCache: boolean }> {
  const { maxAge, skipCache } = options || {};

  // Return cached data immediately
  if (!skipCache) {
    const cached = await getCached<T>(key);
    if (cached) {
      // Update in background
      fetcher().then((fresh) => {
        if (fresh.data && !fresh.error) {
          setCache(key, fresh.data);
        }
      }).catch(() => {});
      return { data: cached, error: null, fromCache: true };
    }
  }

  // No cache — fetch fresh
  try {
    const fresh = await fetcher();
    if (fresh.data && !fresh.error) {
      await setCache(key, fresh.data);
    }
    return { ...fresh, fromCache: false };
  } catch (err) {
    // Network failed — try cache as fallback
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
