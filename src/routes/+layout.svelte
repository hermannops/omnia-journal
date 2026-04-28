<script lang="ts">
  import '../app.css';
  import type { Snippet } from 'svelte';
  import { onMount } from 'svelte';
  import { agentStore } from '$lib/stores/agent';
  import { getAgent } from '$lib/auth';
  import Toast from '$lib/components/Toast.svelte';
  import OfflineBadge from '$lib/components/OfflineBadge.svelte';
  import { initNetwork } from '$lib/stores/network.svelte';
  import { getAll } from '$lib/offline/queue';
  import { flushQueue } from '$lib/offline/sync';
  import { networkStore } from '$lib/stores/network.svelte';
  import { initReferentiels } from '$lib/stores/referentiels.svelte';

  let { children }: { children: Snippet } = $props();

  onMount(async () => {
    // Restaure l'agent depuis le JWT stocké
    const agent = getAgent();
    if (agent) agentStore.set(agent);

    // Charge les référentiels (opérateurs + types d'opération)
    await initReferentiels();

    // Initialise le store réseau (ping + event listeners)
    await initNetwork();

    // Lit le nombre de transactions en attente dans IDB
    const pending = await getAll();
    networkStore.pendingCount = pending.length;

    // Si on est en ligne et qu'il y a des transactions en attente → flush immédiat
    if (networkStore.online && pending.length > 0) {
      flushQueue();
    }
  });
</script>

<Toast />
<OfflineBadge />
{@render children()}
