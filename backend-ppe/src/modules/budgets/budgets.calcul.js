// --- KAN-15 : creation et approbation du budget annuel ---
// Fonctions PURES (aucun acces base), comme charges.calcul.js (KAN-22) :
// le repository lit les donnees, les routes assemblent, ce fichier calcule.
// Tests : budgets.calcul.test.js

import { ventilerDepense } from '../charges/charges.calcul.js'

// ---------------------------------------------------------------------------
// 1. Cycle de vie du budget : brouillon -> soumis -> approuve
// ---------------------------------------------------------------------------

export const STATUTS_BUDGET = ['brouillon', 'soumis', 'approuve', 'rejete']

/**
 * Actions possibles depuis chaque statut. Tout le reste est interdit (409).
 *
 *   brouillon --soumettre--> soumis --approuver--> approuve (verrouille)
 *       ^                       |
 *       |                    rejeter
 *       |                       v
 *       +----retravailler---- rejete
 */
export const TRANSITIONS_BUDGET = {
  brouillon: { soumettre: 'soumis' },
  soumis: { approuver: 'approuve', rejeter: 'rejete' },
  rejete: { retravailler: 'brouillon' },
  approuve: {},
}

/** Libelles affiches dans l'interface */
export const LIBELLES_STATUT = {
  brouillon: 'Brouillon',
  soumis: 'Soumis à l’assemblée',
  approuve: 'Approuvé',
  rejete: 'Rejeté',
}

/** Actions autorisees depuis un statut (pour afficher les bons boutons). */
export function actionsPossibles(statut) {
  return Object.keys(TRANSITIONS_BUDGET[statut] ?? {})
}

/**
 * Calcule le nouveau statut apres une action.
 * @returns {string|null} le nouveau statut, ou null si l'action est interdite
 */
export function appliquerTransition(statut, action) {
  return TRANSITIONS_BUDGET[statut]?.[action] ?? null
}

/** Seul un brouillon peut etre modifie : un budget soumis ou approuve est fige. */
export function estModifiable(statut) {
  return statut === 'brouillon'
}

// ---------------------------------------------------------------------------
// 2. Generation automatique a partir de l'historique des depenses
// ---------------------------------------------------------------------------

export const NB_ANNEES_REFERENCE = 3
export const INDEXATION_PAR_DEFAUT = 0.02 // +2 % (rencherissement)

/** Arrondit vers le haut a la dizaine de francs : un budget se presente en chiffres ronds. */
const arrondirDizaineSup = (montant) => Math.ceil(montant / 10) * 10

/**
 * Annees de reference pour estimer le budget de `anneeCible` : les
 * `nbAnnees` dernieres annees COMPLETES. L'annee en cours n'est pas finie
 * (en octobre, il manque 3 mois de depenses) : la compter sous-estimerait le
 * budget. Ex. en 2026 : budget 2027 -> 2023, 2024, 2025.
 * @returns {number[]} annees, de la plus ancienne a la plus recente
 */
export function anneesDeReference(anneeCible, anneeCourante = new Date().getFullYear(), nbAnnees = NB_ANNEES_REFERENCE) {
  const derniereAnneeComplete = Math.min(anneeCible, anneeCourante) - 1
  return Array.from({ length: nbAnnees }, (_, index) => derniereAnneeComplete - nbAnnees + 1 + index)
}

/**
 * Propose les lignes du budget de `anneeCible` :
 * pour chaque categorie, moyenne des depenses des annees de reference
 * (voir anneesDeReference), + indexation, arrondie a la dizaine superieure.
 * Une annee sans depense pour une categorie compte pour 0 dans la moyenne
 * (sinon une depense exceptionnelle unique gonflerait le budget).
 *
 * @param {object} donnees
 * @param {{annee: number, categorie: string, montant: number}[]} donnees.historique
 * @param {number[]} donnees.annees annees de reference (anneesDeReference)
 * @returns {{categorie: string, montant: number, moyenneHistorique: number}[]}
 */
