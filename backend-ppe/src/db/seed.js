// Script de peuplement de la base PPE avec des donnees de demonstration.
// A executer une fois BD.sql et les migrations de db/migrations/ appliquees :
//   npm run seed
//
// Le script est destructif : il vide les tables applicatives avant de les
// repeupler, pour rester reproductible en environnement de developpement.
// Ne JAMAIS lancer ce script contre une base de production.

import bcrypt from 'bcryptjs'
import { pool } from './pool.js'

const NOM_PPE = 'PPE Résidence Exemple'
const ADRESSE_PPE = 'Rue de la Copropriété 1, 1400 Yverdon-les-Bains'

const LOTS = [
  { reference: 'A1', surface: 70, nbr_pieces: 3.5, quote_part: 16.67 },
  { reference: 'A2', surface: 65, nbr_pieces: 3.5, quote_part: 16.67 },
  { reference: 'A3', surface: 80, nbr_pieces: 4.5, quote_part: 16.67 },
  { reference: 'B1', surface: 70, nbr_pieces: 3.5, quote_part: 16.67 },
  { reference: 'B2', surface: 65, nbr_pieces: 3.5, quote_part: 16.67 },
  { reference: 'B3', surface: 80, nbr_pieces: 4.5, quote_part: 16.65 },
  // Lot technique utilise pour imputer les depenses/revenus non specifiques
  // a un logement (charges communes). surface/pieces/quote_part a 0 car ce
  // n'est pas un lot habitable ni possede par un copropriétaire.
  { reference: 'Parties communes', surface: 0, nbr_pieces: 0, quote_part: 0 },
]

// Categories utilisees par la saisie des depenses (KAN-19)
const CATEGORIES_DEPENSES = ['Entretien', 'Assurances', 'Nettoyage', 'Eau & Electricite', 'Administration', 'Reparations']
// Categories utilisees par la saisie des revenus (KAN-18)
const CATEGORIES_REVENUS = ['Loyers', 'Charges de copropriete', 'Fonds de renovation', 'Subventions', 'Autres revenus']
// Categories utilisees uniquement par le tableau de bord financier (budgets / transactions recentes)
const CATEGORIES_DASHBOARD = ['Électricité', 'Sécurité', 'Revenus', 'Travaux']

const TOUTES_CATEGORIES = [...CATEGORIES_DEPENSES, ...CATEGORIES_REVENUS, ...CATEGORIES_DASHBOARD]

// Tag(s) applicatif(s) de chaque categorie : quel(s) formulaire(s) doivent la proposer
const TYPES_PAR_CATEGORIE = new Map([
  ...CATEGORIES_DEPENSES.map((libelle) => [libelle, 'depense']),
  ...CATEGORIES_REVENUS.map((libelle) => [libelle, 'recette']),
  ['Électricité', 'depense'],
  ['Sécurité', 'depense'],
  ['Revenus', 'recette'],
  ['Travaux', 'recette'],
])

// Comptes de demonstration. Mots de passe en clair UNIQUEMENT ici (donnees de
// seed de developpement) : ils sont hashes avant d'etre stockes en base.
const UTILISATEURS = [
  { prenom: 'Alex', nom: 'Martin', email: 'admin@ppe.fr', motDePasse: 'admin1234', role: 'admin' },
  { prenom: 'Marie', nom: 'Dupont', email: 'coproprietaire@ppe.fr', motDePasse: 'coprop1234', role: 'coproprietaire' },
]

