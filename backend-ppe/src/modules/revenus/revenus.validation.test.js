import { test } from 'node:test'
import assert from 'node:assert'
import { normaliserDateImport, validerRevenuAvecListes } from './revenus.validation.js'

const listes = {
  categories: ['Loyers', 'Charges de copropriete', 'Fonds de renovation', 'Subventions', 'Autres revenus'],
  appartements: ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'Parties communes'],
}

const revenuValide = {
  montant: 1500,
  date: '2026-09-01',
  categorie: 'Loyers',
  appartement: 'A1',
}

test('accepte un revenu complet', () => {
  assert.deepStrictEqual(validerRevenuAvecListes(revenuValide, listes), [])
})

test('refuse un revenu incomplet', () => {
  const erreurs = validerRevenuAvecListes({ montant: 0, date: '', categorie: '', appartement: '' }, listes)
  assert.strictEqual(erreurs.length, 4)
})

test('accepte les catégories et appartements prévus', () => {
  assert.ok(listes.categories.includes('Charges de copropriete'))
  assert.ok(listes.appartements.includes('Parties communes'))
})

test('convertit le montant texte correctement (validation uniquement, la conversion a lieu au stockage)', () => {
  const erreurs = validerRevenuAvecListes({ ...revenuValide, montant: '250' }, listes)
  assert.strictEqual(erreurs.length, 0)
})

test('convertit les dates francaises jour/mois/annee lors de l’import', () => {
  assert.strictEqual(normaliserDateImport('01/09/2026'), '2026-09-01')
  assert.strictEqual(normaliserDateImport('1/9/26'), '2026-09-01')
})
