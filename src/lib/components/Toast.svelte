<script lang="ts">
  import { fly } from 'svelte/transition';
  import { toastStore } from '$lib/stores/toast';

  const bgClass = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-blue-600'
  };
</script>

<div class="fixed top-4 inset-x-4 z-50 flex flex-col items-center gap-2 pointer-events-none">
  {#each $toastStore as toast (toast.id)}
    <div
      in:fly={{ y: -16, duration: 200 }}
      out:fly={{ y: -16, duration: 150 }}
      class="max-w-sm w-full px-4 py-3 rounded-xl text-white text-sm font-medium
             shadow-lg text-center pointer-events-auto {bgClass[toast.type]}"
    >
      {toast.message}
    </div>
  {/each}
</div>
