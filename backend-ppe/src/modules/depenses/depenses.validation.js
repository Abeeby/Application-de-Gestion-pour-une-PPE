// Validation du module de saisie des depenses (KAN-19).
//
// La logique pure (validerDepenseAvecListes) ne depend d'aucune base de
// donnees : elle prend les listes de reference en parametre, ce qui la rend
// testable unitairement sans DB (voir depenses.validation.test.js).
// validerDepense() est le point d'entree utilise par les routes : il va
// chercher les listes courantes en base puis delegue a la fonction pure.

import { getCategoriesParType, getLotsReferences, getProjetsNoms } from '../reference/reference.repository.js'

/**
 * @param {object} depense
 * @param {{categories: string[], appartements: string[], projets: string[]}} listes
 * @returns {string[]} erreurs (vide si tout va bien)
 */
export function validerDepenseAvecListes(depense = {}, { categories, appartements, projets }) {
  const erreurs = []
  const montant = Number(depense.montant)

  if (!montant || montant <= 0) {
    erreurs.push('Le montant doit etre un nombre superieur a 0')
  }

  if (!depense.date) {
    erreurs.push('La date est obligatoire')
  }

  if (!categories.includes(depense.categorie)) {
    erreurs.push('La categorie est invalide')
  }

  if (!appartements.includes(depense.appartement)) {
    erreurs.push('L appartement est invalide')
  }

  if (depense.projet && !projets.includes(depense.projet)) {
    erreurs.push('Le projet est invalide')
  }

  return erreurs
}

/**
 * @param {object} depense
 * @returns {Promise<string[]>}
 */
export async function validerDepense(depense = {}) {
  const [categories, appartements, projets] = await Promise.all([
    getCategoriesParType('depense'),
    getLotsReferences(),
    getProjetsNoms(),
  ])

  return validerDepenseAvecListes(depense, { categories, appartements, projets })
}
