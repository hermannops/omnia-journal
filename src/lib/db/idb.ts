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
  journal_cache: {
    key: string;
    value: { key: string; data: unknown; cached_at: string };
  };
}

let dbPromise: Promise<IDBPDatabase<OmniaSchema>> | null = null;

export function openDb(): Promise<IDBPDatabase<OmniaSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<OmniaSchema>('omnia', 2, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore('referentiels', { keyPath: 'key' });
          db.createObjectStore('pending_transactions', {
            keyPath: 'id',
            autoIncrement: true
          });
        }
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains('referentiels')) {
            db.createObjectStore('referentiels', { keyPath: 'key' });
          }
          if (!db.objectStoreNames.contains('pending_transactions')) {
            db.createObjectStore('pending_transactions', {
              keyPath: 'id',
              autoIncrement: true
            });
          }
          db.createObjectStore('journal_cache', { keyPath: 'key' });
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

export type JournalCacheEntry<T> = { data: T; cached_at: string };

export async function getJournalCache<T>(key: string): Promise<JournalCacheEntry<T> | null> {
  const db = await openDb();
  const entry = await db.get('journal_cache', key);
  return entry ? { data: entry.data as T, cached_at: entry.cached_at } : null;
}

export async function setJournalCache<T>(key: string, value: T): Promise<void> {
  const db = await openDb();
  await db.put('journal_cache', { key, data: value, cached_at: new Date().toISOString() });
}
