import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as XLSX from 'xlsx'
import { definirPeriode, calculerRapport } from './rapports.calcul.js'
import { exporterTransactionsCsv, exporterSyntheseCsv } from './rapports.export.js'

const ppe = { nom: 'PPE Exemple', adresse: 'Lausanne' }
const transactions = [
  { id: 1, date: '2026-01-10', type: 'depense', montant: 100, categorieId: 1, categorie: 'Entretien', description: 'Réparation', appartement: 'A1' },
  { id: 2, date: '2026-04-02', type: 'depense', montant: 250, categorieId: 1, categorie: 'Entretien', description: 'Travaux; "porte"\nEntrée', appartement: 'A1', projet: 'Toit', facture: 'F-02' },
  { id: 3, date: '2026-05-01', type: 'recette', montant: 500, categorieId: 3, categorie: 'Charges', description: 'Cotisation' },
  { id: 4, date: '2026-06-30', type: 'depense', montant: 50, categorieId: null, categorie: null, description: 'Divers' },
  { id: 5, date: '2026-07-01', type: 'depense', montant: 900, categorieId: 1, categorie: 'Entretien', description: 'Hors trimestre' },
  { id: 6, date: '2025-12-31', type: 'depense', montant: 800, categorieId: 1, categorie: 'Entretien', description: 'Hors année' },
]

function rapportTrimestre() {
  return calculerRapport({
    ppe, periode: definirPeriode({ type: 'trimestriel', annee: '2026', valeur: '2' }),
    budget: { montant: 1000, statut: 'approuve' },
    lignesBudget: [{ categorieId: 1, categorie: 'Entretien', montant: 300 }, { categorieId: 2, categorie: 'Assurances', montant: 200 }],
    transactions,
  })
}

function lireCsv(csv) {
  const classeur = XLSX.read(csv, { type: 'string', raw: true, FS: ';' })
  return XLSX.utils.sheet_to_json(classeur.Sheets[classeur.SheetNames[0]], { header: 1, defval: '', raw: true })
}

test('les années bissextiles sont prises en compte', () => {
  assert.equal(definirPeriode({ type: 'mensuel', annee: '2024', valeur: '2' }).dateFin, '2024-02-29')
  assert.equal(definirPeriode({ type: 'mensuel', annee: '2026', valeur: '2' }).dateFin, '2026-02-28')
})

test('les périodes couvrent les bonnes bornes', () => {
  const trimestre = definirPeriode({ type: 'trimestriel', annee: '2026', valeur: '4' })
  assert.equal(trimestre.dateDebut, '2026-10-01')
  assert.equal(trimestre.dateFin, '2026-12-31')
  const annuel = definirPeriode({ annee: '2026' })
  assert.equal(annuel.dateDebut, '2026-01-01')
  assert.equal(annuel.dateFin, '2026-12-31')
})

test('les paramètres invalides sont refusés', () => {
  for (const choix of [
    { type: 'inconnu', annee: '2026' }, { annee: '2026abc' }, { annee: '1899' }, { annee: ['2026'] },
    { type: 'mensuel', annee: '2026', valeur: '13' }, { type: 'mensuel', annee: '2026' },
    { type: 'trimestriel', annee: '2026', valeur: '0' }, { type: 'trimestriel', annee: '2026', valeur: '1.5' },
  ]) assert.throws(() => definirPeriode(choix))
})

test('revenus, dépenses et détail couvrent seulement la période choisie', () => {
  const rapport = rapportTrimestre()
  assert.equal(rapport.resume.revenus, 500)
  assert.equal(rapport.resume.depenses, 300)
  assert.equal(rapport.resume.solde, 200)
  assert.equal(rapport.resume.nombreTransactions, 3)
  assert.deepEqual(rapport.transactions.map(t => t.id), [2, 3, 4])
})

test('le cumul remonte à janvier mais exclut les périodes suivantes et les autres années', () => {
  const rapport = rapportTrimestre()
  assert.equal(rapport.resume.depensesCumulees, 400)
  const entretien = rapport.categories.find(c => c.categorie === 'Entretien')
  assert.equal(entretien.depensesCumulees, 350)
  assert.equal(entretien.depensesPeriode, 250)
  assert.equal(entretien.restantAnnuel, -50)
  assert.equal(entretien.tauxUtilisation, 117)
})

