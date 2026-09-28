import { pool } from '../../db/pool.js'
import { ID_PPE_DEFAUT } from '../../config/constants.js'

// Traduit une ligne SQL Projets (+ ses etapes, + sa depense reelle calculee
// depuis Transactions) vers la forme attendue par le frontend, qui utilise
// des noms de champs herites des premieres maquettes (titre plutot que nom,
// budgetTotal plutot que budget_alloue...).
function versProjetPublic(ligne, etapes, depense) {
  const budgetTotal = Number(ligne.budget_alloue)
  const progression =
    ligne.progression_manuelle !== null && ligne.progression_manuelle !== undefined
      ? Number(ligne.progression_manuelle)
      : budgetTotal > 0
        ? Math.min(100, Math.round((depense / budgetTotal) * 100))
        : 0

  return {
    id: ligne.id,
    titre: ligne.nom,
    description: ligne.description,
    responsable: ligne.responsable,
    budgetTotal,
    depense,
    progression,
    statut: ligne.statut,
    dateDebut: ligne.date_debut,
    dateFin: ligne.date_fin ?? '',
    etapes,
    soldeRestant: Math.max(0, budgetTotal - depense),
    depassement: depense > budgetTotal ? depense - budgetTotal : 0,
  }
}

async function calculerDepenseProjet(idProjet) {
  const [lignes] = await pool.query(
    "SELECT COALESCE(SUM(montant), 0) AS total FROM Transactions WHERE id_projet = ? AND type = 'depense'",
    [idProjet],
  )
  return Number(lignes[0].total)
}

async function recupererEtapes(idProjet) {
  const [lignes] = await pool.query(
    'SELECT titre, date_etape, statut FROM Etapes_Projets WHERE id_projet = ? ORDER BY ordre ASC, id ASC',
    [idProjet],
  )
  return lignes.map((etape) => ({ titre: etape.titre, date: etape.date_etape, statut: etape.statut }))
}

export async function getProjets() {
  const [lignes] = await pool.query(
    'SELECT * FROM Projets WHERE id_ppe = ? ORDER BY date_debut DESC, id DESC',
    [ID_PPE_DEFAUT],
  )

  return Promise.all(
    lignes.map(async (ligne) => {
      const [etapes, depense] = await Promise.all([recupererEtapes(ligne.id), calculerDepenseProjet(ligne.id)])
      return versProjetPublic(ligne, etapes, depense)
    }),
  )
}

export async function getProjetById(id) {
  const [lignes] = await pool.query('SELECT * FROM Projets WHERE id = ? AND id_ppe = ?', [id, ID_PPE_DEFAUT])
  const ligne = lignes[0]

  if (!ligne) {
    return null
  }

  const [etapes, depense] = await Promise.all([recupererEtapes(ligne.id), calculerDepenseProjet(ligne.id)])
  return versProjetPublic(ligne, etapes, depense)
}

async function remplacerEtapes(idProjet, etapes) {
  await pool.query('DELETE FROM Etapes_Projets WHERE id_projet = ?', [idProjet])

  let ordre = 0
  for (const etape of etapes) {
    await pool.query(
      'INSERT INTO Etapes_Projets (id_projet, titre, date_etape, statut, ordre) VALUES (?, ?, ?, ?, ?)',
      [idProjet, etape.titre, etape.date, etape.statut ?? 'En attente', ordre],
    )
    ordre += 1
  }
}

export async function ajouterProjet(data) {
  const budgetTotal = Number(data.budgetTotal)
  const progressionManuelle = data.progression !== undefined ? Math.round(Number(data.progression)) : null

  const [resultat] = await pool.query(
    `INSERT INTO Projets (id_ppe, nom, description, responsable, budget_alloue, progression_manuelle, statut, date_debut, date_fin)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      ID_PPE_DEFAUT,
      data.titre.trim(),
      data.description ? String(data.description).trim() : '',
      data.responsable.trim(),
      budgetTotal,
      progressionManuelle,
      data.statut || 'Planifié',
      data.dateDebut,
      data.dateFin || null,
    ],
  )

  if (Array.isArray(data.etapes) && data.etapes.length > 0) {
    await remplacerEtapes(resultat.insertId, data.etapes)
  }

  // depense initiale optionnelle : permet de creer un projet en reprenant un
  // historique (import de donnees existantes), enregistree comme une
  // transaction plutot que comme un champ libre non tracable.
  if (data.depense !== undefined && Number(data.depense) > 0) {
    await pool.query(
      `INSERT INTO Transactions (id_ppe, id_projet, montant, date_transaction, description, type)
       VALUES (?, ?, ?, ?, ?, 'depense')`,
      [ID_PPE_DEFAUT, resultat.insertId, Number(data.depense), data.dateDebut, `Dépenses initiales - ${data.titre.trim()}`],
    )
  }

  return getProjetById(resultat.insertId)
}

export async function modifierProjet(id, data) {
  const existant = await getProjetById(id)
  if (!existant) {
    return null
  }

  const budgetTotal = data.budgetTotal !== undefined ? Number(data.budgetTotal) : existant.budgetTotal
  const progressionManuelle = data.progression !== undefined ? Math.round(Number(data.progression)) : null

  await pool.query(
    `UPDATE Projets
     SET nom = ?, description = ?, responsable = ?, budget_alloue = ?,
         progression_manuelle = ?, statut = ?, date_debut = ?, date_fin = ?
     WHERE id = ? AND id_ppe = ?`,
    [
      data.titre !== undefined ? data.titre.trim() : existant.titre,
      data.description !== undefined ? String(data.description).trim() : existant.description,
      data.responsable !== undefined ? data.responsable.trim() : existant.responsable,
      budgetTotal,
      // Si aucune progression explicite n'est fournie sur la mise a jour, on
      // repasse en mode calcule automatiquement plutot que de garder une
      // ancienne valeur figee.
      data.progression !== undefined ? progressionManuelle : null,
      data.statut !== undefined ? data.statut : existant.statut,
      data.dateDebut !== undefined ? data.dateDebut : existant.dateDebut,
      data.dateFin !== undefined ? data.dateFin || null : existant.dateFin || null,
      id,
      ID_PPE_DEFAUT,
    ],
  )

  if (Array.isArray(data.etapes)) {
    await remplacerEtapes(id, data.etapes)
  }

  return getProjetById(id)
}

export async function supprimerProjet(id) {
  const [resultat] = await pool.query('DELETE FROM Projets WHERE id = ? AND id_ppe = ?', [id, ID_PPE_DEFAUT])
  return resultat.affectedRows > 0
}
