import { pool } from '../../db/pool.js'
import { ID_PPE_DEFAUT } from '../../config/constants.js'

// Plafond de lignes renvoyees en une fois : l'historique ne fait que grandir.
const LIMITE_LIGNES = 500

/**
 * Ajoute une ligne d'historique. Doit recevoir la connexion de la transaction
 * en cours (voir avecTransaction) pour etre annulee avec l'operation si
 * quelque chose echoue.
 * @param {import('mysql2/promise').PoolConnection} db
 * @param {{typeElement: 'projet'|'depense', idElement: number, idProjet?: number|null,
 *          action: 'creation'|'modification'|'suppression', idUtilisateur: number, details: object}} entree
 */
export async function enregistrerHistorique(db, { typeElement, idElement, idProjet, action, idUtilisateur, details }) {
  await db.query(
    `INSERT INTO Historique (id_ppe, id_utilisateur, type_element, id_element, id_projet, action, details)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [ID_PPE_DEFAUT, idUtilisateur, typeElement, idElement, idProjet ?? null, action, JSON.stringify(details)],
  )
}

function versEntreePublique(ligne) {
  return {
    id: ligne.id,
    date: ligne.date_action,
    utilisateur: ligne.id_utilisateur ? { id: ligne.id_utilisateur, nom: `${ligne.prenom} ${ligne.nom}` } : null,
    typeElement: ligne.type_element,
    idElement: ligne.id_element,
    idProjet: ligne.id_projet,
    action: ligne.action,
    details: JSON.parse(ligne.details),
  }
}

/**
 * @param {{type?: string, action?: string, idElement?: number, idProjet?: number, du?: string, au?: string}} filtres
 *   deja valides par validerFiltresHistorique
 */
export async function listerHistorique(filtres = {}) {
  const conditions = ['h.id_ppe = ?']
  const valeurs = [ID_PPE_DEFAUT]

  if (filtres.type) {
    conditions.push('h.type_element = ?')
    valeurs.push(filtres.type)
  }
  if (filtres.action) {
    conditions.push('h.action = ?')
    valeurs.push(filtres.action)
  }
  if (filtres.idElement) {
    conditions.push('h.id_element = ?')
    valeurs.push(filtres.idElement)
  }
  if (filtres.idProjet) {
    conditions.push('h.id_projet = ?')
    valeurs.push(filtres.idProjet)
  }
  if (filtres.du) {
    conditions.push('h.date_action >= ?')
    valeurs.push(filtres.du)
  }
  if (filtres.au) {
    // "au" est inclus : on prend tout ce qui precede le lendemain a minuit
    conditions.push('h.date_action < DATE_ADD(?, INTERVAL 1 DAY)')
    valeurs.push(filtres.au)
  }

  const [lignes] = await pool.query(
    `SELECT h.*, u.prenom, u.nom
     FROM Historique h
     LEFT JOIN Utilisateurs u ON u.id = h.id_utilisateur
     WHERE ${conditions.join(' AND ')}
     ORDER BY h.date_action DESC, h.id DESC
     LIMIT ${LIMITE_LIGNES}`,
    valeurs,
  )

  return lignes.map(versEntreePublique)
}
