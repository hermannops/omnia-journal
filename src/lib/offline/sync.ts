import { supabase } from '$lib/supabase';
import { agentStore } from '$lib/stores/agent';
import { networkStore } from '$lib/stores/network.svelte';
import { getAll, remove, update } from '$lib/offline/queue';
import { get } from 'svelte/store';

const MAX_ATTEMPTS = 5;

export async function flushQueue(): Promise<void> {
  if (networkStore.syncing) return;

  const agent = get(agentStore);
  if (!agent) return;

  const pending = await getAll();
  if (pending.length === 0) return;

  networkStore.syncing = true;

  try {
    for (const item of pending) {
      // Abandon définitif après MAX_ATTEMPTS échecs
      if ((item.attempts ?? 0) >= MAX_ATTEMPTS) continue;

      try {
        const { data: sessionId, error: sessionError } = await supabase.rpc(
          'obtenir_ou_creer_session',
          { p_agent_id: agent.id }
        );
        if (sessionError) throw new Error(sessionError.message);

        const { error } = await supabase.from('transaction').insert({
          session_id: sessionId as string,
          agent_id: agent.id,
          operateur_id: item.operateur_id,
          type_operation_id: item.type_operation_id,
          numero_client: item.numero_client ?? null,
          nom_client: item.nom_client ?? null,
          montant: item.montant,
          solde_apres: item.solde_apres,
          observation: item.observation ?? null,
          client_uuid: item.client_uuid
        });

        if (error) {
          // 23505 = contrainte unique violée : transaction déjà en BDD → on dépile quand même
          if (error.code === '23505') {
            await remove(item.id!);
          } else {
            throw new Error(error.message);
          }
        } else {
          await remove(item.id!);
        }
      } catch (err) {
        if (!networkStore.online) break; // inutile de continuer hors ligne
        await update(item.id!, {
          attempts: (item.attempts ?? 0) + 1,
          last_error: err instanceof Error ? err.message : String(err)
        });
      }
    }
  } finally {
    networkStore.syncing = false;
    // pendingCount est rafraîchi automatiquement par remove()
  }
}
