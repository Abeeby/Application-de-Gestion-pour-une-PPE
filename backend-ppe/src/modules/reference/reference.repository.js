// Listes de reference partagees par les formulaires de saisie (depenses,
// revenus) : categories, lots (« appartements »), projets. Avant le
// branchement base de donnees, ces listes etaient des tableaux statiques en
// dur dans saisies.js / revenus.js ; elles sont maintenant lues en base pour
// rester coherentes avec ce que gerent les modules Projets et Lots.

import { pool } from '../../db/pool.js'
import { ID_PPE_DEFAUT } from '../../config/constants.js'

/**
 * @param {'depense'|'recette'} type
 * @returns {Promise<string[]>} libelles des categories proposees pour ce type de mouvement
 */
export async function getCategoriesParType(type) {
  const [lignes] = await pool.query(
    'SELECT libelle FROM Categories WHERE FIND_IN_SET(?, types) ORDER BY libelle ASC',
    [type],
  )
  return lignes.map((ligne) => ligne.libelle)
}

/**
 * @returns {Promise<string[]>} references des lots de la PPE (ex: 'A1', 'Parties communes')
 */
export async function getLotsReferences() {
  const [lignes] = await pool.query('SELECT reference FROM Lots WHERE id_ppe = ? ORDER BY reference ASC', [
    ID_PPE_DEFAUT,
  ])
  return lignes.map((ligne) => ligne.reference)
}

/**
 * @returns {Promise<string[]>} noms des projets existants, pour imputer une depense a un projet
 */
export async function getProjetsNoms() {
  const [lignes] = await pool.query('SELECT nom FROM Projets WHERE id_ppe = ? ORDER BY nom ASC', [ID_PPE_DEFAUT])
  return lignes.map((ligne) => ligne.nom)
}

export async function resolveCategorieId(libelle, type) {
  const [lignes] = await pool.query('SELECT id FROM Categories WHERE libelle = ? AND FIND_IN_SET(?, types) LIMIT 1', [
    libelle,
    type,
  ])
  return lignes[0]?.id ?? null
}

export async function resolveLotId(reference) {
  const [lignes] = await pool.query('SELECT id FROM Lots WHERE reference = ? AND id_ppe = ? LIMIT 1', [
    reference,
    ID_PPE_DEFAUT,
  ])
  return lignes[0]?.id ?? null
}

export async function resolveProjetId(nom) {
  const [lignes] = await pool.query('SELECT id FROM Projets WHERE nom = ? AND id_ppe = ? LIMIT 1', [
    nom,
    ID_PPE_DEFAUT,
  ])
  return lignes[0]?.id ?? null
}
