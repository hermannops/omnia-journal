<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { get } from 'svelte/store';
  import { agentStore } from '$lib/stores/agent';
  import { networkStore } from '$lib/stores/network.svelte';
  import { fetchJournalDuJour, fetchTotauxDuJour, fetchSoldesActuels } from '$lib/db/journal';
  import type { LigneJournal, TotalDuJour, SoldeActuel } from '$lib/db/journal';
  import { getAll } from '$lib/offline/queue';
  import type { PendingTransaction } from '$lib/offline/queue';
  import { getJournalCache, setJournalCache } from '$lib/db/idb';
  import TransactionRow from '$lib/components/TransactionRow.svelte';
  import { formatFCFA, formatDate, formatHeure } from '$lib/utils/format';

  const COULEUR_BG: Record<string, string> = {
    MTN:     'bg-yellow-50 border-yellow-200',
    MOOV:    'bg-blue-50 border-blue-200',
    CELTIIS: 'bg-green-50 border-green-200'
  };
  const COULEUR_TITRE: Record<string, string> = {
    MTN:     'text-yellow-800',
    MOOV:    'text-blue-800',
    CELTIIS: 'text-green-800'
  };

  // ── État ───────────────────────────────────────────────────────────
  let lignes        = $state<LigneJournal[]>([]);
  let totaux        = $state<TotalDuJour[]>([]);
  let soldes        = $state<SoldeActuel[]>([]);
  let pending       = $state<(PendingTransaction & { _pending: true })[]>([]);
  let cachedAt      = $state<string | null>(null);
  let loading       = $state(true);

  // ── Opérateurs présents dans les soldes (pour les cartes) ─────────
  let operateurs = $derived(
    soldes.length > 0
      ? soldes
      : totaux
          .filter((v, i, a) => a.findIndex(x => x.operateur_code === v.operateur_code) === i)
          .map(t => ({ operateur_code: t.operateur_code, operateur_nom: t.operateur_nom,
                       solde_theorique: null as number | null, derniere_operation: null }))
  );

  // Sous-totaux par opérateur pour les cartes
  function totauxPour(code: string): TotalDuJour[] {
    return totaux.filter(t => t.operateur_code === code);
  }
  function soldePour(code: string): number | null {
    return soldes.find(s => s.operateur_code === code)?.solde_theorique ?? null;
  }

  // ── Fetch + cache ──────────────────────────────────────────────────
  async function charger(silent = false) {
    const agent = get(agentStore);
    if (!agent) return;

    if (!silent) loading = true;

    if (networkStore.online) {
      try {
        const [l, t, s] = await Promise.all([
          fetchJournalDuJour(agent.id),
          fetchTotauxDuJour(agent.id),
          fetchSoldesActuels()
        ]);
        lignes  = l;
        totaux  = t;
        soldes  = s;
        cachedAt = null;
        await Promise.all([
          setJournalCache('lignes',  l),
          setJournalCache('totaux',  t),
          setJournalCache('soldes',  s)
        ]);
      } catch {
        await chargerDepuisCache();
      }
    } else {
      await chargerDepuisCache();
    }

    // Transactions offline en attente
    const p = await getAll();
    pending = p.map(tx => ({ ...tx, _pending: true as const }));

    loading = false;
  }

  async function chargerDepuisCache() {
    const [cl, ct, cs] = await Promise.all([
      getJournalCache<LigneJournal[]>('lignes'),
      getJournalCache<TotalDuJour[]>('totaux'),
      getJournalCache<SoldeActuel[]>('soldes')
    ]);
    lignes  = cl?.data  ?? [];
    totaux  = ct?.data  ?? [];
    soldes  = cs?.data  ?? [];
    cachedAt = cl?.cached_at ?? ct?.cached_at ?? null;
  }

  // ── Auto-refresh 30s si online ─────────────────────────────────────
  let refreshTimer: ReturnType<typeof setInterval>;

  onMount(async () => {
    await charger();
    refreshTimer = setInterval(() => {
      if (networkStore.online) charger(true);
    }, 30_000);
  });

  onDestroy(() => clearInterval(refreshTimer));

  // ── Toutes les lignes (validées + pending) triées par date desc ────
  let toutesLignes = $derived([
    ...lignes,
    ...pending
  ]);
</script>

<div class="min-h-screen bg-gray-50 pb-10">

  <!-- En-tête -->
  <div class="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
    <div class="flex items-center justify-between max-w-lg mx-auto">
      <div>
        <h1 class="text-lg font-bold text-gray-900">Journal du jour</h1>
        <p class="text-xs text-gray-400">{formatDate(new Date())}</p>
      </div>
      <a
        href="/saisie"
        class="text-sm text-blue-600 font-medium flex items-center gap-1"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
        </svg>
        Saisir
      </a>
    </div>
  </div>

  {#if cachedAt}
    <div class="bg-orange-50 border-b border-orange-100 px-4 py-1.5 text-center text-xs text-orange-600">
      Données du {formatHeure(cachedAt)} — hors ligne
    </div>
  {/if}

  <div class="px-4 pt-4 space-y-4 max-w-lg mx-auto">

    {#if loading}
      <div class="text-center py-12 text-gray-400 text-sm">Chargement…</div>

    {:else}

      <!-- Cartes soldes par opérateur -->
      {#if operateurs.length > 0}
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {#each operateurs as op (op.operateur_code)}
            {@const sous = totauxPour(op.operateur_code)}
            {@const solde = soldePour(op.operateur_code)}
            <div class="rounded-2xl border p-4 {COULEUR_BG[op.operateur_code] ?? 'bg-gray-50 border-gray-200'}">
              <p class="font-bold text-sm {COULEUR_TITRE[op.operateur_code] ?? 'text-gray-700'}">
                {op.operateur_nom}
              </p>
              <p class="text-xl font-bold text-gray-900 mt-1">
                {solde !== null ? formatFCFA(solde) : '—'}
              </p>
              {#if sous.length === 0}
                <p class="text-xs text-gray-400 mt-2">Aucune opération</p>
              {:else}
                <div class="mt-2 space-y-0.5">
                  {#each sous as t (t.type_code)}
                    <p class="text-xs text-gray-600">
                      {t.type_libelle} : {t.nb_operations}
                      ({formatFCFA(t.montant_total)})
                    </p>
                  {/each}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}

      <!-- Liste transactions -->
      <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {#if toutesLignes.length === 0}
          <p class="text-center text-gray-400 text-sm py-10">Aucune transaction aujourd'hui</p>
        {:else}
          <div class="divide-y divide-gray-50">
            {#each toutesLignes as tx (('_pending' in tx) ? tx.client_uuid : tx.id)}
              <div class="px-4">
                <TransactionRow transaction={tx} />
              </div>
            {/each}
          </div>
        {/if}
      </div>

    {/if}
  </div>
</div>
