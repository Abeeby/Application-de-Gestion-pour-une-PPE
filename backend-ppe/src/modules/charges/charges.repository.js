import { pool } from '../../db/pool.js'
import { ID_PPE_DEFAUT } from '../../config/constants.js'

// Categorie de recette qui represente les acomptes de charges verses par
// chaque coproprietaire (saisis via le module Revenus, rattaches a un lot).
export const CATEGORIE_ACOMPTES = 'Charges de copropriete'

const bornesAnnee = (annee) => [`${annee}-01-01`, `${annee}-12-31`]

/** Lots de la PPE avec leur quote-part (y compris « Parties communes »). */
export async function getLotsAvecQuotePart() {
  const [lignes] = await pool.query('SELECT reference, quote_part FROM Lots WHERE id_ppe = ? ORDER BY reference ASC', [
    ID_PPE_DEFAUT,
  ])
  return lignes
}

/**
 * Depenses de l'annee avec ce qu'il faut pour les ventiler (cle de la
 * categorie, lot) et les rapprocher (facture liee).
 */
export async function getDepensesAnnee(annee) {
  const [lignes] = await pool.query(
    `SELECT t.id, t.montant, t.date_transaction, t.description,
            COALESCE(c.libelle, CONCAT('Projet : ', p.nom)) AS categorie, c.cle_repartition AS cle,
            l.reference AS lot,
            f.montant AS montant_facture, f.numero_facture, f.fournisseur
     FROM Transactions t
     LEFT JOIN Categories c ON c.id = t.id_categorie
     LEFT JOIN Lots l ON l.id = t.id_lot
     LEFT JOIN Projets p ON p.id = t.id_projet
     LEFT JOIN Factures f ON f.id = t.id_facture
     WHERE t.id_ppe = ? AND t.type = 'depense' AND t.date_transaction BETWEEN ? AND ?
     ORDER BY t.date_transaction ASC, t.id ASC`,
    [ID_PPE_DEFAUT, ...bornesAnnee(annee)],
  )

  return lignes.map((ligne) => ({
    id: ligne.id,
    date: ligne.date_transaction,
    description: ligne.description,
    montant: Number(ligne.montant),
    categorie: ligne.categorie,
    cle: ligne.cle ?? 'quote_part',
    lot: ligne.lot,
    montantFacture: ligne.montant_facture === null ? null : Number(ligne.montant_facture),
    numeroFacture: ligne.numero_facture,
    fournisseur: ligne.fournisseur,
  }))
}

/** Acomptes de charges verses par lot pendant l'annee. */
export async function getAcomptesAnnee(annee) {
  const [lignes] = await pool.query(
    `SELECT l.reference AS lot, SUM(t.montant) AS montant
     FROM Transactions t
     JOIN Categories c ON c.id = t.id_categorie
     JOIN Lots l ON l.id = t.id_lot
     WHERE t.id_ppe = ? AND t.type = 'recette' AND c.libelle = ? AND t.date_transaction BETWEEN ? AND ?
     GROUP BY l.reference`,
    [ID_PPE_DEFAUT, CATEGORIE_ACOMPTES, ...bornesAnnee(annee)],
  )
  return lignes.map((ligne) => ({ lot: ligne.lot, montant: Number(ligne.montant) }))
}
