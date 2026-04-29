<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { agentStore } from '$lib/stores/agent';
  import { referentielsStore } from '$lib/stores/referentiels.svelte';
  import {
    fetchTransactionsAdmin, annulerTransaction, fetchAgents,
    PAGE_SIZE
  } from '$lib/db/admin';
  import type { TransactionAdmin, AgentAdmin, FiltresTransactions } from '$lib/db/admin';
  import { addToast } from '$lib/stores/toast';
  import { formatFCFA, formatDate, formatHeure } from '$lib/utils/format';
  import Button from '$lib/components/Button.svelte';
  import Modal from '$lib/components/Modal.svelte';

  // ── Date helpers ───────────────────────────────────────────────────
  function toDateStr(d: Date) { return d.toISOString().split('T')[0]; }
  const aujourd_hui = toDateStr(new Date());
  const il_y_a_7j = toDateStr(new Date(Date.now() - 6 * 86_400_000));

  // ── Filtres ────────────────────────────────────────────────────────
  let filtres = $state<FiltresTransactions>({
    dateDebut: il_y_a_7j,
    dateFin: aujourd_hui,
    agentId: '',
    operateurId: '',
    typeId: '',
    statut: 'tous',
    page: 0
  });

  // ── Données ────────────────────────────────────────────────────────
  let transactions = $state<TransactionAdmin[]>([]);
  let totalCount = $state(0);
  let agentsListe = $state<AgentAdmin[]>([]);
  let loading = $state(true);
  let erreur = $state('');

  let totalPages = $derived(Math.ceil(totalCount / PAGE_SIZE));

  // ── Annulation ─────────────────────────────────────────────────────
  let modalOpen = $state(false);
  let selectedId = $state('');
  let motif = $state('');
  let annulLoading = $state(false);

  function ouvrirAnnulation(id: string) {
    selectedId = id;
    motif = '';
    modalOpen = true;
  }

  async function confirmerAnnulation() {
    if (!motif.trim() || annulLoading) return;
    annulLoading = true;
    const admin = get(agentStore);
    try {
      await annulerTransaction(selectedId, motif.trim(), admin!.id);
      addToast({ message: 'Transaction annulée', type: 'success' });
      modalOpen = false;
      await charger();
    } catch (e) {
      addToast({ message: e instanceof Error ? e.message : 'Erreur', type: 'error' });
    } finally {
      annulLoading = false;
    }
  }

  // ── Chargement ─────────────────────────────────────────────────────
  async function charger() {
    loading = true;
    erreur = '';
    try {
      const { data, count } = await fetchTransactionsAdmin(filtres);
      transactions = data;
      totalCount = count;
    } catch (e) {
      erreur = e instanceof Error ? e.message : 'Erreur de chargement';
    } finally {
      loading = false;
    }
  }

  function appliquerFiltres() {
    filtres.page = 0;
    charger();
  }

  function changerPage(p: number) {
    filtres.page = p;
    charger();
  }

  const COULEUR: Record<string, string> = {
    MTN: 'text-yellow-700', MOOV: 'text-blue-700', CELTIIS: 'text-green-700'
  };

  onMount(async () => {
    agentsListe = await fetchAgents();
    await charger();
  });
</script>