test('l’enveloppe annuelle reste distincte du total ventilé et n’est pas proratisée', () => {
  const rapport = rapportTrimestre()
  assert.equal(rapport.budget.montant, 1000)
  assert.equal(rapport.resume.totalLignesBudget, 500)
  assert.equal(rapport.resume.restantEnveloppe, 600)
})

test('les catégories budgétées sans mouvement restent visibles', () => {
  const assurance = rapportTrimestre().categories.find(c => c.categorie === 'Assurances')
  assert.equal(assurance.depensesPeriode, 0)
  assert.equal(assurance.restantAnnuel, 200)
  assert.equal(assurance.tauxUtilisation, 0)
})

test('les dépenses sans catégorie ou sans ligne de budget ne disparaissent pas', () => {
  const rapport = rapportTrimestre()
  const sansCategorie = rapport.categories.find(c => c.categorie === 'Sans catégorie')
  assert.equal(sansCategorie.depensesPeriode, 50)
  assert.equal(sansCategorie.budgetAnnuel, null)
  assert.equal(sansCategorie.restantAnnuel, null)
  assert.equal(rapport.categories.find(c => c.categorie === 'Charges').revenusPeriode, 500)
})

test('sans budget, aucune enveloppe ou disponibilité fictive n’est créée', () => {
  const rapport = calculerRapport({ ppe, periode: definirPeriode({ annee: '2026' }), budget: null, lignesBudget: [], transactions: [] })
  assert.equal(rapport.budget, null)
  assert.equal(rapport.resume.restantEnveloppe, null)
  assert.equal(rapport.resume.depenses, 0)
  assert.deepEqual(rapport.transactions, [])
})

test('les centimes sont conservés sans modifier les données source', () => {
  const data = [0.1, 0.2].map((montant, id) => ({ ...transactions[0], id, montant }))
  const copie = structuredClone(data)
  const rapport = calculerRapport({ ppe, periode: definirPeriode({ annee: '2026' }), budget: { montant: 1, statut: 'en attente' }, lignesBudget: [], transactions: data })
  assert.equal(rapport.resume.depenses, 0.3)
  assert.equal(rapport.resume.restantEnveloppe, 0.7)
  assert.equal(rapport.budget.statut, 'en attente')
  assert.deepEqual(data, copie)
})

test('le CSV conserve accents, séparateurs, guillemets et sauts de ligne', () => {
  const csv = exporterTransactionsCsv(rapportTrimestre())
  assert.ok(csv.startsWith('\uFEFF'))
  const lignes = lireCsv(csv)
  assert.equal(lignes.length, 4)
  assert.equal(lignes[1][4], 'Travaux; "porte"\nEntrée')
  assert.equal(lignes[1][6], 'Toit')
  assert.equal(lignes[1][7], 'F-02')
})

test('les colonnes débit et crédit permettent une reprise comptable', () => {
  const lignes = lireCsv(exporterTransactionsCsv(rapportTrimestre()))
  assert.equal(lignes[1][0], '2')
  assert.equal(lignes[1][8], '250,00')
  assert.equal(lignes[1][9], '')
  assert.equal(lignes[2][8], '')
  assert.equal(lignes[2][9], '500,00')
})

test('le CSV de synthèse distingue budget absent et restant négatif', () => {
  const lignes = lireCsv(exporterSyntheseCsv(rapportTrimestre()))
  const entretien = lignes.find(l => l[3] === 'Entretien')
  assert.equal(entretien[8], '-50,00')
  const sansCategorie = lignes.find(l => l[3] === 'Sans catégorie')
  assert.equal(sansCategorie[4], '')
  assert.equal(sansCategorie[8], '')
})

test('les textes ressemblant à des formules sont neutralisés dans les exports', () => {
  for (const description of ['=1+1', '+SUM(A1)', '-1+1', '@SUM(A1)', '  =1+1']) {
    const rapport = rapportTrimestre()
    rapport.transactions = [{ ...transactions[0], description }]
    assert.equal(lireCsv(exporterTransactionsCsv(rapport))[1][4], "'" + description)
  }
})
