<script lang="ts">
  import type { LigneJournal } from '$lib/db/journal';
  import type { PendingTransaction } from '$lib/offline/queue';
  import { formatFCFA, formatHeure } from '$lib/utils/format';

  type Props = {
    transaction: LigneJournal | (PendingTransaction & { _pending: true });
    readonly?: boolean;
  };

  let { transaction, readonly = true }: Props = $props();

  const isPending = '_pending' in transaction;

  const COULEUR: Record<string, string> = {
    MTN:     'bg-yellow-100 text-yellow-800',
    MOOV:    'bg-blue-100 text-blue-800',
    CELTIIS: 'bg-green-100 text-green-800'
  };

  const operateurCode = isPending
    ? '…'
    : (transaction as LigneJournal).operateur_code;

  const typeLibelle = isPending
    ? '…'
    : (transaction as LigneJournal).type_libelle;

  const horodatage = isPending
    ? (transaction as PendingTransaction).created_at_local
    : (transaction as LigneJournal).horodatage;

  const statut = isPending ? 'pending' : (transaction as LigneJournal).statut;
  const annulee = statut === 'annulee';

  const badgeClass = COULEUR[operateurCode] ?? 'bg-gray-100 text-gray-700';
</script>

<div class="flex items-start gap-3 py-3 px-1
  {annulee ? 'opacity-50' : ''}
  {isPending ? 'italic' : ''}">

  <!-- Heure -->
  <span class="text-xs text-gray-400 w-10 pt-0.5 shrink-0">
    {formatHeure(horodatage)}
  </span>

  <!-- Badge opérateur -->
  <span class="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 {badgeClass}">
    {operateurCode}
  </span>

  <!-- Centre : type + client -->
  <div class="flex-1 min-w-0">
    <p class="text-sm font-medium text-gray-800 {annulee ? 'line-through' : ''}">
      {typeLibelle}
    </p>
    {#if !isPending}
      {@const ligne = transaction as LigneJournal}
      {#if ligne.numero_client || ligne.nom_client}
        <p class="text-xs text-gray-500 truncate">
          {[ligne.numero_client, ligne.nom_client].filter(Boolean).join(' · ')}
        </p>
      {/if}
    {/if}
    {#if isPending}
      <p class="text-xs text-orange-500 flex items-center gap-1 mt-0.5">
        <svg class="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        En attente de synchronisation
      </p>
    {/if}
  </div>

  <!-- Droite : montant + solde -->
  <div class="text-right shrink-0">
    <p class="text-sm font-bold text-gray-900 {annulee ? 'line-through' : ''}">
      {formatFCFA(transaction.montant)}
    </p>
    {#if !isPending}
      <p class="text-xs text-gray-400">{formatFCFA((transaction as LigneJournal).solde_apres)}</p>
    {/if}
  </div>
</div>
