<script lang="ts">
  import { onMount } from 'svelte';
  import {
    fetchAgents, creerAgent, deverrouillerAgent,
    setAgentActif, reinitialiserPin
  } from '$lib/db/admin';
  import type { AgentAdmin } from '$lib/db/admin';
  import { addToast } from '$lib/stores/toast';
  import Button from '$lib/components/Button.svelte';
  import Modal from '$lib/components/Modal.svelte';

  let agents = $state<AgentAdmin[]>([]);
  let loading = $state(true);

  // ── Modale nouvel agent ────────────────────────────────────────────
  let modalNouvel = $state(false);
  let nouvelAgent = $state({ numero: '', nom: '', role: 'agent', pin: '' });
  let creerLoading = $state(false);

  // ── Modale reset PIN ───────────────────────────────────────────────
  let modalPin = $state(false);
  let resetPin = $state({ agentId: '', nouveauPin: '' });
  let pinLoading = $state(false);

  // ── Modale confirmation ────────────────────────────────────────────
  let modalConfirm = $state(false);
  let confirmAction = $state<() => Promise<void>>(() => Promise.resolve());
  let confirmMessage = $state('');
  let confirmLoading = $state(false);

  function demanderConfirmation(message: string, action: () => Promise<void>) {
    confirmMessage = message;
    confirmAction = action;
    modalConfirm = true;
  }

  async function executerConfirmation() {
    confirmLoading = true;
    try {
      await confirmAction();
      modalConfirm = false;
    } finally {
      confirmLoading = false;
    }
  }

  // ── Actions ────────────────────────────────────────────────────────
  async function charger() {
    loading = true;
    try { agents = await fetchAgents(); }
    catch (e) { addToast({ message: e instanceof Error ? e.message : 'Erreur', type: 'error' }); }
    finally { loading = false; }
  }

  async function ajouterAgent() {
    if (!nouvelAgent.numero || !nouvelAgent.nom || !nouvelAgent.pin) return;
    creerLoading = true;
    try {
      await creerAgent(nouvelAgent.numero, nouvelAgent.nom, nouvelAgent.role, nouvelAgent.pin);
      addToast({ message: `Agent ${nouvelAgent.nom} créé`, type: 'success' });
      modalNouvel = false;
      nouvelAgent = { numero: '', nom: '', role: 'agent', pin: '' };
      await charger();
    } catch (e) {
      addToast({ message: e instanceof Error ? e.message : 'Erreur', type: 'error' });
    } finally {
      creerLoading = false;
    }
  }

  function ouvrirResetPin(id: string) {
    resetPin = { agentId: id, nouveauPin: '' };
    modalPin = true;
  }

  async function confirmerResetPin() {
    if (!resetPin.nouveauPin || resetPin.nouveauPin.length < 4) return;
    pinLoading = true;
    try {
      await reinitialiserPin(resetPin.agentId, resetPin.nouveauPin);
      addToast({ message: 'PIN réinitialisé', type: 'success' });
      modalPin = false;
    } catch (e) {
      addToast({ message: e instanceof Error ? e.message : 'Erreur', type: 'error' });
    } finally {
      pinLoading = false;
    }
  }

  const ROLE_LABEL: Record<string, string> = {
    admin: 'Admin', superviseur: 'Superviseur', agent: 'Agent'
  };
  const ROLE_COLOR: Record<string, string> = {
    admin: 'bg-purple-100 text-purple-800',
    superviseur: 'bg-blue-100 text-blue-800',
    agent: 'bg-gray-100 text-gray-700'
  };

  onMount(charger);
</script>

