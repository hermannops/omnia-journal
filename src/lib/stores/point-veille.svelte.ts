import { fetchPointsVeilleAFaire, type PointVeilleAFaire } from '$lib/db/point-veille';
import { getAll as getPendingPointsVeille } from '$lib/offline/queue-point-veille';

export type { PointVeilleAFaire };

export const pointVeilleStore = $state({
  aFaire: [] as PointVeilleAFaire[],
  pendingOperateurIds: [] as string[],
  loaded: false
});

export function hasPointsAFaire(): boolean {
  return (
    pointVeilleStore.aFaire.filter(
      (p) => !pointVeilleStore.pendingOperateurIds.includes(p.operateur_id)
    ).length > 0
  );
}

export async function loadPointsAFaire(): Promise<void> {
  if (pointVeilleStore.loaded) return;

  try {
    const [aFaire, pendingItems] = await Promise.all([
      fetchPointsVeilleAFaire(),
      getPendingPointsVeille()
    ]);
    pointVeilleStore.aFaire = aFaire;
    pointVeilleStore.pendingOperateurIds = pendingItems.map((p) => p.operateur_id);
  } catch {
    // Offline ou erreur → pas de blocage
    pointVeilleStore.aFaire = [];
    pointVeilleStore.pendingOperateurIds = [];
  }

  pointVeilleStore.loaded = true;
}

export function markPointsVeilleValidated(): void {
  pointVeilleStore.aFaire = [];
  pointVeilleStore.pendingOperateurIds = [];
  pointVeilleStore.loaded = true;
}
