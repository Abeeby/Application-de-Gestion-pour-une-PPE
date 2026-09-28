import { pool } from '../../db/pool.js'
import { ID_PPE_DEFAUT } from '../../config/constants.js'
import { resolveCategorieId, resolveLotId } from '../reference/reference.repository.js'

const SELECT_REVENU = `
  SELECT t.id, t.montant, t.date_transaction, c.libelle AS categorie, l.reference AS appartement
  FROM Transactions t
  LEFT JOIN Categories c ON c.id = t.id_categorie
  LEFT JOIN Lots l ON l.id = t.id_lot
  WHERE t.id_ppe = ? AND t.type = 'recette'
`

function versRevenuPublic(ligne) {
  return {
    id: ligne.id,
    montant: Number(ligne.montant),
    date: ligne.date_transaction,
    categorie: ligne.categorie,
    appartement: ligne.appartement,
  }
}

export async function listerRevenus() {
  const [lignes] = await pool.query(`${SELECT_REVENU} ORDER BY t.date_transaction DESC, t.id DESC`, [ID_PPE_DEFAUT])
  return lignes.map(versRevenuPublic)
}

export async function ajouterRevenu(revenu) {
  const [idCategorie, idLot] = await Promise.all([
    resolveCategorieId(revenu.categorie, 'recette'),
    resolveLotId(revenu.appartement),
  ])

  const [resultat] = await pool.query(
    `INSERT INTO Transactions (id_ppe, id_categorie, id_lot, montant, date_transaction, description, type)
     VALUES (?, ?, ?, ?, ?, ?, 'recette')`,
    [ID_PPE_DEFAUT, idCategorie, idLot, Number(revenu.montant), revenu.date, `Revenu ${revenu.categorie}`],
  )

  const [lignes] = await pool.query(`${SELECT_REVENU} AND t.id = ?`, [ID_PPE_DEFAUT, resultat.insertId])
  return versRevenuPublic(lignes[0])
}
