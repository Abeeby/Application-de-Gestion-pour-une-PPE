import { pool } from '../../db/pool.js'
import { ID_PPE_DEFAUT } from '../../config/constants.js'
import { resolveCategorieId, resolveLotId, resolveProjetId } from '../reference/reference.repository.js'

const SELECT_DEPENSE = `
  SELECT t.id, t.montant, t.date_transaction, c.libelle AS categorie, l.reference AS appartement,
         p.nom AS projet, t.description
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
    justificatif: ligne.description ?? '',
  }
}

export function construireFiltresDepenses(filtres = {}) {
  const clauses = []
  const valeurs = []

  const projet = String(filtres.projet ?? '').trim()
  const appartement = String(filtres.appartement ?? '').trim()
  const dateDebut = String(filtres.dateDebut ?? '').trim()
  const dateFin = String(filtres.dateFin ?? '').trim()

  if (projet) {
    clauses.push('p.nom = ?')
    valeurs.push(projet)
  }

  if (appartement) {
    clauses.push('l.reference = ?')
    valeurs.push(appartement)
  }

  if (dateDebut) {
    clauses.push('t.date_transaction >= ?')
    valeurs.push(dateDebut)
  }

  if (dateFin) {
    clauses.push('t.date_transaction <= ?')
    valeurs.push(dateFin)
  }

  return { clauses, valeurs }
}

export async function listerDepenses(filtres = {}) {
  const { clauses, valeurs } = construireFiltresDepenses(filtres)
  const whereClause = clauses.length > 0 ? ` AND ${clauses.join(' AND ')}` : ''
  const [lignes] = await pool.query(
    `${SELECT_DEPENSE}${whereClause} ORDER BY t.date_transaction DESC, t.id DESC`,
    [ID_PPE_DEFAUT, ...valeurs],
  )
  return lignes.map(versDepensePublique)
}

export async function ajouterDepense(depense) {
  const [idCategorie, idLot, idProjet] = await Promise.all([
    resolveCategorieId(depense.categorie, 'depense'),
    resolveLotId(depense.appartement),
    depense.projet ? resolveProjetId(depense.projet) : Promise.resolve(null),
  ])

  const [resultat] = await pool.query(
    `INSERT INTO Transactions (id_ppe, id_categorie, id_lot, id_projet, montant, date_transaction, description, type)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'depense')`,
    [ID_PPE_DEFAUT, idCategorie, idLot, idProjet, Number(depense.montant), depense.date, depense.justificatif || ''],
  )

  const [lignes] = await pool.query(`${SELECT_DEPENSE} AND t.id = ?`, [ID_PPE_DEFAUT, resultat.insertId])
  return versDepensePublique(lignes[0])
}
