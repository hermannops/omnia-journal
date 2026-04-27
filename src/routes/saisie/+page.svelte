<script lang="ts">
  import { agentStore } from '$lib/stores/agent';
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50">
  <div class="text-center">
    <h1 class="text-2xl font-bold text-gray-900">Page de saisie</h1>
    {#if $agentStore}
      <p class="text-gray-500 mt-2">Bonjour, {$agentStore.nom} ({$agentStore.numero})</p>
    {/if}
    <p class="text-gray-400 mt-1 text-sm">Étape 5 — à venir</p>
  </div>
</div>
