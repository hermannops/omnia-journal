<script lang="ts">
  import '../app.css';
  import type { Snippet } from 'svelte';
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { agentStore } from '$lib/stores/agent';
  import { getAgent, logout } from '$lib/auth';
  import Toast from '$lib/components/Toast.svelte';
  import OfflineBadge from '$lib/components/OfflineBadge.svelte';
  import InstallPrompt from '$lib/components/InstallPrompt.svelte';
  import { initNetwork } from '$lib/stores/network.svelte';
  import { getAll } from '$lib/offline/queue';
  import { flushQueue } from '$lib/offline/sync';
  import { networkStore } from '$lib/stores/network.svelte';
  import { initReferentiels } from '$lib/stores/referentiels.svelte';
  import { loadPointsAFaire } from '$lib/stores/point-veille.svelte';

  let { children }: { children: Snippet } = $props();

  let agent = $derived($agentStore);
  let pathname = $derived(page.url.pathname);
  let sidebarOpen = $state(false);

  function handleLogout() {
    logout();
    goto('/login');
  }

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
      loadPointsAFaire();
    }
  });
</script>

<Toast />
<OfflineBadge />
<InstallPrompt />

{#if agent && pathname !== '/login'}
  <!-- Overlay mobile -->
  {#if sidebarOpen}
    <button
      type="button"
      class="fixed inset-0 z-20 bg-black/30"
      onclick={() => (sidebarOpen = false)}
      aria-label="Fermer le menu"
    ></button>
  {/if}

  <!-- Sidebar -->
  <aside class="fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-100 z-30 flex flex-col transition-transform duration-200
    {sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0">

    <!-- En-tête -->
    <div class="px-5 py-5 border-b border-gray-100">
      <p class="text-xs font-semibold text-gray-400 uppercase tracking-widest">OMNIA Journal</p>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
      <a
        href="/saisie"
        onclick={() => (sidebarOpen = false)}
        class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
          {pathname === '/saisie' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}"
      >
        <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
        </svg>
        Saisie
      </a>

      <a
        href="/journal"
        onclick={() => (sidebarOpen = false)}
        class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
          {pathname === '/journal' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}"
      >
        <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
        </svg>
        Journal
      </a>

      {#if agent.role === 'admin'}
        <a
          href="/admin"
          onclick={() => (sidebarOpen = false)}
          class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
            {pathname.startsWith('/admin') ? 'bg-purple-50 text-purple-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}"
        >
          <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
          Administration
        </a>
      {/if}
    </nav>

    <!-- Pied : agent + déconnexion -->
    <div class="px-3 py-4 border-t border-gray-100">
      <div class="px-3 py-2 mb-1">
        <p class="text-xs text-gray-400">Connecté en tant que</p>
        <p class="text-sm font-semibold text-gray-700 truncate">{agent.nom}</p>
        <p class="text-xs text-gray-400">{agent.numero}</p>
      </div>
      <button
        type="button"
        onclick={handleLogout}
        class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
      >
        <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
        </svg>
        Déconnexion
      </button>
    </div>
  </aside>

  <!-- Bouton hamburger mobile -->
  <button
    type="button"
    onclick={() => (sidebarOpen = !sidebarOpen)}
    class="md:hidden fixed top-3 left-3 z-40 bg-white border border-gray-200 rounded-xl p-2 shadow-sm"
    aria-label="Menu"
  >
    <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
    </svg>
  </button>

  <!-- Contenu principal décalé sur desktop -->
  <div class="md:pl-64">
    {@render children()}
  </div>
{:else}
  {@render children()}
{/if}