// Projets specifiques (KAN-8), repris des donnees de maquette d'origine
const PROJETS = [
  {
    nom: 'Rénovation du toit',
    description: "Remplacement complet de l'isolation du toit principal et étanchéité.",
    responsable: 'Régie Naef SA',
    budget_alloue: 85000,
    statut: 'En cours',
    date_debut: '2026-01-15',
    date_fin: '2026-11-30',
    etapes: [
      { titre: 'Étude et planification', date_etape: '2026-01-15', statut: 'Terminé' },
      { titre: 'Appels d offres', date_etape: '2026-03-02', statut: 'Terminé' },
      { titre: 'Choix du prestataire', date_etape: '2026-04-24', statut: 'Terminé' },
      { titre: 'Travaux', date_etape: '2026-08-01', statut: 'En cours' },
      { titre: 'Réception des travaux', date_etape: '2026-10-15', statut: 'En attente' },
      { titre: 'Clôture du projet', date_etape: '2026-11-30', statut: 'En attente' },
    ],
    // depenses deja engagees, injectees comme Transactions liees au projet
    depensesEngagees: 74800,
    progressionManuelle: null,
  },
  {
    nom: 'Rénovation de la façade',
    description: 'Nettoyage haute pression, réparation du crépi et peinture extérieure.',
    responsable: 'Façades Romandes Sàrl',
    budget_alloue: 60000,
    statut: 'Planifié',
    date_debut: '2026-09-01',
    date_fin: '2027-03-31',
    etapes: [
      { titre: 'Étude préliminaire', date_etape: '2026-09-01', statut: 'En cours' },
      { titre: 'Devis & validation copropriétaires', date_etape: '2026-11-15', statut: 'En attente' },
      { titre: 'Début des travaux extérieurs', date_etape: '2027-02-01', statut: 'En attente' },
    ],
    depensesEngagees: 0,
    progressionManuelle: null,
  },
  {
    nom: 'Panneaux solaires',
    description: 'Installation de 42 panneaux photovoltaïques sur le toit orienté sud.',
    responsable: 'VoltEnergie SA',
    budget_alloue: 35000,
    statut: 'Terminé',
    date_debut: '2025-06-01',
    date_fin: '2025-12-15',
    etapes: [
      { titre: 'Étude faisabilité et subventions', date_etape: '2025-06-01', statut: 'Terminé' },
      { titre: 'Pose des panneaux', date_etape: '2025-09-10', statut: 'Terminé' },
      { titre: 'Raccordement réseau Romande Énergie', date_etape: '2025-12-01', statut: 'Terminé' },
    ],
    depensesEngagees: 34900,
    // Projet clos a 100% en AG bien que 100 CHF de marge n'aient pas ete
    // depenses : la progression calculee (99.7%) serait trompeuse ici.
    progressionManuelle: 100,
  },
]

// Historique de depenses generales (non liees a un projet), 2022-2025
const DEPENSES_HISTORIQUE = [
  { annee: 2022, categorie: 'Entretien', montant: 12400 },
  { annee: 2022, categorie: 'Assurances', montant: 8700 },
  { annee: 2022, categorie: 'Nettoyage', montant: 5200 },
  { annee: 2022, categorie: 'Eau & Electricite', montant: 9800 },
  { annee: 2022, categorie: 'Administration', montant: 4100 },
  { annee: 2022, categorie: 'Reparations', montant: 6300 },
  { annee: 2023, categorie: 'Entretien', montant: 13100 },
  { annee: 2023, categorie: 'Assurances', montant: 9200 },
  { annee: 2023, categorie: 'Nettoyage', montant: 5400 },
  { annee: 2023, categorie: 'Eau & Electricite', montant: 10500 },
  { annee: 2023, categorie: 'Administration', montant: 4300 },
  { annee: 2023, categorie: 'Reparations', montant: 9800 },
  { annee: 2024, categorie: 'Entretien', montant: 14200 },
  { annee: 2024, categorie: 'Assurances', montant: 9200 },
  { annee: 2024, categorie: 'Nettoyage', montant: 5900 },
  { annee: 2024, categorie: 'Eau & Electricite', montant: 11300 },
  { annee: 2024, categorie: 'Administration', montant: 4600 },
  { annee: 2024, categorie: 'Reparations', montant: 7100 },
  { annee: 2025, categorie: 'Entretien', montant: 13800 },
  { annee: 2025, categorie: 'Assurances', montant: 9500 },
  { annee: 2025, categorie: 'Nettoyage', montant: 6100 },
  { annee: 2025, categorie: 'Eau & Electricite', montant: 10900 },
  { annee: 2025, categorie: 'Administration', montant: 4800 },
  { annee: 2025, categorie: 'Reparations', montant: 5400 },
]

// Transactions recentes pour le tableau de bord financier
const TRANSACTIONS_RECENTES = [
  { type: 'recette', categorie: 'Revenus', description: 'Cotisations mensuelles', montant: 4200, date: '2026-08-05' },
  { type: 'depense', categorie: 'Électricité', description: "Facture d'électricité", montant: 1260, date: '2026-08-12' },
  { type: 'depense', categorie: 'Entretien', description: 'Plomberie et réparation', montant: 870, date: '2026-08-17' },
  { type: 'recette', categorie: 'Travaux', description: 'Remboursement travaux', montant: 1800, date: '2026-08-20' },
]

// Budget annuel de reference pour le tableau de bord
const ANNEE_BUDGET = 2026
const LIGNES_BUDGET = [
  { categorie: 'Électricité', montant: 2200 },
  { categorie: 'Entretien', montant: 1800 },
  { categorie: 'Sécurité', montant: 1000 },
]

