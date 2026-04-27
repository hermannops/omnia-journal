import { supabase } from '$lib/supabase';
import { agentStore } from '$lib/stores/agent';
import { get } from 'svelte/store';

export type TransactionInput = {
  operateur_id: string;
  type_operation_id: string;
  numero_client?: string;
  nom_client?: string;
  montant: number;
  solde_apres: number;
  observation?: string;
};

export type Transaction = {
  id: string;
  session_id: string;
  agent_id: string;
  operateur_id: string;
  type_operation_id: string;
  numero_client: string | null;
  nom_client: string | null;
  montant: number;
  solde_apres: number;
  observation: string | null;
  horodatage: string;
  statut: string;
};

export async function createTransaction(input: TransactionInput): Promise<Transaction> {
  const agent = get(agentStore);
  if (!agent) throw new Error('Agent non connecté');

  // 1. Récupère ou crée la session du jour — horodatage géré côté serveur
  const { data: sessionId, error: sessionError } = await supabase.rpc(
    'obtenir_ou_creer_session',
    { p_agent_id: agent.id }
  );
  if (sessionError) throw new Error('Session impossible : ' + sessionError.message);

  // 2. Insère la transaction
  const { data, error } = await supabase
    .from('transaction')
    .insert({
      session_id: sessionId as string,
      agent_id: agent.id,
      operateur_id: input.operateur_id,
      type_operation_id: input.type_operation_id,
      numero_client: input.numero_client ?? null,
      nom_client: input.nom_client ?? null,
      montant: input.montant,
      solde_apres: input.solde_apres,
      observation: input.observation ?? null
    })
    .select()
    .single();

  if (error) throw new Error("Erreur à l'insertion : " + error.message);

  return data as Transaction;
}
