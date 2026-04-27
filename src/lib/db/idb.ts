import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

interface OmniaSchema extends DBSchema {
  referentiels: {
    key: string;
    value: { key: string; data: unknown };
  };
  pending_transactions: {
    key: number;
    value: { id?: number; [key: string]: unknown };
  };
}

let dbPromise: Promise<IDBPDatabase<OmniaSchema>> | null = null;

export function openDb(): Promise<IDBPDatabase<OmniaSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<OmniaSchema>('omnia', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('referentiels')) {
          db.createObjectStore('referentiels', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('pending_transactions')) {
          db.createObjectStore('pending_transactions', {
            keyPath: 'id',
            autoIncrement: true
          });
        }
      }
    });
  }
  return dbPromise;
}

export async function getCached<T>(key: string): Promise<T | null> {
  const db = await openDb();
  const entry = await db.get('referentiels', key);
  return entry ? (entry.data as T) : null;
}

export async function setCached<T>(key: string, value: T): Promise<void> {
  const db = await openDb();
  await db.put('referentiels', { key, data: value });
}
