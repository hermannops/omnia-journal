import { openDb } from '$lib/db/idb';
import { networkStore } from '$lib/stores/network.svelte';
import type { TransactionInput } from '$lib/types';

export type PendingTransaction = TransactionInput & {
  id?: number;             // clé IDB auto-increment, présente après récupération
  client_uuid: string;     // UUID v4 généré client, pour l'idempotence
  created_at_local: string; // timestamp local INFORMATIF — le vrai horodatage est côté serveur
  attempts: number;
  last_error?: string;
};

async function refreshCount(): Promise<void> {
  const db = await openDb();
  networkStore.pendingCount = (await db.getAll('pending_transactions')).length;
}

export async function enqueue(
  input: TransactionInput,
  client_uuid: string
): Promise<PendingTransaction> {
  const db = await openDb();
  const pending = {
    ...input,
    client_uuid,
    created_at_local: new Date().toISOString(),
    attempts: 0
  };
  await db.add('pending_transactions', pending as never);
  await refreshCount();
  return pending as PendingTransaction;
}

export async function getAll(): Promise<PendingTransaction[]> {
  const db = await openDb();
  return (await db.getAll('pending_transactions')) as unknown as PendingTransaction[];
}

export async function remove(id: number): Promise<void> {
  const db = await openDb();
  await db.delete('pending_transactions', id);
  await refreshCount();
}

export async function update(
  id: number,
  patch: Partial<Pick<PendingTransaction, 'attempts' | 'last_error'>>
): Promise<void> {
  const db = await openDb();
  const item = await db.get('pending_transactions', id);
  if (item) {
    await db.put('pending_transactions', { ...item, ...patch } as never);
  }
}
