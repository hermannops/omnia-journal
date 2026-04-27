<script lang="ts">
  export type RadioOption = {
    value: string;
    label: string;
    color?: 'yellow' | 'blue' | 'green' | 'neutral';
  };

  interface Props {
    options: RadioOption[];
    value?: string;
    label?: string;
    layout?: 'horizontal' | 'grid';
    error?: string;
  }

  let { options, value = $bindable(''), label, layout = 'horizontal', error }: Props = $props();

  // Toutes les classes sont écrites en entier pour que Tailwind les inclue
  const selectedClass = {
    yellow: 'bg-yellow-400 border-yellow-400 text-yellow-900',
    blue: 'bg-blue-500 border-blue-500 text-white',
    green: 'bg-green-500 border-green-500 text-white',
    neutral: 'bg-gray-800 border-gray-800 text-white'
  };

  const unselectedClass =
    'bg-white border-gray-200 text-gray-700 active:bg-gray-50';
</script>

{#if label}
  <p class="text-sm font-medium text-gray-700 mb-2">
    {label}
  </p>
{/if}

<div
  class="{layout === 'grid'
    ? 'grid grid-cols-3 gap-2'
    : 'flex gap-2'}"
>
  {#each options as option}
    <button
      type="button"
      onclick={() => (value = option.value)}
      class="flex-1 min-h-[60px] flex items-center justify-center rounded-xl border-2
             font-semibold text-sm transition-colors select-none
             {value === option.value
               ? selectedClass[option.color ?? 'neutral']
               : unselectedClass}"
    >
      {option.label}
    </button>
  {/each}
</div>

{#if error}
  <p class="text-red-500 text-xs mt-1">{error}</p>
{/if}
