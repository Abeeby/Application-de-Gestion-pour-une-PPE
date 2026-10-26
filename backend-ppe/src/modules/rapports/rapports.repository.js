import { pool } from '../../db/pool.js'
import { ID_PPE_DEFAUT } from '../../config/constants.js'
import { calculerRapport } from './rapports.calcul.js'

export async function genererRapport(periode) {
  // Une transaction de lecture garde les budgets et mouvements cohérents
  // si un autre utilisateur enregistre une dépense pendant la génération.
  const connexion = await pool.getConnection()
  try {
    await connexion.beginTransaction()
    const [ppes] = await connexion.query('SELECT nom, adresse FROM PPE WHERE id = ?', [ID_PPE_DEFAUT])
    const [budgets] = await connexion.query(
      'SELECT id, prevision_budget AS montant, statut FROM Budgets_Annuels WHERE id_ppe = ? AND annee = ?',
      [ID_PPE_DEFAUT, periode.annee],
    )
    let lignesBudget = []
    if (budgets.length) {
      const [lignes] = await connexion.query(
        `SELECT lb.id_categorie AS categorieId, c.libelle AS categorie, lb.montant
         FROM Ligne_Budgets lb JOIN Categories c ON c.id = lb.id_categorie
         WHERE lb.id_budget_annuel = ?`, [budgets[0].id],
      )
      lignesBudget = lignes
    }
    const [transactions] = await connexion.query(
      `SELECT t.id, t.date_transaction AS date, t.type, t.montant, t.description,
              t.id_categorie AS categorieId, c.libelle AS categorie,
              l.reference AS appartement, p.nom AS projet, f.numero_facture AS facture
       FROM Transactions t
       LEFT JOIN Categories c ON c.id = t.id_categorie
       LEFT JOIN Lots l ON l.id = t.id_lot
       LEFT JOIN Projets p ON p.id = t.id_projet
       LEFT JOIN Factures f ON f.id = t.id_facture
       WHERE t.id_ppe = ? AND t.date_transaction BETWEEN ? AND ?
       ORDER BY t.date_transaction ASC, t.id ASC`,
      [ID_PPE_DEFAUT, `${periode.annee}-01-01`, periode.dateFin],
    )
    await connexion.commit()
    return calculerRapport({ periode, ppe: ppes[0], budget: budgets[0] ?? null, lignesBudget, transactions })
  } catch (erreur) {
    await connexion.rollback()
    throw erreur
  } finally {
    connexion.release()
  }
}
