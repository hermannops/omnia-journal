<script lang="ts">
  interface Props {
    value: string;
    maxLength?: number;
  }

  let { value = $bindable(''), maxLength = 6 }: Props = $props();

  function press(digit: string) {
    if (value.length < maxLength) value += digit;
  }

  function erase() {
    value = value.slice(0, -1);
  }
</script>

<div class="flex flex-col items-center gap-4">
  <!-- Points indicateurs -->
  <div class="flex gap-3">
    {#each Array(maxLength) as _, i}
      <div
        class="w-3 h-3 rounded-full border-2 transition-colors
          {i < value.length ? 'bg-gray-900 border-gray-900' : 'border-gray-300'}"
      ></div>
    {/each}
  </div>

  <!-- Clavier 3×4 -->
  <div class="grid grid-cols-3 gap-3">
    {#each ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as digit}
      <button
        type="button"
        onclick={() => press(digit)}
        class="w-16 h-16 rounded-2xl bg-gray-100 text-xl font-semibold text-gray-900
               active:bg-gray-200 transition-colors select-none"
      >
        {digit}
      </button>
    {/each}

    <!-- Ligne bas : vide | 0 | ⌫ -->
    <div></div>

    <button
      type="button"
      onclick={() => press('0')}
      class="w-16 h-16 rounded-2xl bg-gray-100 text-xl font-semibold text-gray-900
             active:bg-gray-200 transition-colors select-none"
    >
      0
    </button>

    <button
      type="button"
      onclick={erase}
      class="w-16 h-16 rounded-2xl bg-gray-100 text-xl font-semibold text-gray-500
             active:bg-gray-200 transition-colors select-none"
      aria-label="Effacer"
    >
      ⌫
    </button>
  </div>
</div>
