import { pool } from '../../db/pool.js'
import { ID_PPE_DEFAUT } from '../../config/constants.js'
import { resolveCategorieId, resolveLotId, resolveProjetId } from '../reference/reference.repository.js'

const SELECT_DEPENSE = `
  SELECT t.id, t.montant, t.date_transaction, c.libelle AS categorie, l.reference AS appartement,
         t.id_projet, p.nom AS projet, t.description
  FROM Transactions t
  LEFT JOIN Categories c ON c.id = t.id_categorie
  LEFT JOIN Lots l ON l.id = t.id_lot
  LEFT JOIN Projets p ON p.id = t.id_projet
  WHERE t.id_ppe = ? AND t.type = 'depense'
`

function versDepensePublique(ligne) {
  return {
    id: ligne.id,
    montant: Number(ligne.montant),
    date: ligne.date_transaction,
    categorie: ligne.categorie,
    appartement: ligne.appartement,
    projet: ligne.projet ?? '',
    idProjet: ligne.id_projet ?? null,
    justificatif: ligne.description ?? '',
  }
}

export async function listerDepenses() {
  const [lignes] = await pool.query(`${SELECT_DEPENSE} ORDER BY t.date_transaction DESC, t.id DESC`, [ID_PPE_DEFAUT])
  return lignes.map(versDepensePublique)
}

// db : pool par defaut, ou la connexion d'une transaction (voir avecTransaction)
// pour que l'operation et sa ligne d'historique (KAN-35) soient validees ensemble.
export async function getDepenseById(id, db = pool) {
  const [lignes] = await db.query(`${SELECT_DEPENSE} AND t.id = ?`, [ID_PPE_DEFAUT, id])
  return lignes[0] ? versDepensePublique(lignes[0]) : null
}

export async function ajouterDepense(depense, db = pool) {
  const [idCategorie, idLot, idProjet] = await Promise.all([
    resolveCategorieId(depense.categorie, 'depense'),
    resolveLotId(depense.appartement),
    depense.projet ? resolveProjetId(depense.projet) : Promise.resolve(null),
  ])

  const [resultat] = await db.query(
    `INSERT INTO Transactions (id_ppe, id_categorie, id_lot, id_projet, montant, date_transaction, description, type)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'depense')`,
    [ID_PPE_DEFAUT, idCategorie, idLot, idProjet, Number(depense.montant), depense.date, depense.justificatif || ''],
  )

  return getDepenseById(resultat.insertId, db)
}

export async function supprimerDepense(id, db = pool) {
  const [resultat] = await db.query("DELETE FROM Transactions WHERE id = ? AND id_ppe = ? AND type = 'depense'", [
    id,
    ID_PPE_DEFAUT,
  ])
  return resultat.affectedRows > 0
}
