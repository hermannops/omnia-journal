import { supabase } from '$lib/supabase';
import { getCached, setCached } from '$lib/db/idb';

export type Operateur = {
  id: string;
  code: string;
  nom: string;
  actif: boolean;
};

export type TypeOperation = {
  id: string;
  code: string;
  libelle: string;
  sens_solde: number;
  ordre: number;
  actif: boolean;
};

async function fetchOperateurs(): Promise<Operateur[]> {
  const { data, error } = await supabase
    .from('operateur')
    .select('id, code, nom, actif')
    .eq('actif', true)
    .order('code');
  if (error) throw error;
  return data as Operateur[];
}

async function fetchTypesOperation(): Promise<TypeOperation[]> {
  const { data, error } = await supabase
    .from('type_operation')
    .select('id, code, libelle, sens_solde, ordre, actif')
    .eq('actif', true)
    .order('ordre');
  if (error) throw error;
  return data as TypeOperation[];
}

export async function loadReferentiels(): Promise<{
  operateurs: Operateur[];
  typesOperation: TypeOperation[];
}> {
  try {
    const [operateurs, typesOperation] = await Promise.all([
      fetchOperateurs(),
      fetchTypesOperation()
    ]);

    // Mise en cache après succès réseau
    await Promise.all([
      setCached('operateurs', operateurs),
      setCached('types_operation', typesOperation)
    ]);

    return { operateurs, typesOperation };
  } catch {
    // Réseau indisponible → servir depuis le cache IndexedDB
    const [operateurs, typesOperation] = await Promise.all([
      getCached<Operateur[]>('operateurs'),
      getCached<TypeOperation[]>('types_operation')
    ]);

    return {
      operateurs: operateurs ?? [],
      typesOperation: typesOperation ?? []
    };
  }
}
