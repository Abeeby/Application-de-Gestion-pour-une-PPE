// Formats d'affichage communs a toutes les pages.
//
// Avant, chaque page formatait a sa facon ("1500.5 CHF", "1 500,00 CHF",
// "CHF 1'500", dates ISO brutes...). Une seule fonction par format garde
// l'application coherente.

const formatChfEntier = new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 })
const formatChfCentimes = new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF', minimumFractionDigits: 2 })

/** 1500.5 -> "CHF 1’500.50" (ou "CHF 1’501" avec centimes = false) */
export function formatChf(montant: number | string, centimes = true): string {
  const valeur = Number(montant) || 0
  return (centimes ? formatChfCentimes : formatChfEntier).format(valeur)
}

/**
 * "2026-08-12" -> "12.08.2026".
 * On decoupe la chaine au lieu de faire new Date('2026-08-12') : ce dernier
 * est lu comme minuit UTC et peut afficher la veille selon le fuseau.
 */
export function formatDate(dateIso: string | null | undefined): string {
  if (!dateIso) return '—'
  const correspondance = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateIso)
  return correspondance ? `${correspondance[3]}.${correspondance[2]}.${correspondance[1]}` : dateIso
}

/** Date du jour, ex. "mercredi 28 octobre 2026" */
export function dateDuJour(): string {
  return new Intl.DateTimeFormat('fr-CH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())
}

/** Date du jour au format AAAA-MM-JJ, en heure LOCALE (toISOString() donne l'heure UTC). */
export function aujourdhuiIso(): string {
  const maintenant = new Date()
  const mois = String(maintenant.getMonth() + 1).padStart(2, '0')
  const jour = String(maintenant.getDate()).padStart(2, '0')
  return `${maintenant.getFullYear()}-${mois}-${jour}`
}
