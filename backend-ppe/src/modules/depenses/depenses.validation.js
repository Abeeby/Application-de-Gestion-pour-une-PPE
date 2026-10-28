// Validation du module de saisie des depenses (KAN-19).
//
// La logique pure (validerDepenseAvecListes) ne depend d'aucune base de
// donnees : elle prend les listes de reference en parametre, ce qui la rend
// testable unitairement sans DB (voir depenses.validation.test.js).
// validerDepense() est le point d'entree utilise par les routes : il va
// chercher les listes courantes en base puis delegue a la fonction pure.

import { getCategoriesParType, getLotsReferences, getProjetsNoms } from '../reference/reference.repository.js'
import { estDateValide, estMontantValide } from '../../validation/communes.js'

/**
 * @param {object} depense
 * @param {{categories: string[], appartements: string[], projets: string[]}} listes
 * @returns {string[]} erreurs (vide si tout va bien)
 */
export function validerDepenseAvecListes(depense = {}, { categories, appartements, projets }) {
  const erreurs = []
  if (!estMontantValide(depense.montant)) {
    erreurs.push('Le montant doit etre un nombre superieur a 0 (2 decimales maximum)')
  }

  if (!depense.date) {
    erreurs.push('La date est obligatoire')
  } else if (!estDateValide(depense.date)) {
    erreurs.push('La date doit etre une date valide au format AAAA-MM-JJ')
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

  // Le justificatif est un numero de facture : du texte court, ou rien.
  // Avant, une liste [] faisait planter la requete SQL (erreur 500).
  const justificatif = depense.justificatif
  if (justificatif !== undefined && justificatif !== null && justificatif !== '') {
    if (typeof justificatif !== 'string') {
      erreurs.push('Le justificatif doit etre un texte (ex. FAC-2026-001)')
    } else if (justificatif.length > 255) {
      erreurs.push('Le justificatif ne peut pas depasser 255 caracteres')
    }
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
