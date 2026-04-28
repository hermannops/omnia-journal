<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import RadioGroup, { type RadioOption } from '$lib/components/RadioGroup.svelte';
  import Input from '$lib/components/Input.svelte';
  import Button from '$lib/components/Button.svelte';
  import { referentielsStore } from '$lib/stores/referentiels.svelte';
  import { loadPointsAFaire, hasPointsAFaire } from '$lib/stores/point-veille.svelte';
  import { createTransaction } from '$lib/db/transactions';
  import { addToast } from '$lib/stores/toast';
  import { formatFCFA } from '$lib/utils/format';

  onMount(async () => {
    await loadPointsAFaire();
    if (hasPointsAFaire()) goto('/point-veille', { replaceState: true });
  });

  // ── État du formulaire ──────────────────────────────────────────────
  let operateurId = $state('');
  let typeOperationId = $state('');
  let numeroClient = $state('');
  let nomClient = $state('');
  let montantInput = $state('');
  let soldeApresInput = $state('');
  let observation = $state('');
  let loading = $state(false);

  // ── Valeurs numériques dérivées ─────────────────────────────────────
  let montant = $derived(montantInput ? Math.round(Number(montantInput)) : null);
  let soldeApres = $derived(soldeApresInput !== '' ? Math.round(Number(soldeApresInput)) : null);

  // ── Erreurs de validation ───────────────────────────────────────────
  let erreurs = $state<Record<string, string>>({});

  // ── Options des RadioGroups depuis les référentiels ─────────────────
  const COULEUR_OPERATEUR: Record<string, RadioOption['color']> = {
    MTN: 'yellow',
    MOOV: 'blue',
    CELTIIS: 'green'
  };

  let operateurOptions = $derived<RadioOption[]>(
    referentielsStore.operateurs.map((op) => ({
      value: op.id,
      label: op.code,
      color: COULEUR_OPERATEUR[op.code] ?? 'neutral'
    }))
  );

  let typeOptions = $derived<RadioOption[]>(
    referentielsStore.typesOperation.map((t) => ({
      value: t.id,
      label: t.libelle,
      color: 'neutral' as const
    }))
  );

  // ── Bouton actif uniquement si champs obligatoires remplis ──────────
  let formulaireValide = $derived(
    operateurId !== '' &&
    typeOperationId !== '' &&
    montant !== null && montant > 0 &&
    soldeApres !== null && soldeApres >= 0
  );

  // ── Validation ──────────────────────────────────────────────────────
  function valider(): boolean {
    const e: Record<string, string> = {};
    if (!operateurId) e.operateur = 'Sélectionnez un opérateur';
    if (!typeOperationId) e.type = "Sélectionnez un type d'opération";
    if (montant === null || montant <= 0) e.montant = 'Le montant doit être supérieur à 0';
    if (soldeApres === null || soldeApres < 0) e.soldeApres = 'Le solde doit être 0 ou plus';
    erreurs = e;
    return Object.keys(e).length === 0;
  }

  // ── Soumission ──────────────────────────────────────────────────────
  async function enregistrer() {
    if (!valider() || loading) return;
    loading = true;

    try {
      const result = await createTransaction({
        operateur_id: operateurId,
        type_operation_id: typeOperationId,
        numero_client: numeroClient.trim() || undefined,
        nom_client: nomClient.trim() || undefined,
        montant: montant!,
        solde_apres: soldeApres!,
        observation: observation.trim() || undefined
      });

      addToast(
        result.isPending
          ? { message: 'Enregistrée hors ligne — sera synchronisée', type: 'info' }
          : { message: 'Transaction enregistrée', type: 'success' }
      );

      // Reset partiel : garde l'opérateur pour enchaîner les saisies
      typeOperationId = '';
      numeroClient = '';
      nomClient = '';
      montantInput = '';
      soldeApresInput = '';
      observation = '';
      erreurs = {};
    } catch (err) {
      addToast({
        message: err instanceof Error ? err.message : "Erreur lors de l'enregistrement",
        type: 'error'
      });
    } finally {
      loading = false;
    }
  }
</script>

<div class="min-h-screen bg-gray-50 pb-10">
  <!-- En-tête -->
  <div class="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
    <h1 class="text-lg font-bold text-gray-900">Saisie de transaction</h1>
  </div>

  <div class="px-4 pt-4 space-y-4 max-w-lg mx-auto">

    <!-- Opérateur -->
    <div class="bg-white rounded-2xl border border-gray-100 p-4">
      <RadioGroup
        label="Opérateur"
        options={operateurOptions}
        bind:value={operateurId}
        layout="horizontal"
        error={erreurs.operateur}
      />
    </div>

    <!-- Type d'opération -->
    <div class="bg-white rounded-2xl border border-gray-100 p-4">
      <RadioGroup
        label="Type d'opération"
        options={typeOptions}
        bind:value={typeOperationId}
        layout="grid"
        error={erreurs.type}
      />
    </div>

    <!-- Client -->
    <div class="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
      <Input
        label="Numéro client"
        type="tel"
        bind:value={numeroClient}
        placeholder="Ex : 01 96 09 22 42"
        autocomplete="off"
        inputmode="tel"
      />
      <Input
        label="Nom client"
        type="text"
        bind:value={nomClient}
        placeholder="Tel qu'affiché par l'opérateur"
        autocomplete="off"
      />
    </div>

    <!-- Montants -->
    <div class="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
      <div>
        <Input
          label="Montant"
          type="number"
          bind:value={montantInput}
          placeholder="0"
          required
          inputmode="numeric"
          error={erreurs.montant}
        />
        {#if montant !== null && montant > 0}
          <p class="text-gray-400 text-sm mt-1 text-right">{formatFCFA(montant)}</p>
        {/if}
      </div>

      <Input
        label="Solde après opération"
        type="number"
        bind:value={soldeApresInput}
        placeholder="0"
        required
        inputmode="numeric"
        hint="Recopier depuis le SMS reçu de l'opérateur"
        error={erreurs.soldeApres}
      />
    </div>

    <!-- Observation -->
    <div class="bg-white rounded-2xl border border-gray-100 p-4">
      <label for="observation" class="block text-sm font-medium text-gray-700 mb-1.5">
        Observation
      </label>
      <textarea
        id="observation"
        bind:value={observation}
        placeholder="Note libre (optionnel)"
        rows="2"
        class="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 bg-white
               focus:outline-none focus:ring-2 focus:ring-gray-300 resize-none"
      ></textarea>
    </div>

    <!-- Bouton enregistrer -->
    <Button
      variant="primary"
      size="lg"
      loading={loading}
      disabled={!formulaireValide}
      onclick={enregistrer}
    >
      {loading ? 'Enregistrement…' : 'Enregistrer'}
    </Button>

  </div>
</div>
