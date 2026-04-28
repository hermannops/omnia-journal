import { supabase } from '$lib/supabase';

export type LigneJournal = {
  id: string;
  horodatage: string;
  agent_id: string;
  agent_nom: string;
  operateur_code: string;
  operateur_nom: string;
  type_code: string;
  type_libelle: string;
  numero_client: string | null;
  nom_client: string | null;
  montant: number;
  solde_apres: number;
  observation: string | null;
  statut: string;
};

export type TotalDuJour = {
  agent_id: string;
  operateur_code: string;
  operateur_nom: string;
  type_code: string;
  type_libelle: string;
  nb_operations: number;
  montant_total: number;
};

export type SoldeActuel = {
  operateur_id: string;
  operateur_code: string;
  operateur_nom: string;
  solde_theorique: number;
  derniere_operation: string;
};

export async function fetchJournalDuJour(agentId: string): Promise<LigneJournal[]> {
  const { data, error } = await supabase
    .from('v_journal_du_jour')
    .select('*')
    .eq('agent_id', agentId);
  if (error) throw error;
  return (data ?? []) as LigneJournal[];
}

export async function fetchTotauxDuJour(agentId: string): Promise<TotalDuJour[]> {
  const { data, error } = await supabase
    .from('v_totaux_du_jour')
    .select('*')
    .eq('agent_id', agentId);
  if (error) throw error;
  return (data ?? []) as TotalDuJour[];
}

export async function fetchSoldesActuels(): Promise<SoldeActuel[]> {
  const { data, error } = await supabase
    .from('v_solde_actuel_par_operateur')
    .select('*');
  if (error) throw error;
  return (data ?? []) as SoldeActuel[];
}
