// Validation du module de saisie des revenus (KAN-18).
// Meme approche que depenses.validation.js : une fonction pure testable sans
// DB (validerRevenuAvecListes), et un point d'entree async pour les routes.

import { getCategoriesParType, getLotsReferences } from '../reference/reference.repository.js'
import { estDateValide, estMontantValide } from '../../validation/communes.js'

export function normaliserDateImport(date) {
  // Cellule Excel de type date : on lit la date LOCALE (toISOString() donne
  // l'heure UTC et pouvait decaler d'un jour)
  if (date instanceof Date && !Number.isNaN(date.getTime())) {
    const deuxChiffres = (n) => String(n).padStart(2, '0')
    return `${date.getFullYear()}-${deuxChiffres(date.getMonth() + 1)}-${deuxChiffres(date.getDate())}`
  }

  const valeur = String(date ?? '').trim()
  const dateLocale = valeur.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/)

  if (dateLocale) {
    const [, jour, mois, annee] = dateLocale
    const anneeComplete = annee.length === 2 ? `20${annee}` : annee
    return `${anneeComplete}-${mois.padStart(2, '0')}-${jour.padStart(2, '0')}`
  }

  return valeur
}

/**
 * @param {object} revenu
 * @param {{categories: string[], appartements: string[]}} listes
 * @returns {string[]}
 */
export function validerRevenuAvecListes(revenu = {}, { categories, appartements }) {
  const erreurs = []
  if (!estMontantValide(revenu.montant)) {
    erreurs.push('Le montant doit etre un nombre superieur a 0')
  }

  if (!estDateValide(String(revenu.date ?? ''))) {
    erreurs.push('La date est obligatoire et doit etre au format AAAA-MM-JJ')
  }

  if (!categories.includes(revenu.categorie)) {
    erreurs.push('La categorie de revenu est invalide')
  }

  if (!appartements.includes(revenu.appartement)) {
    erreurs.push("L'appartement est invalide")
  }

  return erreurs
}

/**
 * @param {object} revenu
 * @returns {Promise<string[]>}
 */
export async function validerRevenu(revenu = {}) {
  const [categories, appartements] = await Promise.all([getCategoriesParType('recette'), getLotsReferences()])
  return validerRevenuAvecListes(revenu, { categories, appartements })
}
