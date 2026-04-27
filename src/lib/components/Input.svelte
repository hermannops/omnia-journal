<script lang="ts">
  interface Props {
    label?: string;
    type?: string;
    value?: string;
    placeholder?: string;
    required?: boolean;
    error?: string;
    hint?: string;
    autocomplete?: import('svelte/elements').HTMLInputAttributes['autocomplete'];
    inputmode?: import('svelte/elements').HTMLInputAttributes['inputmode'];
    id?: string;
  }

  let {
    label,
    type = 'text',
    value = $bindable(''),
    placeholder,
    required = false,
    error,
    hint,
    autocomplete,
    inputmode,
    id
  }: Props = $props();

  const inputId = $derived(id ?? (label ? label.toLowerCase().replace(/[^a-z0-9]+/g, '-') : undefined));
</script>

<div>
  {#if label}
    <label for={inputId} class="block text-sm font-medium text-gray-700 mb-1.5">
      {label}{#if required}<span class="text-red-500 ml-0.5">*</span>{/if}
    </label>
  {/if}

  <input
    id={inputId}
    {type}
    bind:value
    {placeholder}
    {autocomplete}
    {inputmode}
    class="w-full px-4 py-3 border rounded-xl text-gray-900 bg-white
           focus:outline-none focus:ring-2 transition-colors
           {error
             ? 'border-red-400 focus:ring-red-200'
             : 'border-gray-200 focus:ring-gray-300'}"
  />

  {#if error}
    <p class="text-red-500 text-xs mt-1">{error}</p>
  {:else if hint}
    <p class="text-gray-400 text-xs mt-1">{hint}</p>
  {/if}
</div>
