import { supabase } from '$lib/supabase';

// ── Types ────────────────────────────────────────────────────────────

export type StatsAdmin = {
  nb_transactions: number;
  volume_total: number;
  nb_annulees: number;
};

export type VolumeOperateur = {
  operateur_code: string;
  operateur_nom: string;
  nb_transactions: number;
  volume_total: number;
};

export type TransactionAdmin = {
  id: string;
  horodatage: string;
  montant: number;
  solde_apres: number;
  statut: string;
  motif_annulation: string | null;
  annulee_at: string | null;
  numero_client: string | null;
  nom_client: string | null;
  agent: { nom: string; numero_agent: string } | null;
  operateur: { code: string; nom: string } | null;
  type_operation: { code: string; libelle: string } | null;
};

export type AgentAdmin = {
  id: string;
  numero_agent: string;
  nom: string;
  role: string;
  actif: boolean;
  pin_verrouille: boolean;
  pin_essais_rates: number;
  created_at: string;
};

export type FiltresTransactions = {
  dateDebut: string;
  dateFin: string;
  agentId: string;
  operateurId: string;
  typeId: string;
  statut: 'tous' | 'validee' | 'annulee';
  page: number;
};

export const PAGE_SIZE = 50;

// ── Dashboard ────────────────────────────────────────────────────────

export async function fetchStatsAdmin(): Promise<{
  jour: StatsAdmin;
  semaine: StatsAdmin;
  mois: StatsAdmin;
}> {
  const [rJour, rSem, rMois] = await Promise.all([
    supabase.from('v_stats_admin_jour').select('*').single(),
    supabase.from('v_stats_admin_semaine').select('*').single(),
    supabase.from('v_stats_admin_mois').select('*').single()
  ]);
  if (rJour.error) throw rJour.error;
  if (rSem.error) throw rSem.error;
  if (rMois.error) throw rMois.error;
  return {
    jour: rJour.data as StatsAdmin,
    semaine: rSem.data as StatsAdmin,
    mois: rMois.data as StatsAdmin
  };
}

export async function fetchVolumeParOperateur7j(): Promise<VolumeOperateur[]> {
  const { data, error } = await supabase.from('v_volume_par_operateur_7j').select('*');
  if (error) throw error;
  return (data ?? []) as VolumeOperateur[];
}