export function genererProposition({ historique, annees, indexation = INDEXATION_PAR_DEFAUT }) {
  const totalParCategorie = new Map()

  for (const ligne of historique) {
    if (!annees.includes(Number(ligne.annee))) continue
    const total = totalParCategorie.get(ligne.categorie) ?? 0
    totalParCategorie.set(ligne.categorie, total + Number(ligne.montant))
  }

  return [...totalParCategorie.entries()]
    .map(([categorie, total]) => {
      const moyenneHistorique = Math.round((total / annees.length) * 100) / 100
      return {
        categorie,
        moyenneHistorique,
        montant: arrondirDizaineSup(moyenneHistorique * (1 + indexation)),
      }
    })
    .filter((ligne) => ligne.montant > 0)
    .sort((a, b) => a.categorie.localeCompare(b.categorie, 'fr'))
}

// ---------------------------------------------------------------------------
// 3. Validation des lignes envoyees par l'administrateur
// ---------------------------------------------------------------------------

/**
 * @param {unknown} lignes [{ categorie, montant }]
 * @param {string[]} categoriesConnues categories de depense existantes
 * @returns {string[]} erreurs (vide si tout est bon)
 */
export function validerLignes(lignes, categoriesConnues) {
  if (!Array.isArray(lignes) || lignes.length === 0) {
    return ['Le budget doit contenir au moins une ligne']
  }

  const erreurs = []
  const dejaVues = new Set()

  lignes.forEach((ligne, index) => {
    const numero = `Ligne ${index + 1}`
    const categorie = typeof ligne?.categorie === 'string' ? ligne.categorie.trim() : ''

    if (!categorie || !categoriesConnues.includes(categorie)) {
      erreurs.push(`${numero} : catégorie inconnue`)
    } else if (dejaVues.has(categorie)) {
      erreurs.push(`${numero} : la catégorie « ${categorie} » apparaît deux fois`)
    }
    dejaVues.add(categorie)

    const montant = ligne?.montant
    if (typeof montant !== 'number' || !Number.isFinite(montant) || montant <= 0) {
      erreurs.push(`${numero} : le montant doit être un nombre supérieur à 0`)
    }
  })

  return erreurs
}

// ---------------------------------------------------------------------------
// 4. Repartition du budget entre les lots, selon leur quote-part
// ---------------------------------------------------------------------------

/**
 * Repartit chaque ligne du budget entre les lots habitables, avec la MEME
 * regle que les decomptes de charges (KAN-22) : ventilerDepense() et la cle
 * de repartition de la categorie (quote-part, ou parts egales pour l'eau /
 * l'electricite). Le budget d'un lot = ce qu'il devrait payer sur l'annee ;
 * l'acompte mensuel = ce montant / 12.
 *
 * @param {{categorie: string, montant: number, cle?: string}[]} lignes
 * @param {{reference: string, quote_part: number}[]} lots
 */
export function repartirBudgetParLot(lignes, lots) {
  const lotsHabitables = lots.filter((lot) => Number(lot.quote_part) > 0)
  const centimesParLot = new Map(lotsHabitables.map((lot) => [lot.reference, 0]))

  for (const ligne of lignes) {
    const parts = ventilerDepense({ montant: ligne.montant, lot: null, cle: ligne.cle ?? 'quote_part' }, lotsHabitables)
    for (const [reference, part] of Object.entries(parts)) {
      centimesParLot.set(reference, centimesParLot.get(reference) + Math.round(part * 100))
    }
  }

  return lotsHabitables.map((lot) => {
    const centimes = centimesParLot.get(lot.reference)
    return {
      reference: lot.reference,
      quote_part: Number(lot.quote_part),
      partAnnuelle: centimes / 100,
      acompteMensuel: Math.round(centimes / 12) / 100,
    }
  })
}
