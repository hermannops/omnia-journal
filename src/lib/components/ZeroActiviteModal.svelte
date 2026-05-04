<script lang="ts">
  import Modal from './Modal.svelte';
  import Button from './Button.svelte';
  import { confirmerZeroActivite } from '$lib/db/zero-activite';
  import { addToast } from '$lib/stores/toast';
  import { networkStore } from '$lib/stores/network.svelte';

  interface Props {
    open?: boolean;
    agentId: string;
    onconfirmed?: () => void;
    onlater?: () => void;
  }

  let { open = $bindable(false), agentId, onconfirmed, onlater }: Props = $props();

  let commentaire = $state('');
  let loading = $state(false);

  async function confirmer() {
    loading = true;
    try {
      await confirmerZeroActivite(agentId, commentaire.trim() || undefined);
      addToast({ message: 'Journée confirmée — aucune activité.', type: 'success' });
      open = false;
      onconfirmed?.();
    } catch {
      addToast({ message: 'Erreur lors de la confirmation.', type: 'error' });
    } finally {
      loading = false;
    }
  }

  function plusTard() {
    sessionStorage.setItem('zero_activite_snooze', String(Date.now()));
    open = false;
    onlater?.();
  }
</script>

<Modal bind:open title="Confirmer la journée">
  {#snippet children()}
    <div class="space-y-4">
      <p class="text-sm text-gray-600">
        Aucune transaction enregistrée aujourd'hui. Confirmes-tu qu'il n'y a eu aucune activité ?
      </p>

      <div>
        <label for="commentaire-zero" class="block text-xs text-gray-500 mb-1">
          Raison (optionnel) — Ex : panne réseau, jour férié…
        </label>
        <input
          id="commentaire-zero"
          type="text"
          bind:value={commentaire}
          placeholder="Laisser vide si aucune raison particulière"
          class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {#if !networkStore.online}
        <p class="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
          Connexion requise pour confirmer.
        </p>
      {/if}
    </div>
  {/snippet}

  {#snippet footer()}
    <Button variant="secondary" size="sm" onclick={plusTard}>
      Plus tard / Je vais saisir
    </Button>
    <Button
      variant="primary"
      size="sm"
      onclick={confirmer}
      loading={loading}
      disabled={!networkStore.online}
    >
      Oui, aucune activité
    </Button>
  {/snippet}
</Modal>
