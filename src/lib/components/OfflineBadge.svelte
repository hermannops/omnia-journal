<script lang="ts">
  import { networkStore } from '$lib/stores/network.svelte';
  import { flushQueue } from '$lib/offline/sync';

  let retrying = $state(false);

  async function retry() {
    retrying = true;
    await flushQueue();
    retrying = false;
  }
</script>

{#if networkStore.syncing}
  <!-- Synchronisation en cours -->
  <div class="flex items-center justify-center gap-2 bg-blue-500 text-white text-sm font-medium py-2 px-4">
    <svg class="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
    Synchronisation…
  </div>

{:else if !networkStore.online || networkStore.pendingCount > 0}
  <!-- Hors ligne ou transactions en attente -->
  <div class="flex items-center justify-between gap-3 bg-orange-500 text-white text-sm font-medium py-2 px-4">
    <span class="flex items-center gap-2">
      <!-- Icône wifi barré -->
      <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M3 3l18 18M8.5 8.5A8.5 8.5 0 0112 7.5c1.93 0 3.7.64 5.12 1.71M1.42 1.42A17.9 17.9 0 0112 3c3.41 0 6.6.95 9.3 2.6M6.28 6.28A10.5 10.5 0 0112 4.5m0 0v.01M12 12a2 2 0 100 4 2 2 0 000-4z" />
      </svg>
      {#if networkStore.pendingCount > 0}
        Hors ligne — {networkStore.pendingCount}
        {networkStore.pendingCount === 1 ? 'opération en attente' : 'opérations en attente'}
      {:else}
        Hors ligne
      {/if}
    </span>

    {#if networkStore.pendingCount > 0}
      <button
        type="button"
        onclick={retry}
        disabled={retrying}
        class="text-white underline text-xs shrink-0 disabled:opacity-60"
      >
        {retrying ? '…' : 'Réessayer'}
      </button>
    {/if}
  </div>

{:else}
  <!-- En ligne -->
  <div class="flex items-center justify-center gap-2 bg-green-500 text-white text-sm font-medium py-1.5 px-4">
    <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round"
        d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
    </svg>
    En ligne
  </div>
{/if}
