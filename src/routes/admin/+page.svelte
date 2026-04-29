<script lang="ts">
  import { onMount } from 'svelte';
  import {
    fetchStatsAdmin, fetchVolumeParOperateur7j, fetchDernieresTransactions
  } from '$lib/db/admin';
  import type { StatsAdmin, VolumeOperateur, TransactionAdmin } from '$lib/db/admin';
  import { formatFCFA, formatDate, formatHeure } from '$lib/utils/format';
  import Button from '$lib/components/Button.svelte';

  let stats = $state<{ jour: StatsAdmin; semaine: StatsAdmin; mois: StatsAdmin } | null>(null);
  let volumes = $state<VolumeOperateur[]>([]);
  let dernieres = $state<TransactionAdmin[]>([]);
  let loading = $state(true);
  let erreur = $state('');

  const COULEUR: Record<string, string> = {
    MTN: 'text-yellow-700', MOOV: 'text-blue-700', CELTIIS: 'text-green-700'
  };

  async function charger() {
    loading = true;
    erreur = '';
    try {
      const [s, v, d] = await Promise.all([
        fetchStatsAdmin(),
        fetchVolumeParOperateur7j(),
        fetchDernieresTransactions(5)
      ]);
      stats = s;
      volumes = v;
      dernieres = d;
    } catch (e) {
      erreur = e instanceof Error ? e.message : 'Erreur de chargement';
    } finally {
      loading = false;
    }
  }

  onMount(charger);
</script>

<div class="space-y-6">

  <div class="flex items-center justify-between">
    <h1 class="text-xl font-bold text-gray-900">Dashboard</h1>
    <Button variant="secondary" size="sm" onclick={charger} loading={loading}>
      Rafraîchir
    </Button>
  </div>

  {#if erreur}
    <p class="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{erreur}</p>
  {/if}

  {#if loading && !stats}
    <p class="text-gray-400 text-sm text-center py-10">Chargement…</p>
  {:else if stats}

    <!-- Grille statistiques -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {#each [
        { label: "Aujourd'hui", s: stats.jour },
        { label: 'Cette semaine', s: stats.semaine },
        { label: 'Ce mois', s: stats.mois }
      ] as item}
        <div class="bg-white rounded-2xl border border-gray-100 p-4">
          <p class="text-xs text-gray-500 mb-2">{item.label}</p>
          <p class="text-2xl font-bold text-gray-900">{formatFCFA(item.s.volume_total)}</p>
          <div class="flex gap-3 mt-2">
            <span class="text-xs text-gray-500">{item.s.nb_transactions} opérations</span>
            {#if item.s.nb_annulees > 0}
              <span class="text-xs text-red-500">{item.s.nb_annulees} annulées</span>
            {/if}
          </div>
        </div>
      {/each}
    </div>

    <!-- Volume 7 jours par opérateur -->
    {#if volumes.length > 0}
      <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div class="px-4 py-3 border-b border-gray-50">
          <h2 class="text-sm font-semibold text-gray-700">Volume par opérateur — 7 derniers jours</h2>
        </div>
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th class="text-left px-4 py-2">Opérateur</th>
              <th class="text-right px-4 py-2">Opérations</th>
              <th class="text-right px-4 py-2">Volume</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            {#each volumes as v (v.operateur_code)}
              <tr>
                <td class="px-4 py-3 font-medium {COULEUR[v.operateur_code] ?? 'text-gray-800'}">
                  {v.operateur_nom}
                </td>
                <td class="px-4 py-3 text-right text-gray-600">{v.nb_transactions}</td>
                <td class="px-4 py-3 text-right font-semibold text-gray-900">{formatFCFA(v.volume_total)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}

    <!-- 5 dernières transactions -->
    <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div class="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
        <h2 class="text-sm font-semibold text-gray-700">5 dernières transactions</h2>
        <a href="/admin/transactions" class="text-xs text-blue-600 hover:underline">Voir tout →</a>
      </div>
      {#if dernieres.length === 0}
        <p class="text-center text-gray-400 text-sm py-8">Aucune transaction</p>
      {:else}
        <table class="w-full text-sm">
          <tbody class="divide-y divide-gray-50">
            {#each dernieres as t (t.id)}
              <tr class="{t.statut === 'annulee' ? 'opacity-50' : ''}">
                <td class="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                  {formatDate(t.horodatage)} {formatHeure(t.horodatage)}
                </td>
                <td class="px-4 py-3 text-gray-700">{t.agent?.nom ?? '—'}</td>
                <td class="px-4 py-3 font-medium {COULEUR[t.operateur?.code ?? ''] ?? 'text-gray-700'}">
                  {t.operateur?.code ?? '—'}
                </td>
                <td class="px-4 py-3 text-gray-600">{t.type_operation?.libelle ?? '—'}</td>
                <td class="px-4 py-3 text-right font-semibold text-gray-900 {t.statut === 'annulee' ? 'line-through' : ''}">
                  {formatFCFA(t.montant)}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </div>

  {/if}
</div>