<div class="space-y-4">

  <div class="flex items-center justify-between">
    <h1 class="text-xl font-bold text-gray-900">Agents</h1>
    <Button variant="primary" size="sm" onclick={() => (modalNouvel = true)}>
      + Ajouter un agent
    </Button>
  </div>

  <div class="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
    {#if loading}
      <p class="text-center text-gray-400 text-sm py-10">Chargement…</p>
    {:else if agents.length === 0}
      <p class="text-center text-gray-400 text-sm py-10">Aucun agent</p>
    {:else}
      <table class="w-full text-sm min-w-[640px]">
        <thead class="bg-gray-50 text-xs text-gray-500">
          <tr>
            <th class="text-left px-4 py-3">Numéro</th>
            <th class="text-left px-4 py-3">Nom</th>
            <th class="text-left px-4 py-3">Rôle</th>
            <th class="text-center px-4 py-3">Actif</th>
            <th class="text-center px-4 py-3">Verrouillé</th>
            <th class="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          {#each agents as ag (ag.id)}
            <tr class="{!ag.actif ? 'opacity-50' : ''} hover:bg-gray-50/50">
              <td class="px-4 py-3 font-mono text-gray-700">{ag.numero_agent}</td>
              <td class="px-4 py-3 font-medium text-gray-900">{ag.nom}</td>
              <td class="px-4 py-3">
                <span class="text-xs px-2 py-0.5 rounded-full {ROLE_COLOR[ag.role] ?? 'bg-gray-100 text-gray-700'}">
                  {ROLE_LABEL[ag.role] ?? ag.role}
                </span>
              </td>
              <td class="px-4 py-3 text-center">
                {ag.actif ? '✓' : '✗'}
              </td>
              <td class="px-4 py-3 text-center">
                {#if ag.pin_verrouille}
                  <span class="text-xs text-red-600 font-medium">Verrouillé ({ag.pin_essais_rates} essais)</span>
                {:else}
                  <span class="text-xs text-gray-400">Non</span>
                {/if}
              </td>
              <td class="px-4 py-3">
                <div class="flex flex-wrap gap-2">
                  {#if ag.pin_verrouille}
                    <button
                      type="button"
                      onclick={() => demanderConfirmation(
                        `Déverrouiller ${ag.nom} ?`,
                        async () => { await deverrouillerAgent(ag.id); await charger(); addToast({ message: 'Agent déverrouillé', type: 'success' }); }
                      )}
                      class="text-xs text-blue-600 hover:underline"
                    >Déverrouiller</button>
                  {/if}
                  {#if ag.actif}
                    <button
                      type="button"
                      onclick={() => demanderConfirmation(
                        `Désactiver ${ag.nom} ? Il ne pourra plus se connecter.`,
                        async () => { await setAgentActif(ag.id, false); await charger(); addToast({ message: 'Agent désactivé', type: 'success' }); }
                      )}
                      class="text-xs text-orange-500 hover:underline"
                    >Désactiver</button>
                  {:else}
                    <button
                      type="button"
                      onclick={() => demanderConfirmation(
                        `Réactiver ${ag.nom} ?`,
                        async () => { await setAgentActif(ag.id, true); await charger(); addToast({ message: 'Agent réactivé', type: 'success' }); }
                      )}
                      class="text-xs text-green-600 hover:underline"
                    >Réactiver</button>
                  {/if}
                  <button
                    type="button"
                    onclick={() => ouvrirResetPin(ag.id)}
                    class="text-xs text-gray-500 hover:underline"
                  >Réinit. PIN</button>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>
</div>

<!-- Modale nouvel agent -->
<Modal bind:open={modalNouvel} title="Ajouter un agent">
  {#snippet children()}
    <div class="space-y-3">
      <div>
        <label for="ag-numero" class="block text-xs text-gray-500 mb-1">Numéro agent</label>
        <input id="ag-numero" type="text" bind:value={nouvelAgent.numero} placeholder="AG003"
          class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"/>
      </div>
      <div>
        <label for="ag-nom" class="block text-xs text-gray-500 mb-1">Nom</label>
        <input id="ag-nom" type="text" bind:value={nouvelAgent.nom} placeholder="Prénom Nom"
          class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"/>
      </div>
      <div>
        <label for="ag-role" class="block text-xs text-gray-500 mb-1">Rôle</label>
        <select id="ag-role" bind:value={nouvelAgent.role}
          class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-300">
          <option value="agent">Agent</option>
          <option value="superviseur">Superviseur</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <div>
        <label for="ag-pin" class="block text-xs text-gray-500 mb-1">PIN (6 chiffres)</label>
        <input id="ag-pin" type="password" bind:value={nouvelAgent.pin} placeholder="••••••"
          maxlength="6" inputmode="numeric"
          class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"/>
      </div>
    </div>
  {/snippet}
  {#snippet footer()}
    <Button variant="secondary" size="sm" onclick={() => (modalNouvel = false)}>Annuler</Button>
    <Button
      variant="primary" size="sm"
      loading={creerLoading}
      disabled={!nouvelAgent.numero || !nouvelAgent.nom || !nouvelAgent.pin}
      onclick={ajouterAgent}
    >Créer</Button>
  {/snippet}
</Modal>

<!-- Modale reset PIN -->
<Modal bind:open={modalPin} title="Réinitialiser le PIN">
  {#snippet children()}
    <label for="new-pin" class="block text-xs text-gray-500 mb-1">Nouveau PIN</label>
    <input id="new-pin" type="password" bind:value={resetPin.nouveauPin}
      placeholder="••••••" maxlength="6" inputmode="numeric"
      class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"/>
  {/snippet}
  {#snippet footer()}
    <Button variant="secondary" size="sm" onclick={() => (modalPin = false)}>Annuler</Button>
    <Button
      variant="primary" size="sm"
      loading={pinLoading}
      disabled={resetPin.nouveauPin.length < 4}
      onclick={confirmerResetPin}
    >Valider</Button>
  {/snippet}
</Modal>

<!-- Modale confirmation -->
<Modal bind:open={modalConfirm} title="Confirmation">
  {#snippet children()}
    <p class="text-sm text-gray-700">{confirmMessage}</p>
  {/snippet}
  {#snippet footer()}
    <Button variant="secondary" size="sm" onclick={() => (modalConfirm = false)}>Annuler</Button>
    <Button variant="danger" size="sm" loading={confirmLoading} onclick={executerConfirmation}>
      Confirmer
    </Button>
  {/snippet}
</Modal>
