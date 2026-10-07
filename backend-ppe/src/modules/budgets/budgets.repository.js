// --- KAN-15 : acces base de donnees du budget annuel ---
// Uniquement du SQL : les regles (statuts, generation, repartition) sont dans
// budgets.calcul.js.

import { pool } from '../../db/pool.js'
import { ID_PPE_DEFAUT } from '../../config/constants.js'

/** Tous les budgets annuels de la PPE, du plus recent au plus ancien. */
export async function listerBudgets() {
  const [lignes] = await pool.query(
    `SELECT ba.annee, ba.statut, ba.prevision_budget, ba.date_creation, ba.date_approbation,
       COALESCE(SUM(lb.montant), 0) AS total_lignes, COUNT(lb.id) AS nb_lignes
     FROM Budgets_Annuels ba
     LEFT JOIN Ligne_Budgets lb ON lb.id_budget_annuel = ba.id
     WHERE ba.id_ppe = ?
     GROUP BY ba.id
     ORDER BY ba.annee DESC`,
    [ID_PPE_DEFAUT],
  )

  return lignes.map((ligne) => ({
    annee: Number(ligne.annee),
    statut: ligne.statut,
    enveloppe: Number(ligne.prevision_budget),
    totalLignes: Number(ligne.total_lignes),
    nbLignes: Number(ligne.nb_lignes),
    dateCreation: ligne.date_creation,
    dateApprobation: ligne.date_approbation,
  }))
}

/** Le budget d'une annee avec ses lignes, ou null s'il n'existe pas. */
export async function trouverBudget(annee) {
  const [[budget]] = await pool.query(
    `SELECT id, annee, statut, prevision_budget, date_creation, date_approbation
     FROM Budgets_Annuels WHERE id_ppe = ? AND annee = ?`,
    [ID_PPE_DEFAUT, annee],
  )

  if (!budget) return null

  const [lignes] = await pool.query(
    `SELECT c.libelle AS categorie, c.cle_repartition AS cle, lb.montant
     FROM Ligne_Budgets lb
     JOIN Categories c ON c.id = lb.id_categorie
     WHERE lb.id_budget_annuel = ?
     ORDER BY c.libelle ASC`,
    [budget.id],
  )

  return {
    id: budget.id,
    annee: Number(budget.annee),
    statut: budget.statut,
    enveloppe: Number(budget.prevision_budget),
    dateCreation: budget.date_creation,
    dateApprobation: budget.date_approbation,
    lignes: lignes.map((ligne) => ({ categorie: ligne.categorie, cle: ligne.cle, montant: Number(ligne.montant) })),
  }
}

/**
 * Remplace toutes les lignes d'un budget (dans une transaction : soit tout
 * passe, soit rien ne change).
 * @param {import('mysql2/promise').PoolConnection} connexion
 */
async function ecrireLignes(connexion, idBudget, lignes) {
  await connexion.query('DELETE FROM Ligne_Budgets WHERE id_budget_annuel = ?', [idBudget])

  for (const ligne of lignes) {
    await connexion.query(
      `INSERT INTO Ligne_Budgets (id_budget_annuel, id_categorie, montant)
       SELECT ?, id, ? FROM Categories WHERE libelle = ?`,
      [idBudget, ligne.montant, ligne.categorie],
    )
  }
}

async function enTransaction(travail) {
  const connexion = await pool.getConnection()
  try {
    await connexion.beginTransaction()
    const resultat = await travail(connexion)
    await connexion.commit()
    return resultat
  } catch (error) {
    await connexion.rollback()
    throw error
  } finally {
    connexion.release()
  }
}

/**
 * Cree le brouillon du budget `annee` avec ses lignes. L'enveloppe proposee
 * au depart est le total des lignes ; ensuite elle n'est plus recalculee
 * (decision d'equipe documentee dans BD.sql : c'est le montant vote en AG).
 */
export async function creerBrouillon(annee, lignes) {
  const enveloppe = lignes.reduce((total, ligne) => total + ligne.montant, 0)

  return enTransaction(async (connexion) => {
    const [resultat] = await connexion.query(
      `INSERT INTO Budgets_Annuels (id_ppe, annee, prevision_budget, date_creation, statut)
       VALUES (?, ?, ?, CURDATE(), 'brouillon')`,
      [ID_PPE_DEFAUT, annee, enveloppe],
    )
    await ecrireLignes(connexion, resultat.insertId, lignes)
  })
}

/** Remplace les lignes (et l'enveloppe si fournie) d'un budget existant. */
export async function mettreAJourBudget(idBudget, { lignes, enveloppe }) {
  return enTransaction(async (connexion) => {
    if (lignes) {
      await ecrireLignes(connexion, idBudget, lignes)
    }
    if (enveloppe !== undefined) {
      await connexion.query('UPDATE Budgets_Annuels SET prevision_budget = ? WHERE id = ?', [enveloppe, idBudget])
    }
  })
}

/** Change le statut ; la date d'approbation est posee a l'approbation. */
export async function changerStatut(idBudget, statut) {
  await pool.query(
    `UPDATE Budgets_Annuels
     SET statut = ?, date_approbation = IF(? = 'approuve', CURDATE(), NULL)
     WHERE id = ?`,
    [statut, statut, idBudget],
  )
}
