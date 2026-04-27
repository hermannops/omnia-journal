<script lang="ts">
  import PinPad from '$lib/components/PinPad.svelte';
  import { login } from '$lib/auth';
  import { goto } from '$app/navigation';

  let numero = $state('');
  let pin = $state('');
  let erreur = $state('');
  let chargement = $state(false);

  // Soumettre automatiquement dès que les 6 chiffres sont saisis
  $effect(() => {
    if (pin.length === 6 && numero.trim() && !chargement) {
      soumettre();
    }
  });

  async function soumettre() {
    if (!numero.trim() || pin.length !== 6 || chargement) return;
    chargement = true;
    erreur = '';

    const resultat = await login(numero.trim().toUpperCase(), pin);
    chargement = false;

    if (resultat.success) {
      goto('/saisie');
    } else {
      erreur = resultat.error ?? 'Erreur inconnue';
      pin = '';
    }
  }
</script>

<div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
  <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-sm">

    <h1 class="text-2xl font-bold text-gray-900 text-center mb-1">OMNIA Journal</h1>
    <p class="text-sm text-gray-400 text-center mb-8">Connectez-vous pour continuer</p>

    <!-- Numéro agent -->
    <div class="mb-6">
      <label for="numero" class="block text-sm font-medium text-gray-700 mb-2">
        Numéro agent
      </label>
      <input
        id="numero"
        type="text"
        bind:value={numero}
        placeholder="ex : AG002"
        autocomplete="off"
        spellcheck="false"
        class="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 text-center
               text-lg tracking-widest uppercase placeholder:normal-case placeholder:tracking-normal
               focus:outline-none focus:ring-2 focus:ring-gray-300"
      />
    </div>

    <!-- PinPad -->
    <div class="mb-6">
      <p class="text-sm font-medium text-gray-700 text-center mb-4">Code PIN</p>
      <PinPad bind:value={pin} maxLength={6} />
    </div>

    <!-- Erreur -->
    {#if erreur}
      <p class="text-red-500 text-sm text-center mb-4">{erreur}</p>
    {/if}

    <!-- Bouton de secours si auto-submit ne se déclenche pas -->
    <button
      type="button"
      onclick={soumettre}
      disabled={chargement || !numero.trim() || pin.length !== 6}
      class="w-full py-3 bg-gray-900 text-white font-semibold rounded-xl
             disabled:opacity-40 active:bg-gray-700 transition-colors"
    >
      {chargement ? 'Connexion en cours…' : 'Se connecter'}
    </button>

  </div>
</div>
