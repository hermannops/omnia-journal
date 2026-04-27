<script lang="ts">
  import { referentielsStore } from '$lib/stores/referentiels.svelte';
</script>

<div class="min-h-screen bg-gray-50 p-6">
  <h1 class="text-2xl font-bold text-gray-900 mb-6">OMNIA Journal — Référentiels</h1>

  {#if !referentielsStore.loaded}
    <p class="text-gray-400">Chargement…</p>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

      <!-- Opérateurs -->
      <div class="bg-white rounded-xl border border-gray-100 p-4">
        <h2 class="font-semibold text-gray-700 mb-3">
          Opérateurs ({referentielsStore.operateurs.length})
        </h2>
        <ul class="space-y-2">
          {#each referentielsStore.operateurs as op}
            <li class="flex items-center gap-3 text-sm">
              <span class="font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-800">
                {op.code}
              </span>
              <span class="text-gray-600">{op.nom}</span>
            </li>
          {/each}
        </ul>
      </div>

      <!-- Types d'opération -->
      <div class="bg-white rounded-xl border border-gray-100 p-4">
        <h2 class="font-semibold text-gray-700 mb-3">
          Types d'opération ({referentielsStore.typesOperation.length})
        </h2>
        <ul class="space-y-2">
          {#each referentielsStore.typesOperation as type}
            <li class="flex items-center gap-3 text-sm">
              <span class="font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-800">
                {type.code}
              </span>
              <span class="text-gray-600">{type.libelle}</span>
              <span class="text-gray-400 text-xs ml-auto">
                {type.sens_solde === 1 ? '↑' : type.sens_solde === -1 ? '↓' : '—'}
              </span>
            </li>
          {/each}
        </ul>
      </div>

    </div>
  {/if}
</div>
