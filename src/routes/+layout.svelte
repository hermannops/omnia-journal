<script lang="ts">
  import '../app.css';
  import type { Snippet } from 'svelte';
  import { onMount } from 'svelte';
  import { agentStore } from '$lib/stores/agent';
  import { getAgent } from '$lib/auth';
  import Toast from '$lib/components/Toast.svelte';

  let { children }: { children: Snippet } = $props();

  // Restaure le store agent depuis le JWT en localStorage au démarrage
  onMount(() => {
    const agent = getAgent();
    if (agent) agentStore.set(agent);
  });
</script>

<Toast />
{@render children()}
