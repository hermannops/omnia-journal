import { supabase } from '$lib/supabase';
import { agentStore } from '$lib/stores/agent';
import { networkStore } from '$lib/stores/network.svelte';
import { enqueue } from '$lib/offline/queue';
import { get } from 'svelte/store';
import type { TransactionInput, Transaction } from '$lib/types';

export type { TransactionInput, Transaction };

export type CreateResult =
  | { isPending: false; transaction: Transaction }
  | { isPending: true };

export async function createTransaction(input: TransactionInput): Promise<CreateResult> {
  const agent = get(agentStore);
  if (!agent) throw new Error('Agent non connecté');

  const client_uuid = crypto.randomUUID();

  if (networkStore.online) {
    try {
      const { data: sessionId, error: sessionError } = await supabase.rpc(
        'obtenir_ou_creer_session',
        { p_agent_id: agent.id }
      );
      if (sessionError) throw sessionError;

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
          observation: input.observation ?? null,
          client_uuid
        })
        .select()
        .single();

      if (error) throw error;
      return { isPending: false, transaction: data as Transaction };
    } catch {
      // Échec réseau → bascule en file d'attente
      await enqueue(input, client_uuid);
      return { isPending: true };
    }
  }

  // Offline direct → file d'attente
  await enqueue(input, client_uuid);
  return { isPending: true };
}
