// Validation du module de saisie des revenus (KAN-18).
// Meme approche que depenses.validation.js : une fonction pure testable sans
// DB (validerRevenuAvecListes), et un point d'entree async pour les routes.

import { getCategoriesParType, getLotsReferences } from '../reference/reference.repository.js'

export function normaliserDateImport(date) {
  if (date instanceof Date && !Number.isNaN(date.getTime())) {
    return date.toISOString().slice(0, 10)
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
  const montant = Number(revenu.montant)

  if (!Number.isFinite(montant) || montant <= 0) {
    erreurs.push('Le montant doit etre un nombre superieur a 0')
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(revenu.date ?? ''))) {
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