// Production photovoltaique mensuelle (compteur commun, projet "Panneaux solaires")
const PRODUCTION_PV = [
  { annee: 2023, mois: 1, productionKwh: 320, revenuChf: 64, chargesChf: 220 },
  { annee: 2023, mois: 2, productionKwh: 380, revenuChf: 76, chargesChf: 200 },
  { annee: 2023, mois: 3, productionKwh: 550, revenuChf: 110, chargesChf: 170 },
  { annee: 2023, mois: 4, productionKwh: 700, revenuChf: 140, chargesChf: 150 },
  { annee: 2023, mois: 5, productionKwh: 850, revenuChf: 170, chargesChf: 130 },
  { annee: 2023, mois: 6, productionKwh: 1000, revenuChf: 200, chargesChf: 110 },
  { annee: 2023, mois: 7, productionKwh: 1050, revenuChf: 210, chargesChf: 120 },
  { annee: 2023, mois: 8, productionKwh: 950, revenuChf: 190, chargesChf: 125 },
  { annee: 2023, mois: 9, productionKwh: 750, revenuChf: 150, chargesChf: 140 },
  { annee: 2023, mois: 10, productionKwh: 550, revenuChf: 110, chargesChf: 170 },
  { annee: 2023, mois: 11, productionKwh: 380, revenuChf: 76, chargesChf: 200 },
  { annee: 2023, mois: 12, productionKwh: 280, revenuChf: 56, chargesChf: 230 },
  { annee: 2024, mois: 1, productionKwh: 350, revenuChf: 70, chargesChf: 200 },
  { annee: 2024, mois: 2, productionKwh: 420, revenuChf: 84, chargesChf: 180 },
  { annee: 2024, mois: 3, productionKwh: 600, revenuChf: 120, chargesChf: 160 },
  { annee: 2024, mois: 4, productionKwh: 750, revenuChf: 150, chargesChf: 140 },
  { annee: 2024, mois: 5, productionKwh: 900, revenuChf: 180, chargesChf: 120 },
  { annee: 2024, mois: 6, productionKwh: 1050, revenuChf: 210, chargesChf: 100 },
  { annee: 2024, mois: 7, productionKwh: 1100, revenuChf: 220, chargesChf: 110 },
  { annee: 2024, mois: 8, productionKwh: 1000, revenuChf: 200, chargesChf: 115 },
  { annee: 2024, mois: 9, productionKwh: 800, revenuChf: 160, chargesChf: 130 },
  { annee: 2024, mois: 10, productionKwh: 600, revenuChf: 120, chargesChf: 160 },
  { annee: 2024, mois: 11, productionKwh: 400, revenuChf: 80, chargesChf: 190 },
  { annee: 2024, mois: 12, productionKwh: 300, revenuChf: 60, chargesChf: 210 },
]

const TABLES_A_VIDER = [
  'Votes', 'Commenter', 'Transactions', 'Ligne_Budgets', 'Budgets_Annuels',
  'Devis', 'Releves', 'Compteurs', 'Etapes_Projets', 'Projets', 'Factures',
  'Posseder', 'Appartenir', 'Lots', 'Categories', 'Utilisateurs', 'PPE',
]

async function viderLesTables() {
  await pool.query('SET FOREIGN_KEY_CHECKS = 0')
  for (const table of TABLES_A_VIDER) {
    await pool.query(`TRUNCATE TABLE ${table}`)
  }
  await pool.query('SET FOREIGN_KEY_CHECKS = 1')
}

