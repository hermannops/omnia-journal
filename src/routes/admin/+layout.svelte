<script lang="ts">
  import type { Snippet } from 'svelte';
  import { page } from '$app/state';

  let { children }: { children: Snippet } = $props();
  let pathname = $derived(page.url.pathname);

  const liens = [
    { href: '/admin',              label: 'Dashboard'     },
    { href: '/admin/transactions', label: 'Transactions'  },
    { href: '/admin/agents',       label: 'Agents'        },
    { href: '/admin/export',       label: 'Export'        }
  ];
</script>

<div class="min-h-screen bg-gray-50">
  <!-- Sous-nav admin -->
  <div class="bg-white border-b border-gray-100 px-4">
    <div class="flex items-center gap-1 max-w-5xl mx-auto overflow-x-auto">
      {#each liens as lien}
        <a
          href={lien.href}
          class="px-3 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
            {pathname === lien.href
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'}"
        >
          {lien.label}
        </a>
      {/each}
    </div>
  </div>

  <div class="max-w-5xl mx-auto px-4 py-6">
    {@render children()}
  </div>
</div>
