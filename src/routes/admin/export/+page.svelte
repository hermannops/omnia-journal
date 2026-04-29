<script lang="ts">
  import { onMount } from 'svelte';
  import { referentielsStore } from '$lib/stores/referentiels.svelte';
  import {
    fetchExportPreview, fetchTransactionsForExport, fetchAgents,
    EXPORT_LIMIT
  } from '$lib/db/admin';
  import type { AgentAdmin, FiltresExport } from '$lib/db/admin';
  import { addToast } from '$lib/stores/toast';
  import { formatFCFA } from '$lib/utils/format';
  import { exportTransactionsToExcel } from '$lib/utils/excel';
  import Button from '$lib/components/Button.svelte';

  // ── Helpers date ──────────────────────────────────────────────────
  function toDateStr(d: Date) { return d.toISOString().split('T')[0]; }
  const aujourd_hui = toDateStr(new Date());
  const premierDuMois = toDateStr(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  // ── Filtres ───────────────────────────────────────────────────────
  let filtres = $state<FiltresExport>({
    dateDebut: premierDuMois,
    dateFin: aujourd_hui,
    agentId: '',
    operateurId: '',
    inclureAnnulees: false
  });

  // ── Aperçu ────────────────────────────────────────────────────────
  let apercu = $state<{ count: number; montant_total: number } | null>(null);
  let apercuLoading = $state(false);
  let apercuErreur = $state('');
  let truncatedWarning = $state(false);

  let debounceTimer: ReturnType<typeof setTimeout>;

  async function chargerApercu(f: FiltresExport) {
    apercuLoading = true;
    apercuErreur = '';
    try {
      apercu = await fetchExportPreview(f);
    } catch (e) {
      apercuErreur = e instanceof Error ? e.message : 'Erreur';
      apercu = null;
    } finally {
      apercuLoading = false;
    }
  }

  $effect(() => {
    const snapshot = {
      dateDebut: filtres.dateDebut,
      dateFin: filtres.dateFin,
      agentId: filtres.agentId,
      operateurId: filtres.operateurId,
      inclureAnnulees: filtres.inclureAnnulees
    };
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => chargerApercu(snapshot), 300);
    return () => clearTimeout(debounceTimer);
  });

  // ── Export ────────────────────────────────────────────────────────
  let exportLoading = $state(false);

  async function exporter() {
    if (exportLoading) return;
    exportLoading = true;
    try {
      const { data, truncated } = await fetchTransactionsForExport({ ...filtres });
      if (truncated) {
        addToast({
          message: `Plus de ${EXPORT_LIMIT.toLocaleString('fr')} transactions, l'export est tronqué. Réduis la période.`,
          type: 'error',
          duration: 6000
        });
      }
      exportTransactionsToExcel(data, filtres.dateDebut, filtres.dateFin);
      addToast({ message: 'Fichier généré', type: 'success' });
    } catch (e) {
      addToast({ message: e instanceof Error ? e.message : 'Erreur lors de l\'export', type: 'error' });
    } finally {
      exportLoading = false;
    }
  }

  // ── Agents ────────────────────────────────────────────────────────
  let agentsListe = $state<AgentAdmin[]>([]);

  onMount(async () => {
    agentsListe = await fetchAgents();
  });

  const inputClass =
    'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 ' +
    'focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white';
</script>

<div class="space-y-5 max-w-2xl">

  <div>
    <h1 class="text-xl font-bold text-gray-900">Export Excel</h1>
    <p class="text-sm text-gray-500 mt-0.5">
      Génère un fichier Excel des transactions selon les filtres ci-dessous.
    </p>
  </div>

  <!-- Filtres -->
  <div class="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label for="export-date-debut" class="block text-xs text-gray-500 mb-1">Date début</label>
        <input id="export-date-debut" type="date" bind:value={filtres.dateDebut} class={inputClass} />
      </div>
      <div>
        <label for="export-date-fin" class="block text-xs text-gray-500 mb-1">Date fin</label>
        <input id="export-date-fin" type="date" bind:value={filtres.dateFin} class={inputClass} />
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label for="export-agent" class="block text-xs text-gray-500 mb-1">Agent</label>
        <select id="export-agent" bind:value={filtres.agentId} class={inputClass}>
          <option value="">Tous</option>
          {#each agentsListe as a (a.id)}
            <option value={a.id}>{a.nom}</option>
          {/each}
        </select>
      </div>
      <div>
        <label for="export-operateur" class="block text-xs text-gray-500 mb-1">Opérateur</label>
        <select id="export-operateur" bind:value={filtres.operateurId} class={inputClass}>
          <option value="">Tous</option>
          {#each referentielsStore.operateurs as op (op.id)}
            <option value={op.id}>{op.nom}</option>
          {/each}
        </select>
      </div>
    </div>

    <label class="flex items-center gap-2.5 cursor-pointer select-none">
      <input
        type="checkbox"
        bind:checked={filtres.inclureAnnulees}
        class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      <span class="text-sm text-gray-700">Inclure les transactions annulées</span>
    </label>
  </div>

  <!-- Aperçu -->
  <div class="bg-gray-50 rounded-2xl border border-gray-100 px-4 py-3 min-h-[48px] flex items-center">
    {#if apercuLoading}
      <span class="text-sm text-gray-400">Calcul…</span>
    {:else if apercuErreur}
      <span class="text-sm text-red-500">{apercuErreur}</span>
    {:else if apercu !== null}
      <span class="text-sm font-medium text-gray-700">
        {apercu.count.toLocaleString('fr')} transaction{apercu.count !== 1 ? 's' : ''} trouvée{apercu.count !== 1 ? 's' : ''}
        {#if apercu.count > 0}
          · Montant total : {formatFCFA(apercu.montant_total)}
        {/if}
      </span>
    {:else}
      <span class="text-sm text-gray-400">—</span>
    {/if}
  </div>

  <!-- Bouton export -->
  <div class="space-y-3">
    <Button
      variant="primary"
      size="lg"
      disabled={!apercu || apercu.count === 0}
      loading={exportLoading}
      onclick={exporter}
    >
      Exporter en Excel
    </Button>

    <p class="text-xs text-gray-400 leading-relaxed">
      Note : ce fichier contient des données sensibles (numéros de clients, montants).
      À conserver de manière confidentielle.
    </p>
  </div>
</div>
