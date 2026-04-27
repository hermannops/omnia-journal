<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    variant?: 'primary' | 'secondary' | 'danger' | 'success';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    loading?: boolean;
    type?: 'button' | 'submit' | 'reset';
    onclick?: () => void;
    children: Snippet;
  }

  let {
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    type = 'button',
    onclick,
    children
  }: Props = $props();

  const variantClass = {
    primary: 'bg-blue-600 text-white active:bg-blue-800 disabled:bg-blue-300',
    secondary: 'bg-white text-gray-700 border border-gray-300 active:bg-gray-100 disabled:opacity-50',
    danger: 'bg-red-600 text-white active:bg-red-800 disabled:bg-red-300',
    success: 'bg-green-600 text-white active:bg-green-800 disabled:bg-green-300'
  };

  const sizeClass = {
    sm: 'px-3 py-1.5 text-sm rounded-lg',
    md: 'px-5 py-2.5 text-base rounded-xl',
    lg: 'px-6 py-4 text-lg rounded-2xl'
  };
</script>

<button
  {type}
  disabled={disabled || loading}
  {onclick}
  class="font-semibold transition-colors select-none
    {variantClass[variant]} {sizeClass[size]}"
>
  {#if loading}
    <span class="inline-flex items-center gap-2">
      <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      {@render children()}
    </span>
  {:else}
    {@render children()}
  {/if}
</button>
