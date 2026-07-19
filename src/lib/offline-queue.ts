import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'prohikes-queue';
const DB_VERSION = 1;

interface QueuedMutation {
  id?: number;
  table: string;
  action: 'insert' | 'update' | 'delete';
  payload: Record<string, unknown>;
  userId: string;
  timestamp: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('mutations')) {
        const store = db.createObjectStore('mutations', { keyPath: 'id', autoIncrement: true });
        store.createIndex('userId', 'userId');
      }
    },
  });
  return dbPromise;
}

/** Add a failed mutation to the offline queue */
export async function enqueue(
  table: string,
  action: 'insert' | 'update' | 'delete',
  payload: Record<string, unknown>,
  userId: string,
): Promise<void> {
  try {
    const db = await getDB();
    await db.add('mutations', { table, action, payload, userId, timestamp: Date.now() });
  } catch {
    // Silently fail — queue is best-effort
  }
}

/** Try to sync all queued mutations. Returns count of remaining failures. */
export async function syncQueue(
  executor: (m: QueuedMutation) => Promise<boolean>,
): Promise<number> {
  try {
    const db = await getDB();
    const all = await db.getAll('mutations');
    let remaining = 0;

    for (const m of all) {
      if (!m.id) continue;
      const success = await executor(m);
      if (success) {
        await db.delete('mutations', m.id);
      } else {
        remaining++;
      }
    }

    return remaining;
  } catch {
    return -1;
  }
}

/** Get count of pending mutations for a user */
export async function pendingCount(userId: string): Promise<number> {
  try {
    const db = await getDB();
    return await db.countFromIndex('mutations', 'userId', userId);
  } catch {
    return 0;
  }
}