export async function fetchDernieresTransactions(limit = 5): Promise<TransactionAdmin[]> {
  const { data, error } = await supabase
    .from('transaction')
    .select(`
      id, horodatage, montant, solde_apres, statut, motif_annulation, annulee_at,
      numero_client, nom_client,
      agent:agent_id(nom, numero_agent),
      operateur:operateur_id(code, nom),
      type_operation:type_operation_id(code, libelle)
    `)
    .order('horodatage', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as TransactionAdmin[];
}

// ── Transactions ─────────────────────────────────────────────────────

export async function fetchTransactionsAdmin(
  f: FiltresTransactions
): Promise<{ data: TransactionAdmin[]; count: number }> {
  let q = supabase
    .from('transaction')
    .select(
      `id, horodatage, montant, solde_apres, statut, motif_annulation, annulee_at,
       numero_client, nom_client,
       agent:agent_id(nom, numero_agent),
       operateur:operateur_id(code, nom),
       type_operation:type_operation_id(code, libelle)`,
      { count: 'exact' }
    )
    .gte('horodatage', `${f.dateDebut}T00:00:00`)
    .lte('horodatage', `${f.dateFin}T23:59:59`)
    .order('horodatage', { ascending: false })
    .range(f.page * PAGE_SIZE, (f.page + 1) * PAGE_SIZE - 1);

  if (f.agentId) q = q.eq('agent_id', f.agentId);
  if (f.operateurId) q = q.eq('operateur_id', f.operateurId);
  if (f.typeId) q = q.eq('type_operation_id', f.typeId);
  if (f.statut !== 'tous') q = q.eq('statut', f.statut);

  const { data, count, error } = await q;
  if (error) throw error;
  return { data: (data ?? []) as unknown as TransactionAdmin[], count: count ?? 0 };
}

// ── Export ────────────────────────────────────────────────────────────

export type FiltresExport = {
  dateDebut: string;
  dateFin: string;
  agentId: string;
  operateurId: string;
  inclureAnnulees: boolean;
};

export const EXPORT_LIMIT = 10_000;

export async function fetchExportPreview(
  f: FiltresExport
): Promise<{ count: number; montant_total: number }> {
  let qCount = supabase
    .from('transaction')
    .select('id', { count: 'exact', head: true })
    .gte('horodatage', `${f.dateDebut}T00:00:00`)
    .lte('horodatage', `${f.dateFin}T23:59:59`);

  let qSum = supabase
    .from('transaction')
    .select('montant_total:montant.sum()')
    .gte('horodatage', `${f.dateDebut}T00:00:00`)
    .lte('horodatage', `${f.dateFin}T23:59:59`);

  if (f.agentId) { qCount = qCount.eq('agent_id', f.agentId); qSum = qSum.eq('agent_id', f.agentId); }
  if (f.operateurId) { qCount = qCount.eq('operateur_id', f.operateurId); qSum = qSum.eq('operateur_id', f.operateurId); }
  if (!f.inclureAnnulees) { qCount = qCount.eq('statut', 'validee'); qSum = qSum.eq('statut', 'validee'); }

  const [{ count, error: e1 }, { data, error: e2 }] = await Promise.all([qCount, qSum]);
  if (e1) throw e1;
  if (e2) throw e2;

  return {
    count: count ?? 0,
    montant_total: (data?.[0] as unknown as { montant_total: number } | null)?.montant_total ?? 0
  };
}

export async function fetchTransactionsForExport(
  f: FiltresExport
): Promise<{ data: TransactionAdmin[]; truncated: boolean }> {
  let q = supabase
    .from('transaction')
    .select(
      `id, horodatage, montant, solde_apres, statut, motif_annulation, annulee_at,
       numero_client, nom_client,
       agent:agent_id(nom, numero_agent),
       operateur:operateur_id(code, nom),
       type_operation:type_operation_id(code, libelle)`
    )
    .gte('horodatage', `${f.dateDebut}T00:00:00`)
    .lte('horodatage', `${f.dateFin}T23:59:59`)
    .order('horodatage', { ascending: true })
    .limit(EXPORT_LIMIT);

  if (f.agentId) q = q.eq('agent_id', f.agentId);
  if (f.operateurId) q = q.eq('operateur_id', f.operateurId);
  if (!f.inclureAnnulees) q = q.eq('statut', 'validee');

  const { data, error } = await q;
  if (error) throw error;

  const rows = (data ?? []) as unknown as TransactionAdmin[];
  return { data: rows, truncated: rows.length === EXPORT_LIMIT };
}

export async function annulerTransaction(
  id: string,
  motif: string,
  adminId: string
): Promise<void> {
  const { error } = await supabase.rpc('annuler_transaction', {
    p_transaction_id: id,
    p_motif: motif,
    p_admin_id: adminId
  });
  if (error) throw error;
}

// ── Agents ───────────────────────────────────────────────────────────

export async function fetchAgents(): Promise<AgentAdmin[]> {
  const { data, error } = await supabase
    .from('agent')
    .select('id, numero_agent, nom, role, actif, pin_verrouille, pin_essais_rates, created_at')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as AgentAdmin[];
}

export async function creerAgent(
  numero: string,
  nom: string,
  role: string,
  pin: string
): Promise<void> {
  const { error } = await supabase.rpc('creer_agent', {
    p_numero: numero,
    p_nom: nom,
    p_role: role,
    p_pin: pin
  });
  if (error) throw error;
}

export async function deverrouillerAgent(id: string): Promise<void> {
  const { error } = await supabase
    .from('agent')
    .update({ pin_verrouille: false, pin_essais_rates: 0 })
    .eq('id', id);
  if (error) throw error;
}

export async function setAgentActif(id: string, actif: boolean): Promise<void> {
  const { error } = await supabase.from('agent').update({ actif }).eq('id', id);
  if (error) throw error;
}

export async function reinitialiserPin(agentId: string, nouveauPin: string): Promise<void> {
  const { error } = await supabase.rpc('reinitialiser_pin', {
    p_agent_id: agentId,
    p_nouveau_pin: nouveauPin
  });
  if (error) throw error;
}
