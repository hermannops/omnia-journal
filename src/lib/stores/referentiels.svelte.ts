import { loadReferentiels, type Operateur, type TypeOperation } from '$lib/db/referentiels';

export type { Operateur, TypeOperation };

export const referentielsStore = $state({
  operateurs: [] as Operateur[],
  typesOperation: [] as TypeOperation[],
  loaded: false
});

export async function initReferentiels(): Promise<void> {
  if (referentielsStore.loaded) return;

  const { operateurs, typesOperation } = await loadReferentiels();
  referentielsStore.operateurs = operateurs;
  referentielsStore.typesOperation = typesOperation;
  referentielsStore.loaded = true;
}
