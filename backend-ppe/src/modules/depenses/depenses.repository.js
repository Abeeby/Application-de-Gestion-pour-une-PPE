import { pool } from '../../db/pool.js'
import { ID_PPE_DEFAUT } from '../../config/constants.js'
import { resolveCategorieId, resolveLotId, resolveProjetId } from '../reference/reference.repository.js'
import { estDateValide, versMontant } from '../../validation/communes.js'

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

/**
 * Verifie les filtres de la liste des depenses (KAN-34).
 * MySQL 8 refuse de comparer une date a un texte comme '2026-13-45' (erreur
 * 500) alors que MariaDB l'acceptait sans rien dire : on refuse avant (400).
 * @returns {string[]} erreurs
 */
export function validerFiltresDepenses(filtres = {}) {
  const erreurs = []
  for (const [cle, libelle] of [['dateDebut', 'de début'], ['dateFin', 'de fin']]) {
    const valeur = filtres[cle]
    if (valeur === undefined || valeur === '') continue
    if (typeof valeur !== 'string' || !estDateValide(valeur.trim())) {
      erreurs.push(`La date ${libelle} doit être une date valide au format AAAA-MM-JJ`)
    }
  }
  for (const cle of ['projet', 'appartement']) {
    if (filtres[cle] !== undefined && typeof filtres[cle] !== 'string') {
      erreurs.push(`Le filtre « ${cle} » ne peut avoir qu’une seule valeur`)
    }
  }
  if (!erreurs.length && filtres.dateDebut && filtres.dateFin && filtres.dateDebut > filtres.dateFin) {
    erreurs.push('La date de début doit être avant la date de fin')
  }
  return erreurs
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
    [ID_PPE_DEFAUT, idCategorie, idLot, idProjet, versMontant(depense.montant), depense.date, depense.justificatif || ''],
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
