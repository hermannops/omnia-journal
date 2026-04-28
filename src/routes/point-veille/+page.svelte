<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { goto } from '$app/navigation';
  import { agentStore } from '$lib/stores/agent';
  import { networkStore } from '$lib/stores/network.svelte';
  import { pointVeilleStore, loadPointsAFaire, hasPointsAFaire, markPointsVeilleValidated } from '$lib/stores/point-veille.svelte';
  import { createPointsVeille } from '$lib/db/point-veille';
  import { enqueuePointVeille } from '$lib/offline/queue-point-veille';
  import { addToast } from '$lib/stores/toast';
  import Input from '$lib/components/Input.svelte';
  import Button from '$lib/components/Button.svelte';
  import { formatFCFA, formatDate } from '$lib/utils/format';

  let checking = $state(true);

  onMount(async () => {
    await loadPointsAFaire();
    if (!hasPointsAFaire()) {
      goto('/saisie', { replaceState: true });
      return;
    }
    // Initialise les clés pour éviter bind:value={undefined}
    for (const p of pointVeilleStore.aFaire) {
      soldesReels[p.operateur_id] = '';
      commentaires[p.operateur_id] = '';
    }
    checking = false;
  });

  const COULEUR_BG: Record<string, string> = {
    MTN:     'bg-yellow-50 border-yellow-200',
    MOOV:    'bg-blue-50 border-blue-200',
    CELTIIS: 'bg-green-50 border-green-200'
  };
  const COULEUR_TITRE: Record<string, string> = {
    MTN:     'text-yellow-800',
    MOOV:    'text-blue-800',
    CELTIIS: 'text-green-800'
  };

  let points = $derived(pointVeilleStore.aFaire);

  // solde réel saisi par opérateur_id → string
  let soldesReels = $state<Record<string, string>>({});
  let commentaires = $state<Record<string, string>>({});
  let loading = $state(false);

  // Valeur numérique parsée ou null
  function soldeReel(operateurId: string): number | null {
    const v = soldesReels[operateurId];
    if (v === undefined || v === '') return null;
    const n = Math.round(Number(v));
    return isNaN(n) ? null : n;
  }

  function ecart(operateurId: string, soldeTheorique: number | null): number | null {
    const reel = soldeReel(operateurId);
    if (reel === null) return null;
    return reel - (soldeTheorique ?? 0);
  }

  let tousRenseignes = $derived(
    points.length > 0 &&
    points.every((p) => soldeReel(p.operateur_id) !== null)
  );

  async function valider() {
    if (!tousRenseignes || loading) return;
    loading = true;

    const agent = get(agentStore);
    if (!agent) { loading = false; return; }

    const items = points.map((p) => ({
      operateur_id: p.operateur_id,
      date_concernee: p.date_concernee,
      solde_theorique: p.solde_theorique,
      solde_reel_valide: soldeReel(p.operateur_id)!,
      commentaire: commentaires[p.operateur_id]?.trim() || undefined
    }));

    try {
      if (networkStore.online) {
        await createPointsVeille(agent.id, items);
        addToast({ message: 'Soldes validés', type: 'success' });
      } else {
        await enqueuePointVeille(agent.id, items);
        addToast({
          message: 'Validés hors ligne — seront synchronisés à la reconnexion',
          type: 'info'
        });
      }
      markPointsVeilleValidated();
      goto('/saisie', { replaceState: true });
    } catch (err) {
      addToast({
        message: err instanceof Error ? err.message : 'Erreur lors de la validation',
        type: 'error'
      });
    } finally {
      loading = false;
    }
  }
</script>

{#if checking}
  <div class="min-h-screen bg-gray-50 flex items-center justify-center">
    <p class="text-gray-400 text-sm">Vérification…</p>
  </div>
{:else}
<div class="min-h-screen bg-gray-50 pb-10">

  <!-- En-tête -->
  <div class="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
    <div class="max-w-lg mx-auto">
      <h1 class="text-lg font-bold text-gray-900">Validation des soldes de la veille</h1>
      <p class="text-xs text-gray-400 mt-0.5">
        Confirme les soldes affichés ce matin par chaque opérateur
        · Hier : {formatDate(new Date(Date.now() - 86_400_000))}
      </p>
    </div>
  </div>

  <div class="px-4 pt-4 space-y-4 max-w-lg mx-auto">

    {#each points as point (point.operateur_id)}
      {@const e = ecart(point.operateur_id, point.solde_theorique)}
      {@const showCommentaire = e !== null && e !== 0}

      <div class="rounded-2xl border p-4 space-y-4 {COULEUR_BG[point.operateur_code] ?? 'bg-gray-50 border-gray-200'}">

        <p class="font-bold {COULEUR_TITRE[point.operateur_code] ?? 'text-gray-800'}">
          {point.operateur_nom}
        </p>

        <!-- Solde théorique -->
        <div class="bg-white/60 rounded-xl px-4 py-2.5">
          <p class="text-xs text-gray-500">Solde théorique attendu</p>
          <p class="text-xl font-bold text-gray-900">
            {point.solde_theorique !== null ? formatFCFA(point.solde_theorique) : '—'}
          </p>
        </div>

        <!-- Saisie solde réel -->
        <Input
          label="Solde affiché ce matin"
          type="number"
          placeholder={point.solde_theorique !== null ? String(point.solde_theorique) : '0'}
          inputmode="numeric"
          required
          bind:value={soldesReels[point.operateur_id]}
        />

        <!-- Écart temps réel -->
        {#if e !== null && e !== 0}
          <p class="text-sm font-semibold text-orange-600">
            Écart : {e > 0 ? '+' : ''}{formatFCFA(e)}
          </p>
        {:else if e === 0}
          <p class="text-sm text-green-600 font-medium">Aucun écart ✓</p>
        {/if}

        <!-- Commentaire (visible si écart) -->
        {#if showCommentaire}
          <div>
            <label for="commentaire-{point.operateur_id}" class="block text-sm font-medium text-gray-700 mb-1.5">
              Commentaire sur l'écart
            </label>
            <textarea
              id="commentaire-{point.operateur_id}"
              bind:value={commentaires[point.operateur_id]}
              placeholder="Expliquer l'écart (optionnel)"
              rows="2"
              class="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 bg-white
                     focus:outline-none focus:ring-2 focus:ring-gray-300 resize-none text-sm"
            ></textarea>
          </div>
        {/if}
      </div>
    {/each}

    <Button
      variant="primary"
      size="lg"
      loading={loading}
      disabled={!tousRenseignes}
      onclick={valider}
    >
      {loading ? 'Validation…' : 'Valider tous les soldes'}
    </Button>

    {#if !networkStore.online}
      <p class="text-center text-xs text-orange-500">
        Hors ligne — les soldes seront envoyés à la reconnexion
      </p>
    {/if}

  </div>
</div>
{/if}
