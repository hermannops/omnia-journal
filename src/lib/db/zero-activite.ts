import { supabase } from '$lib/supabase';

export type EtatJourneeAgent = {
  agent_id: string;
  agent_nom: string;
  date_concernee: string;
  nb_transactions: number;
  montant_total: number;
  zero_activite_confirmee: boolean;
  zero_confirmee_at: string | null;
  etat: 'activite' | 'zero_confirme' | 'inconnu';
};

export async function verifierConfirmationDuJour(agentId: string): Promise<boolean> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('confirmation_zero_activite')
    .select('id')
    .eq('agent_id', agentId)
    .eq('date_concernee', today)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

export async function compterTransactionsDuJour(agentId: string): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  const { count, error } = await supabase
    .from('transaction')
    .select('id', { count: 'exact', head: true })
    .eq('agent_id', agentId)
    .eq('statut', 'validee')
    .gte('horodatage', `${today}T00:00:00`)
    .lte('horodatage', `${today}T23:59:59`);
  if (error) throw error;
  return count ?? 0;
}

export async function confirmerZeroActivite(agentId: string, commentaire?: string): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase
    .from('confirmation_zero_activite')
    .insert({ agent_id: agentId, date_concernee: today, commentaire: commentaire || null });
  if (error) throw error;
}

export async function fetchEtatJournee7j(): Promise<EtatJourneeAgent[]> {
  const dateDebut = new Date();
  dateDebut.setDate(dateDebut.getDate() - 6);
  const { data, error } = await supabase
    .from('v_etat_journee_agent')
    .select('*')
    .gte('date_concernee', dateDebut.toISOString().slice(0, 10))
    .order('date_concernee', { ascending: false })
    .order('agent_nom', { ascending: true });
  if (error) throw error;
  return (data ?? []) as EtatJourneeAgent[];
}
