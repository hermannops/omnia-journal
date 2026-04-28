import { openDb } from '$lib/db/idb';
import type { PointVeilleInput } from '$lib/db/point-veille';

export type PendingPointVeille = PointVeilleInput & {
  id?: number;
  agent_id: string;
  client_uuid: string;
  created_at_local: string;
};

export async function enqueuePointVeille(
  agentId: string,
  items: PointVeilleInput[]
): Promise<void> {
  const db = await openDb();
  const now = new Date().toISOString();
  for (const item of items) {
    await db.add('pending_point_veille', {
      ...item,
      agent_id: agentId,
      client_uuid: crypto.randomUUID(),
      created_at_local: now
    } as never);
  }
}

export async function getAll(): Promise<PendingPointVeille[]> {
  const db = await openDb();
  return (await db.getAll('pending_point_veille')) as unknown as PendingPointVeille[];
}

export async function removeAll(): Promise<void> {
  const db = await openDb();
  await db.clear('pending_point_veille');
}
