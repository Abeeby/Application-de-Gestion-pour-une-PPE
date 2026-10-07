import { test } from 'node:test'
import assert from 'node:assert/strict'
import { filtrerTransactions, calculerTotaux, depensesParCategorie, evolutionMensuelle } from './calculs.ts'

const transactions = [
  { id: 1, type: 'depense', montant: 100, date: '2026-02-01', categorie: 'Entretien', appartement: 'A1', projet: 'Toit' },
  { id: 2, type: 'depense', montant: 50, date: '2026-01-01', categorie: 'Entretien', appartement: 'A2', projet: 'Toit' },
  { id: 3, type: 'depense', montant: 30, date: '2025-02-01', categorie: 'Assurances', appartement: 'A1', projet: '' },
  { id: 4, type: 'revenu', montant: 200, date: '2026-02-02', categorie: 'Cotisations', appartement: 'A1' },
  { id: 5, type: 'depense', montant: 10, date: '2026-02-03', categorie: null, appartement: null, projet: null },
]
const sansFiltres = { annee: '', categorie: '', appartement: '', projet: '' }

test('sans filtres, toutes les lignes restent visibles', () => {
  assert.deepEqual(filtrerTransactions(transactions, sansFiltres), transactions)
})

test('chaque filtre sélectionne les lignes correspondantes', () => {
  assert.equal(filtrerTransactions(transactions, { ...sansFiltres, annee: '2025' }).length, 1)
  assert.equal(filtrerTransactions(transactions, { ...sansFiltres, categorie: 'Entretien' }).length, 2)
  assert.equal(filtrerTransactions(transactions, { ...sansFiltres, appartement: 'A1' }).length, 3)
  assert.equal(filtrerTransactions(transactions, { ...sansFiltres, projet: 'Toit' }).length, 2)
})

test('les quatre filtres se combinent avec ET', () => {
  const lignes = filtrerTransactions(transactions, { annee: '2026', categorie: 'Entretien', appartement: 'A1', projet: 'Toit' })
  assert.deepEqual(lignes.map(ligne => ligne.id), [1])
  assert.deepEqual(calculerTotaux(lignes), { depenses: 100, revenus: 0, solde: -100 })
})

test('une combinaison sans résultat donne des totaux nuls et des graphiques vides', () => {
  const lignes = filtrerTransactions(transactions, { ...sansFiltres, projet: 'Inconnu' })
  assert.deepEqual(calculerTotaux(lignes), { depenses: 0, revenus: 0, solde: 0 })
  assert.deepEqual(depensesParCategorie(lignes), [])
  assert.deepEqual(evolutionMensuelle(lignes), [])
})

test('le solde utilise les revenus moins les dépenses', () => {
  assert.deepEqual(calculerTotaux(transactions), { depenses: 190, revenus: 200, solde: 10 })
})

test('le graphique par catégorie inclut les dépenses sans catégorie', () => {
  assert.deepEqual(depensesParCategorie(transactions), [
    { categorie: 'Entretien', montant: 150 }, { categorie: 'Assurances', montant: 30 }, { categorie: 'Sans catégorie', montant: 10 },
  ])
})

test('les mois sont triés et les années ne sont pas mélangées', () => {
  assert.deepEqual(evolutionMensuelle(transactions), [
    { mois: '2025-02', depenses: 30, revenus: 0 },
    { mois: '2026-01', depenses: 50, revenus: 0 },
    { mois: '2026-02', depenses: 110, revenus: 200 },
  ])
})

test('les additions préservent les centimes dans tous les calculs', () => {
  const lignes = [0.1, 0.2].map((montant, id) => ({ ...transactions[0], id, montant }))
  assert.equal(calculerTotaux(lignes).depenses, 0.3)
  assert.equal(depensesParCategorie(lignes)[0].montant, 0.3)
  assert.equal(evolutionMensuelle(lignes)[0].depenses, 0.3)
})

test('filtrer et calculer ne modifie pas les données chargées', () => {
  const copie = structuredClone(transactions)
  const lignes = filtrerTransactions(transactions, sansFiltres)
  calculerTotaux(lignes)
  depensesParCategorie(lignes)
  evolutionMensuelle(lignes)
  assert.deepEqual(transactions, copie)
})
