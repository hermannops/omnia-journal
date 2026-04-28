import { supabase } from '$lib/supabase';

export type PointVeilleAFaire = {
  operateur_id: string;
  operateur_code: string;
  operateur_nom: string;
  date_concernee: string;
  solde_theorique: number | null;
};

export type PointVeilleInput = {
  operateur_id: string;
  date_concernee: string;
  solde_theorique: number | null;
  solde_reel_valide: number;
  commentaire?: string;
};

export async function fetchPointsVeilleAFaire(): Promise<PointVeilleAFaire[]> {
  const { data, error } = await supabase
    .from('v_points_veille_a_faire')
    .select('*');
  if (error) throw error;
  return (data ?? []) as PointVeilleAFaire[];
}

export async function createPointsVeille(
  agentId: string,
  items: PointVeilleInput[]
): Promise<void> {
  if (items.length === 0) return;
  const rows = items.map((item) => ({
    agent_id: agentId,
    operateur_id: item.operateur_id,
    date_concernee: item.date_concernee,
    solde_theorique: item.solde_theorique,
    solde_reel_valide: item.solde_reel_valide,
    commentaire: item.commentaire ?? null,
    validated_by: agentId
  }));
  const { error } = await supabase.from('point_veille').insert(rows);
  if (error) throw error;
}
