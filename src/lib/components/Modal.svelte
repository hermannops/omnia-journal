<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    open?: boolean;
    title: string;
    children: Snippet;
    footer?: Snippet;
  }

  let { open = $bindable(false), title, children, footer }: Props = $props();

  function close() { open = false; }
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape') close(); }} />

{#if open}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
    onclick={close}
    role="presentation"
  >
    <!-- Panel -->
    <div
      class="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md"
      onclick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 id="modal-title" class="text-base font-bold text-gray-900">{title}</h2>
        <button
          type="button"
          onclick={close}
          class="text-gray-400 hover:text-gray-600 transition-colors p-1"
          aria-label="Fermer"
        >
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Body -->
      <div class="px-5 py-4">
        {@render children()}
      </div>

      <!-- Footer -->
      {#if footer}
        <div class="px-5 py-4 border-t border-gray-100 flex justify-end gap-3">
          {@render footer()}
        </div>
      {/if}
    </div>
  </div>
{/if}
