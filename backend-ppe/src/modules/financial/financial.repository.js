import { pool } from '../../db/pool.js'
import { ID_PPE_DEFAUT } from '../../config/constants.js'
import { calculerResume } from './financial.calcul.js'

/**
 * KAN-26 : resume financier de l'exercice `annee` (annee en cours par defaut).
 * Les totaux ne portent que sur l'annee demandee, et le taux d'utilisation du
 * budget compare les depenses au budget vote (voir financial.calcul.js).
 */
export async function getSummary(annee = new Date().getFullYear()) {
  const [[totaux]] = await pool.query(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'recette' THEN montant ELSE 0 END), 0) AS total_recettes,
       COALESCE(SUM(CASE WHEN type = 'depense' THEN montant ELSE 0 END), 0) AS total_depenses
     FROM Transactions
     WHERE id_ppe = ? AND YEAR(date_transaction) = ?`,
    [ID_PPE_DEFAUT, annee],
  )

  const lignesBudget = await getBudgets(annee)

  return calculerResume({
    annee,
    recettes: totaux.total_recettes,
    depenses: totaux.total_depenses,
    lignesBudget,
  })
}

/**
 * Compte unique derive des transactions (pas de table Comptes dans le schema
 * actuel). Solde depuis le debut (toutes annees confondues), contrairement au
 * resume qui ne porte que sur l'exercice en cours. A remplacer par une vraie
 * table si le suivi multi-comptes devient necessaire.
 */
export async function getAccounts() {
  const [[totaux]] = await pool.query(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'recette' THEN montant ELSE -montant END), 0) AS solde
     FROM Transactions
     WHERE id_ppe = ?`,
    [ID_PPE_DEFAUT],
  )

  return [
    {
      id: 'compte-ppe',
      name: 'Compte PPE (calculé)',
      balance: Number(totaux.solde),
    },
  ]
}

export async function getTransactionsRecentes(limite = 50) {
  const [lignes] = await pool.query(
    `SELECT t.id, t.type, c.libelle AS category, t.description AS label, t.montant, t.date_transaction
     FROM Transactions t
     LEFT JOIN Categories c ON c.id = t.id_categorie
     WHERE t.id_ppe = ?
     ORDER BY t.date_transaction DESC, t.id DESC
     LIMIT ?`,
    [ID_PPE_DEFAUT, limite],
  )

  return lignes.map((ligne) => ({
    id: `txn-${ligne.id}`,
    type: ligne.type === 'recette' ? 'income' : 'expense',
    category: ligne.category ?? 'Non catégorisé',
    label: ligne.label,
    amount: Number(ligne.montant),
    date: ligne.date_transaction,
  }))
}

async function trouverOuCreerBudgetAnnuel(annee) {
  const [existants] = await pool.query('SELECT id FROM Budgets_Annuels WHERE id_ppe = ? AND annee = ?', [
    ID_PPE_DEFAUT,
    annee,
  ])

  if (existants[0]) {
    return existants[0].id
  }

  const [resultat] = await pool.query(
    `INSERT INTO Budgets_Annuels (id_ppe, annee, prevision_budget, date_creation, statut)
     VALUES (?, ?, 0, CURDATE(), 'en attente')`,
    [ID_PPE_DEFAUT, annee],
  )
  return resultat.insertId
}

async function trouverOuCreerCategorie(libelle) {
  const [existantes] = await pool.query('SELECT id FROM Categories WHERE libelle = ?', [libelle])
  if (existantes[0]) {
    return existantes[0].id
  }

  const [resultat] = await pool.query("INSERT INTO Categories (libelle, types) VALUES (?, 'depense')", [libelle])
  return resultat.insertId
}

export async function getBudgets(annee = new Date().getFullYear()) {
  const [lignes] = await pool.query(
    `SELECT lb.id, c.libelle AS category, lb.montant AS planned,
       COALESCE((
         SELECT SUM(t.montant) FROM Transactions t
         WHERE t.id_ppe = ? AND t.type = 'depense' AND t.id_categorie = lb.id_categorie
           AND YEAR(t.date_transaction) = ba.annee
       ), 0) AS used
     FROM Ligne_Budgets lb
     JOIN Budgets_Annuels ba ON ba.id = lb.id_budget_annuel
     JOIN Categories c ON c.id = lb.id_categorie
     WHERE ba.id_ppe = ? AND ba.annee = ?
     ORDER BY c.libelle ASC`,
    [ID_PPE_DEFAUT, ID_PPE_DEFAUT, annee],
  )

  return lignes.map((ligne) => {
    const planned = Number(ligne.planned)
    const used = Number(ligne.used)
    return {
      id: `budget-${ligne.id}`,
      category: ligne.category,
      planned,
      used,
      progress: Math.round((used / Math.max(planned, 1)) * 100),
    }
  })
}

export async function ajouterLigneBudget({ category, planned }, annee = new Date().getFullYear()) {
  const idBudgetAnnuel = await trouverOuCreerBudgetAnnuel(annee)
  const idCategorie = await trouverOuCreerCategorie(category)

  // insertId n'est pas fiable en cas d'UPDATE via ON DUPLICATE KEY (depend du
  // moteur / de la presence d'AUTO_INCREMENT dans la clause) : on relit la
  // ligne pour recuperer son id de facon certaine.
  await pool.query(
    `INSERT INTO Ligne_Budgets (id_budget_annuel, id_categorie, montant)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE montant = VALUES(montant)`,
    [idBudgetAnnuel, idCategorie, planned],
  )

  const [[ligne]] = await pool.query(
    'SELECT id FROM Ligne_Budgets WHERE id_budget_annuel = ? AND id_categorie = ?',
    [idBudgetAnnuel, idCategorie],
  )

  return {
    id: `budget-${ligne.id}`,
    category,
    planned,
    used: 0,
    progress: 0,
  }
}

export async function getHistoriqueDepenses(anneeDebut, anneeFin) {
  const [lignes] = await pool.query(
    `SELECT YEAR(t.date_transaction) AS annee, c.libelle AS categorie, SUM(t.montant) AS montant
     FROM Transactions t
     JOIN Categories c ON c.id = t.id_categorie
     WHERE t.id_ppe = ? AND t.type = 'depense'
       AND YEAR(t.date_transaction) BETWEEN ? AND ?
     GROUP BY YEAR(t.date_transaction), c.libelle
     ORDER BY annee ASC, categorie ASC`,
    [ID_PPE_DEFAUT, anneeDebut, anneeFin],
  )

  return lignes.map((ligne) => ({
    annee: Number(ligne.annee),
    categorie: ligne.categorie,
    montant: Number(ligne.montant),
  }))
}
