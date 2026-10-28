// Regles de validation partagees par tous les modules (depenses, revenus,
// projets). Avant, chaque module verifiait les dates et montants a sa
// facon : "hier" ou "2026-02-31" etaient acceptes puis faisaient planter
// MySQL (erreur 500 au lieu d'un message clair 400).

// Plus grand montant que la colonne DECIMAL(10,2) peut stocker
export const MONTANT_MAX = 99999999.99

/**
 * Vrai si `valeur` est une date du calendrier au format AAAA-MM-JJ.
 * "2026-02-31" est refusee (new Date() l'aurait transformee en 3 mars).
 */
export function estDateValide(valeur) {
  if (typeof valeur !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valeur)) return false
  const [annee, mois, jour] = valeur.split('-').map(Number)
  const date = new Date(Date.UTC(annee, mois - 1, jour))
  return date.getUTCFullYear() === annee && date.getUTCMonth() === mois - 1 && date.getUTCDate() === jour
}

/**
 * Vrai si `valeur` est un montant en CHF > 0, au plus 2 decimales,
 * et qui tient dans la colonne SQL. Accepte "12,50" (virgule).
 */
export function estMontantValide(valeur) {
  if (valeur === null || valeur === undefined || valeur === '') return false
  const nombre = typeof valeur === 'number' ? valeur : Number(String(valeur).trim().replace(',', '.'))
  if (!Number.isFinite(nombre) || nombre <= 0 || nombre > MONTANT_MAX) return false
  // Pas plus de 2 decimales (les centimes) : 12.345 est refuse
  return Math.abs(Math.round(nombre * 100) - nombre * 100) < 1e-6
}

/** Convertit un montant valide ("12,50", "12.5", 12.5) en nombre pour SQL. */
export function versMontant(valeur) {
  return typeof valeur === 'number' ? valeur : Number(String(valeur).trim().replace(',', '.'))
}
