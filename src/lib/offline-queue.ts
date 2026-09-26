import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'prohikes-queue';
const DB_VERSION = 1;

/**
 * Cache invalidation context for the replay executor. Deliberately outside `payload`:
 * the replay inserts payload as-is, and read-only columns would make PostgREST reject it.
 * `listId` lets a replayed list-item write drop that one list's detail keys.
 */
export interface MutationMeta {
  planId?: string;
  listId?: string;
}

export interface QueuedMutation {
  id?: number;
  table: string;
  action: 'insert' | 'update' | 'delete';
  payload: Record<string, unknown>;
  userId: string;
  timestamp: number;
  meta?: MutationMeta;
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

/** Add a failed mutation to the offline queue. Returns false when the entry could not be persisted. */
export async function enqueue(
  table: string,
  action: 'insert' | 'update' | 'delete',
  payload: Record<string, unknown>,
  userId: string,
  meta?: MutationMeta,
): Promise<boolean> {
  try {
    const db = await getDB();
    await db.add('mutations', { table, action, payload, userId, timestamp: Date.now(), meta });
    return true;
  } catch (err) {
    console.error('Offline queue error (enqueue):', err);
    return false;
  }
}

/**
 * Replay the queued mutations of one user, oldest first. Entries of other users are left
 * untouched: under a different session their replay can only fail RLS, which both keeps
 * the entry stuck and attempts the write from the wrong account.
 * Returns count of remaining failures, or -1 when the queue could not be read.
 */
export async function syncQueue(
  userId: string,
  executor: (m: QueuedMutation) => Promise<boolean>,
): Promise<number> {
  try {
    const db = await getDB();
    // The index sorts by (userId, primary key), so reading through it keeps FIFO per user.
    // Entries without a userId (none are written by the current enqueue) are not indexed
    // and stay untouched instead of being replayed under an arbitrary account.
    const mine = await db.getAllFromIndex('mutations', 'userId', userId);
    let remaining = 0;

    for (const m of mine) {
      if (!m.id) continue;
      const success = await executor(m);
      if (success) {
        await db.delete('mutations', m.id);
      } else {
        remaining++;
      }
    }

    return remaining;
  } catch (err) {
    console.error('Offline queue error (syncQueue):', err);
    return -1;
  }
}