async function seed() {
  console.log('Peuplement de la base PPE (donnees de demonstration)...')
  await viderLesTables()

  const [ppeResult] = await pool.query('INSERT INTO PPE (nom, adresse) VALUES (?, ?)', [NOM_PPE, ADRESSE_PPE])
  const idPpe = ppeResult.insertId

  const idParLot = {}
  for (const lot of LOTS) {
    const [result] = await pool.query(
      'INSERT INTO Lots (id_ppe, reference, surface, nbr_pieces, quote_part) VALUES (?, ?, ?, ?, ?)',
      [idPpe, lot.reference, lot.surface, lot.nbr_pieces, lot.quote_part],
    )
    idParLot[lot.reference] = result.insertId
  }

  const idParCategorie = {}
  for (const libelle of TOUTES_CATEGORIES) {
    const [result] = await pool.query('INSERT INTO Categories (libelle, types) VALUES (?, ?)', [
      libelle,
      TYPES_PAR_CATEGORIE.get(libelle) ?? 'depense,recette',
    ])
    idParCategorie[libelle] = result.insertId
  }

  const idParEmailUtilisateur = {}
  for (const utilisateur of UTILISATEURS) {
    const hash = await bcrypt.hash(utilisateur.motDePasse, 10)
    const [result] = await pool.query(
      'INSERT INTO Utilisateurs (nom, prenom, email, mot_de_passe) VALUES (?, ?, ?, ?)',
      [utilisateur.nom, utilisateur.prenom, utilisateur.email, hash],
    )
    idParEmailUtilisateur[utilisateur.email] = result.insertId
    await pool.query('INSERT INTO Appartenir (id_utilisateur, id_ppe, role) VALUES (?, ?, ?)', [
      result.insertId,
      idPpe,
      utilisateur.role,
    ])
  }

  const idParProjet = {}
  for (const projet of PROJETS) {
    const [result] = await pool.query(
      `INSERT INTO Projets (id_ppe, nom, description, responsable, budget_alloue, progression_manuelle, statut, date_debut, date_fin)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [idPpe, projet.nom, projet.description, projet.responsable, projet.budget_alloue, projet.progressionManuelle, projet.statut, projet.date_debut, projet.date_fin],
    )
    idParProjet[projet.nom] = result.insertId

    let ordre = 0
    for (const etape of projet.etapes) {
      await pool.query(
        'INSERT INTO Etapes_Projets (id_projet, titre, date_etape, statut, ordre) VALUES (?, ?, ?, ?, ?)',
        [result.insertId, etape.titre, etape.date_etape, etape.statut, ordre],
      )
      ordre += 1
    }

    if (projet.depensesEngagees > 0) {
      await pool.query(
        `INSERT INTO Transactions (id_ppe, id_categorie, id_projet, montant, date_transaction, description, type)
         VALUES (?, NULL, ?, ?, ?, ?, 'depense')`,
        [idPpe, result.insertId, projet.depensesEngagees, projet.date_debut, `Dépenses engagées - ${projet.nom}`],
      )
    }
  }

  for (const depense of DEPENSES_HISTORIQUE) {
    await pool.query(
      `INSERT INTO Transactions (id_ppe, id_categorie, montant, date_transaction, description, type)
       VALUES (?, ?, ?, ?, ?, 'depense')`,
      [idPpe, idParCategorie[depense.categorie], depense.montant, `${depense.annee}-07-01`, `Charges ${depense.categorie} ${depense.annee}`],
    )
  }

  for (const transaction of TRANSACTIONS_RECENTES) {
    await pool.query(
      `INSERT INTO Transactions (id_ppe, id_categorie, montant, date_transaction, description, type)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [idPpe, idParCategorie[transaction.categorie], transaction.montant, transaction.date, transaction.description, transaction.type],
    )
  }

  const [budgetResult] = await pool.query(
    `INSERT INTO Budgets_Annuels (id_ppe, annee, prevision_budget, date_creation, statut)
     VALUES (?, ?, ?, CURDATE(), 'approuve')`,
    [idPpe, ANNEE_BUDGET, LIGNES_BUDGET.reduce((total, ligne) => total + ligne.montant, 0)],
  )
  for (const ligne of LIGNES_BUDGET) {
    await pool.query('INSERT INTO Ligne_Budgets (id_budget_annuel, id_categorie, montant) VALUES (?, ?, ?)', [
      budgetResult.insertId,
      idParCategorie[ligne.categorie],
      ligne.montant,
    ])
  }

  const [compteurResult] = await pool.query(
    `INSERT INTO Compteurs (id_ppe, id_lot, type, portee, numero_serie, emplacement, unite)
     VALUES (?, NULL, 'production_pv', 'commun', 'PV-TOIT-01', 'Toiture principale', 'kWh')`,
    [idPpe],
  )

  let indexCumule = 0
  for (const releve of PRODUCTION_PV) {
    indexCumule += releve.productionKwh
    const dateReleve = `${releve.annee}-${String(releve.mois).padStart(2, '0')}-01`
    await pool.query(
      `INSERT INTO Releves (id_compteur, date_releve, index_releve, consommation, cout, revenu)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [compteurResult.insertId, dateReleve, indexCumule, releve.productionKwh, releve.chargesChf, releve.revenuChf],
    )
  }

  console.log('Terminé.')
  console.log(`  - PPE #${idPpe} : ${NOM_PPE}`)
  console.log(`  - ${LOTS.length} lots, ${TOUTES_CATEGORIES.length} categories, ${UTILISATEURS.length} utilisateurs`)
  console.log(`  - ${PROJETS.length} projets, ${DEPENSES_HISTORIQUE.length + TRANSACTIONS_RECENTES.length + PROJETS.filter((p) => p.depensesEngagees > 0).length} transactions`)
  console.log(`  - ${PRODUCTION_PV.length} relevés de production photovoltaïque`)
  console.log('')
  console.log('Comptes de connexion (email / mot de passe) :')
  for (const utilisateur of UTILISATEURS) {
    console.log(`  - ${utilisateur.email} / ${utilisateur.motDePasse} (${utilisateur.role})`)
  }
}

seed()
  .then(() => pool.end())
  .catch((error) => {
    console.error('Erreur pendant le seed :', error)
    return pool.end().finally(() => process.exit(1))
  })
