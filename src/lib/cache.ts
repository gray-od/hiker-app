import { openDB, type IDBPDatabase } from 'idb';

let dbPromise: Promise<IDBPDatabase<{ queries: { key: string; value: unknown } }>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB('hiker-cache', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('queries')) {
          db.createObjectStore('queries');
        }
      },
    });
  }
  return dbPromise;
}

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const db = await getDb();
    return (await db.get('queries', key)) as T | null;
  } catch {
    return null;
  }
}

export async function setCache<T>(key: string, data: T): Promise<void> {
  try {
    const db = await getDb();
    await db.put('queries', data, key);
  } catch {
    // ignore cache write errors
  }
}

export async function clearCache(): Promise<void> {
  try {
    const db = await getDb();
    await db.clear('queries');
  } catch {
    // ignore
  }
}
