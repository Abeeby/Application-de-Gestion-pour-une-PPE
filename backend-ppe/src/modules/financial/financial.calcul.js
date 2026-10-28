// KAN-26 : calculs du resume financier, sans base de donnees.
//
// Les fonctions de ce fichier recoivent des nombres deja lus en base et
// renvoient le resultat : elles sont donc testables unitairement
// (financial.calcul.test.js), comme charges.calcul.js pour KAN-22.

/** Arrondit a 2 decimales (centimes) pour eviter les 0.30000000000000004 */
function arrondir(montant) {
  return Math.round(montant * 100) / 100
}

/**
 * Resume financier d'UN exercice (une annee).
 *
 * Avant ce correctif, le resume additionnait toutes les annees (2022 a 2026)
 * et comparait les depenses aux RECETTES : le tableau de bord affichait un
 * solde de -307 430 et un budget utilise a 5224 %.
 *
 * @param {object} donnees
 * @param {number} donnees.annee
 * @param {number} donnees.recettes total des recettes de l'annee
 * @param {number} donnees.depenses total des depenses de l'annee
 * @param {{planned: number, used: number}[]} donnees.lignesBudget lignes du
 *   budget de l'annee (prevu, depense reelle de la categorie)
 */
export function calculerResume({ annee, recettes, depenses, lignesBudget = [] }) {
  const totalIncome = arrondir(Number(recettes) || 0)
  const totalExpenses = arrondir(Number(depenses) || 0)
  const budgetTotal = arrondir(lignesBudget.reduce((somme, ligne) => somme + (Number(ligne.planned) || 0), 0))
  const budgetUtilise = arrondir(lignesBudget.reduce((somme, ligne) => somme + (Number(ligne.used) || 0), 0))

  return {
    annee,
    totalIncome,
    totalExpenses,
    // Solde de l'exercice : ce qui reste des recettes de l'annee
    totalBalance: arrondir(totalIncome - totalExpenses),
    // Budget vote pour l'annee et part deja consommee (categories budgetees)
    budgetTotal,
    budgetUtilise,
    budgetRestant: arrondir(budgetTotal - budgetUtilise),
    budgetUsage: budgetTotal > 0 ? Math.round((budgetUtilise / budgetTotal) * 100) : 0,
    activeAccounts: 1,
  }
}

/**
 * Lit le parametre ?annee= d'une requete.
 * @returns {number|null} l'annee, l'annee en cours si absent, null si invalide
 */
export function lireAnnee(valeur, anneeCourante = new Date().getFullYear()) {
  if (valeur === undefined || valeur === '') return anneeCourante
  const annee = Number(valeur)
  return Number.isInteger(annee) && annee >= 2000 && annee <= 2100 ? annee : null
}

/**
 * Valide une ligne de budget envoyee a POST /api/financial/budgets.
 * @returns {string[]} la liste des erreurs (vide si tout est bon)
 */
export function validerLigneBudget({ category, planned } = {}) {
  const erreurs = []

  if (typeof category !== 'string' || category.trim() === '') {
    erreurs.push('La catégorie est obligatoire')
  }

  if (typeof planned !== 'number' || !Number.isFinite(planned) || planned <= 0) {
    erreurs.push('Le montant prévu doit être un nombre supérieur à 0')
  }

  return erreurs
}

/**
 * Evolution mensuelle de l'exercice pour le graphique du tableau de bord.
 * Transforme les totaux SQL (un par mois et par type, mois sans mouvement
 * absents) en 12 mois complets, de janvier a decembre.
 * @param {{mois: number, type: 'recette'|'depense', total: number|string}[]} lignes
 * @returns {{mois: number, recettes: number, depenses: number}[]} 12 elements
 */
export function construireEvolutionMensuelle(lignes = []) {
  const mois = Array.from({ length: 12 }, (_, index) => ({ mois: index + 1, recettes: 0, depenses: 0 }))

  for (const ligne of lignes) {
    const numero = Number(ligne.mois)
    if (!Number.isInteger(numero) || numero < 1 || numero > 12) continue
    const cle = ligne.type === 'recette' ? 'recettes' : ligne.type === 'depense' ? 'depenses' : null
    if (!cle) continue
    mois[numero - 1][cle] = arrondir(mois[numero - 1][cle] + (Number(ligne.total) || 0))
  }

  return mois
}
