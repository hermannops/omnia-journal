<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  // Redirige vers la saisie dès que la page racine est chargée.
  // À l'étape 8, on intercalera /point-veille si nécessaire.
  onMount(() => {
    goto('/saisie', { replaceState: true });
  });
</script>
