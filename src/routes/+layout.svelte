<script lang="ts">
  import '../app.css';
  import type { Snippet } from 'svelte';
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { agentStore } from '$lib/stores/agent';
  import { getAgent, logout } from '$lib/auth';
  import Toast from '$lib/components/Toast.svelte';
  import OfflineBadge from '$lib/components/OfflineBadge.svelte';
  import { initNetwork } from '$lib/stores/network.svelte';
  import { getAll } from '$lib/offline/queue';
  import { flushQueue } from '$lib/offline/sync';
  import { networkStore } from '$lib/stores/network.svelte';
  import { initReferentiels } from '$lib/stores/referentiels.svelte';
  import { loadPointsAFaire } from '$lib/stores/point-veille.svelte';

  let { children }: { children: Snippet } = $props();

  let agent = $derived($agentStore);
  let pathname = $derived(page.url.pathname);

  onMount(async () => {
    const a = getAgent();
    if (a) agentStore.set(a);

    await initReferentiels();
    await initNetwork();

    const pending = await getAll();
    networkStore.pendingCount = pending.length;

    if (networkStore.online && pending.length > 0) {
      flushQueue();
    }

    if (a?.role !== 'admin') {
      loadPointsAFaire(); // fire-and-forget, la guard `loaded` évite les doublons
    }
  });
</script>

<Toast />
<OfflineBadge />

{#if agent && pathname !== '/login'}
  <nav class="bg-white border-b border-gray-100 px-4 py-2 sticky top-0 z-20">
    <div class="flex items-center justify-between max-w-lg mx-auto">
      <!-- Liens -->
      <div class="flex items-center gap-1">
        <a
          href="/saisie"
          class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
            {pathname === '/saisie' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-800'}"
        >
          Saisie
        </a>
        <a
          href="/journal"
          class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
            {pathname === '/journal' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-800'}"
        >
          Journal
        </a>
        {#if agent.role === 'admin'}
          <span class="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-300 cursor-not-allowed select-none">
            Historique veille
          </span>
        {/if}
      </div>

      <!-- Agent + déconnexion -->
      <div class="flex items-center gap-2">
        <span class="text-xs text-gray-400 hidden sm:block">{agent.nom}</span>
        <button
          type="button"
          onclick={() => logout()}
          class="text-xs text-red-500 font-medium px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
        >
          Déco.
        </button>
      </div>
    </div>
  </nav>
{/if}

{@render children()}
