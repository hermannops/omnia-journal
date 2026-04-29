import * as XLSX from 'xlsx';
import type { TransactionAdmin } from '$lib/db/admin';
import { formatDate, formatHeure } from './format';

const NUM_FMT = '#,##0';

function applyNumFmt(ws: XLSX.WorkSheet, cols: number[]) {
  const ref = ws['!ref'];
  if (!ref) return;
  const range = XLSX.utils.decode_range(ref);
  for (let R = range.s.r + 1; R <= range.e.r; R++) {
    for (const C of cols) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      if (ws[addr]) ws[addr].z = NUM_FMT;
    }
  }
}

export function exportTransactionsToExcel(
  transactions: TransactionAdmin[],
  dateDebut: string,
  dateFin: string
) {
  const wb = XLSX.utils.book_new();

  // ── Feuille Transactions ──────────────────────────────────────────
  const txRows = transactions.map((t) => ({
    Date: formatDate(t.horodatage),
    Heure: formatHeure(t.horodatage),
    Agent: t.agent?.nom ?? '',
    Opérateur: t.operateur?.nom ?? '',
    Type: t.type_operation?.libelle ?? '',
    'Numéro client': t.numero_client ?? '',
    'Nom client': t.nom_client ?? '',
    'Montant (FCFA)': t.montant,
    'Solde après (FCFA)': t.solde_apres,
    Observation: '',
    Statut: t.statut === 'validee' ? 'Validée' : 'Annulée',
    'Motif annulation': t.motif_annulation ?? ''
  }));

  const wsTx = XLSX.utils.json_to_sheet(txRows);
  wsTx['!cols'] = [
    { wch: 12 }, { wch: 8 },  { wch: 22 }, { wch: 12 }, { wch: 22 },
    { wch: 16 }, { wch: 22 }, { wch: 16 }, { wch: 16 }, { wch: 22 },
    { wch: 10 }, { wch: 32 }
  ];
  // Montant = col 7, Solde après = col 8
  applyNumFmt(wsTx, [7, 8]);
  XLSX.utils.book_append_sheet(wb, wsTx, 'Transactions');

  // ── Feuille Synthèse ──────────────────────────────────────────────
  const synthMap = new Map<string, { operateur: string; type: string; count: number; total: number }>();

  for (const t of transactions) {
    const key = `${t.operateur?.code ?? ''}__${t.type_operation?.code ?? ''}`;
    if (!synthMap.has(key)) {
      synthMap.set(key, {
        operateur: t.operateur?.nom ?? '',
        type: t.type_operation?.libelle ?? '',
        count: 0,
        total: 0
      });
    }
    const entry = synthMap.get(key)!;
    entry.count++;
    entry.total += t.montant;
  }

  const synthRows = Array.from(synthMap.values())
    .sort((a, b) => a.operateur.localeCompare(b.operateur) || a.type.localeCompare(b.type))
    .map((e) => ({
      Opérateur: e.operateur,
      'Type d\'opération': e.type,
      Nombre: e.count,
      'Montant total (FCFA)': e.total
    }));

  const wsSynth = XLSX.utils.json_to_sheet(synthRows.length > 0 ? synthRows : [{}]);
  wsSynth['!cols'] = [{ wch: 14 }, { wch: 24 }, { wch: 10 }, { wch: 20 }];
  // Montant total = col 3
  applyNumFmt(wsSynth, [3]);
  XLSX.utils.book_append_sheet(wb, wsSynth, 'Synthèse');

  XLSX.writeFile(wb, `omnia-journal-${dateDebut}_${dateFin}.xlsx`);
}
