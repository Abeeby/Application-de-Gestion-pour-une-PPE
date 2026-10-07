// --- KAN-17 : suivi du budget en direct et alertes de depassement ---
// Fonctions PURES (aucun acces base, la date du jour est passee en
// parametre) : testees dans suivi.calcul.test.js.
//
// Regles d'alerte, par categorie :
//   depasse     consomme > budget
//   attention   consomme >= 90 % du budget, OU au rythme actuel la categorie
//               depassera son budget avant la fin de l'annee (projection,
//               seulement apres le 1er trimestre pour eviter les fausses
//               alertes de janvier)
//   hors_budget depense dans une categorie qui n'a pas de ligne au budget
//   ok          sinon

export const SEUIL_ATTENTION = 0.9
export const FRACTION_MIN_PROJECTION = 0.25 // 1er trimestre ecoule

const NIVEAUX_ORDRE = { depasse: 0, attention: 1, hors_budget: 2, ok: 3 }
const arrondir = (montant) => Math.round(montant * 100) / 100

/**
 * Part de l'annee deja ecoulee a la date donnee (0 a 1).
 * Annee passee -> 1, annee future -> 0.
 */
export function fractionEcoulee(annee, date = new Date()) {
  const anneeDate = date.getFullYear()
  if (annee < anneeDate) return 1
  if (annee > anneeDate) return 0

  const debut = Date.UTC(annee, 0, 1)
  const fin = Date.UTC(annee + 1, 0, 1)
  const aujourdhui = Date.UTC(anneeDate, date.getMonth(), date.getDate() + 1) // jour en cours compte
  return Math.min(1, (aujourdhui - debut) / (fin - debut))
}

/** Niveau d'une categorie budgetee. */
export function niveauCategorie({ budget, consomme, fraction }) {
  if (consomme > budget) return 'depasse'
  if (consomme >= budget * SEUIL_ATTENTION) return 'attention'
  if (fraction >= FRACTION_MIN_PROJECTION && fraction < 1 && consomme / fraction > budget) return 'attention'
  return 'ok'
}

/**
 * Etat du budget par categorie + liste des alertes.
 * @param {object} donnees
 * @param {number} donnees.annee
 * @param {{categorie: string, montant: number}[]} donnees.lignes lignes du budget
 * @param {{categorie: string, montant: number}[]} donnees.depenses depenses de l'annee par categorie
 * @param {Date} [donnees.date] date du calcul (injectable pour les tests)
 */
export function calculerSuivi({ annee, lignes, depenses, date = new Date() }) {
  const fraction = fractionEcoulee(annee, date)
  const depenseParCategorie = new Map(depenses.map((d) => [d.categorie, Number(d.montant)]))

  const categories = lignes.map((ligne) => {
    const budget = Number(ligne.montant)
    const consomme = depenseParCategorie.get(ligne.categorie) ?? 0
    const projection = fraction > 0 ? arrondir(consomme / fraction) : consomme

    return {
      categorie: ligne.categorie,
      budget,
      consomme: arrondir(consomme),
      restant: arrondir(budget - consomme),
      taux: budget > 0 ? Math.round((consomme / budget) * 100) : 0,
      projection,
      niveau: niveauCategorie({ budget, consomme, fraction }),
    }
  })

  const categoriesBudgetees = new Set(lignes.map((ligne) => ligne.categorie))
  const horsBudget = depenses
    .filter((d) => !categoriesBudgetees.has(d.categorie) && Number(d.montant) > 0)
    .map((d) => ({
      categorie: d.categorie,
      budget: 0,
      consomme: arrondir(Number(d.montant)),
      restant: arrondir(-Number(d.montant)),
      taux: null,
      projection: null,
      niveau: 'hors_budget',
    }))

  const toutes = [...categories, ...horsBudget].sort(
    (a, b) => NIVEAUX_ORDRE[a.niveau] - NIVEAUX_ORDRE[b.niveau] || a.categorie.localeCompare(b.categorie, 'fr'),
  )

  const totalBudget = arrondir(categories.reduce((total, c) => total + c.budget, 0))
  const totalConsomme = arrondir(categories.reduce((total, c) => total + c.consomme, 0))

  return {
    annee,
    fractionEcoulee: Math.round(fraction * 1000) / 1000,
    categories: toutes,
    alertes: toutes.filter((c) => c.niveau !== 'ok').map(versAlerte),
    totaux: {
      budget: totalBudget,
      consomme: totalConsomme,
      restant: arrondir(totalBudget - totalConsomme),
      taux: totalBudget > 0 ? Math.round((totalConsomme / totalBudget) * 100) : 0,
      horsBudget: arrondir(horsBudget.reduce((total, c) => total + c.consomme, 0)),
    },
  }
}

const formatChf = (montant) =>
  `${new Intl.NumberFormat('fr-CH', { maximumFractionDigits: 0 }).format(montant)} CHF`

/** Transforme une categorie a probleme en message lisible. */
export function versAlerte(categorie) {
  const { niveau, categorie: nom, budget, consomme, taux, projection } = categorie

  if (niveau === 'depasse') {
    return { niveau, categorie: nom, message: `${nom} : budget dépassé de ${formatChf(consomme - budget)} (${taux} % consommé)` }
  }
  if (niveau === 'hors_budget') {
    return { niveau, categorie: nom, message: `${nom} : ${formatChf(consomme)} dépensés sans ligne au budget` }
  }
  if (consomme >= budget * SEUIL_ATTENTION) {
    return { niveau, categorie: nom, message: `${nom} : ${taux} % du budget déjà consommé` }
  }
  return {
    niveau,
    categorie: nom,
    message: `${nom} : au rythme actuel, ${formatChf(projection)} prévus pour un budget de ${formatChf(budget)}`,
  }
}
