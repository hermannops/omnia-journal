const formatterFCFA = new Intl.NumberFormat('fr-FR');

export function formatFCFA(montant: number | bigint): string {
  const n = typeof montant === 'bigint' ? Number(montant) : montant;
  return formatterFCFA.format(n) + '\u00a0F CFA';
}

export function formatHeure(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(d);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(d);
}