<div class="space-y-4">

  <h1 class="text-xl font-bold text-gray-900">Transactions</h1>

  <!-- Filtres -->
  <div class="bg-white rounded-2xl border border-gray-100 p-4">
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">

      <div>
        <label for="tx-date-debut" class="block text-xs text-gray-500 mb-1">Date début</label>
        <input id="tx-date-debut" type="date" bind:value={filtres.dateDebut}
          class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300"/>
      </div>

      <div>
        <label for="tx-date-fin" class="block text-xs text-gray-500 mb-1">Date fin</label>
        <input id="tx-date-fin" type="date" bind:value={filtres.dateFin}
          class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300"/>
      </div>

      <div>
        <label for="tx-agent" class="block text-xs text-gray-500 mb-1">Agent</label>
        <select id="tx-agent" bind:value={filtres.agentId}
          class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white">
          <option value="">Tous</option>
          {#each agentsListe as a (a.id)}
            <option value={a.id}>{a.nom}</option>
          {/each}
        </select>
      </div>

      <div>
        <label for="tx-operateur" class="block text-xs text-gray-500 mb-1">Opérateur</label>
        <select id="tx-operateur" bind:value={filtres.operateurId}
          class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white">
          <option value="">Tous</option>
          {#each referentielsStore.operateurs as op (op.id)}
            <option value={op.id}>{op.nom}</option>
          {/each}
        </select>
      </div>

      <div>
        <label for="tx-type" class="block text-xs text-gray-500 mb-1">Type d'opération</label>
        <select id="tx-type" bind:value={filtres.typeId}
          class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white">
          <option value="">Tous</option>
          {#each referentielsStore.typesOperation as t (t.id)}
            <option value={t.id}>{t.libelle}</option>
          {/each}
        </select>
      </div>

      <div>
        <label for="tx-statut" class="block text-xs text-gray-500 mb-1">Statut</label>
        <select id="tx-statut" bind:value={filtres.statut}
          class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white">
          <option value="tous">Tous</option>
          <option value="validee">Validées</option>
          <option value="annulee">Annulées</option>
        </select>
      </div>
    </div>

    <div class="mt-3 flex justify-end">
      <Button variant="primary" size="sm" onclick={appliquerFiltres} loading={loading}>
        Filtrer
      </Button>
    </div>
  </div>

  {#if erreur}
    <p class="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{erreur}</p>
  {/if}

  <!-- Tableau -->
  <div class="bg-white rounded-2xl border border-gray-100 overflow-x-auto">

    {#if loading}
      <p class="text-center text-gray-400 text-sm py-10">Chargement…</p>
    {:else if transactions.length === 0}
      <p class="text-center text-gray-400 text-sm py-10">Aucune transaction pour ces critères</p>
    {:else}
      <table class="w-full text-sm min-w-[800px]">
        <thead class="bg-gray-50 text-xs text-gray-500">
          <tr>
            <th class="text-left px-4 py-3">Date / Heure</th>
            <th class="text-left px-4 py-3">Agent</th>
            <th class="text-left px-4 py-3">Opér.</th>
            <th class="text-left px-4 py-3">Type</th>
            <th class="text-left px-4 py-3">Client</th>
            <th class="text-right px-4 py-3">Montant</th>
            <th class="text-right px-4 py-3">Solde après</th>
            <th class="text-center px-4 py-3">Statut</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          {#each transactions as t (t.id)}
            <tr class="{t.statut === 'annulee' ? 'opacity-50' : ''} hover:bg-gray-50/50">
              <td class="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                {formatDate(t.horodatage)}<br/>{formatHeure(t.horodatage)}
              </td>
              <td class="px-4 py-3 text-gray-700">{t.agent?.nom ?? '—'}</td>
              <td class="px-4 py-3 font-semibold {COULEUR[t.operateur?.code ?? ''] ?? 'text-gray-700'}">
                {t.operateur?.code ?? '—'}
              </td>
              <td class="px-4 py-3 text-gray-600">{t.type_operation?.libelle ?? '—'}</td>
              <td class="px-4 py-3 text-gray-500 text-xs">
                {[t.numero_client, t.nom_client].filter(Boolean).join(' · ') || '—'}
              </td>
              <td class="px-4 py-3 text-right font-semibold text-gray-900 {t.statut === 'annulee' ? 'line-through' : ''}">
                {formatFCFA(t.montant)}
              </td>
              <td class="px-4 py-3 text-right text-gray-400 text-xs">{formatFCFA(t.solde_apres)}</td>
              <td class="px-4 py-3 text-center">
                {#if t.statut === 'annulee'}
                  <span
                    title={t.motif_annulation ?? ''}
                    class="inline-block text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full cursor-help"
                  >
                    Annulée
                  </span>
                {:else}
                  <span class="inline-block text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                    Validée
                  </span>
                {/if}
              </td>
              <td class="px-4 py-3 text-right">
                {#if t.statut === 'validee'}
                  <button
                    type="button"
                    onclick={() => ouvrirAnnulation(t.id)}
                    class="text-xs text-red-500 hover:underline"
                  >
                    Annuler
                  </button>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>

      <!-- Pagination -->
      {#if totalPages > 1}
        <div class="flex items-center justify-between px-4 py-3 border-t border-gray-50 text-sm text-gray-500">
          <span>{totalCount} résultats</span>
          <div class="flex gap-2">
            <button
              type="button"
              onclick={() => changerPage(filtres.page - 1)}
              disabled={filtres.page === 0}
              class="px-3 py-1 rounded-lg border border-gray-200 disabled:opacity-40"
            >←</button>
            <span class="px-3 py-1">{filtres.page + 1} / {totalPages}</span>
            <button
              type="button"
              onclick={() => changerPage(filtres.page + 1)}
              disabled={filtres.page >= totalPages - 1}
              class="px-3 py-1 rounded-lg border border-gray-200 disabled:opacity-40"
            >→</button>
          </div>
        </div>
      {/if}
    {/if}
  </div>
</div>

<!-- Modale annulation -->
<Modal bind:open={modalOpen} title="Annuler la transaction">
  {#snippet children()}
    <p class="text-sm text-gray-600 mb-3">
      Cette action est irréversible. Saisissez le motif d'annulation.
    </p>
    <label for="motif-annulation" class="block text-sm font-medium text-gray-700 mb-1.5">
      Motif <span class="text-red-500">*</span>
    </label>
    <textarea
      id="motif-annulation"
      bind:value={motif}
      placeholder="Ex : Saisie en double, erreur de montant…"
      rows="3"
      class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300 resize-none"
    ></textarea>
  {/snippet}
  {#snippet footer()}
    <Button variant="secondary" size="sm" onclick={() => (modalOpen = false)}>Annuler</Button>
    <Button
      variant="danger"
      size="sm"
      loading={annulLoading}
      disabled={!motif.trim()}
      onclick={confirmerAnnulation}
    >
      Confirmer l'annulation
    </Button>
  {/snippet}
</Modal>
