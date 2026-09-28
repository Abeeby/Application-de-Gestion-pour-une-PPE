import { test, beforeEach } from 'node:test'
import assert from 'node:assert'
import { ajouterRevenu, appartementsRevenus, categoriesRevenus, normaliserDateImport, validerRevenu, viderRevenus, revenus } from './revenus.js'

const revenuValide = {
  montant: 1500,
  date: '2026-09-01',
  categorie: 'Loyers',
  appartement: 'A1',
}

beforeEach(() => {
  viderRevenus()
})

test('accepte un revenu complet', () => {
  assert.deepStrictEqual(validerRevenu(revenuValide), [])
})

test('refuse un revenu incomplet', () => {
  const erreurs = validerRevenu({ montant: 0, date: '', categorie: '', appartement: '' })

  assert.strictEqual(erreurs.length, 4)
})

test('accepte les catégories et appartements prévus', () => {
  assert.ok(categoriesRevenus.includes('Charges de copropriete'))
  assert.ok(appartementsRevenus.includes('Parties communes'))
})

test('enregistre un revenu et convertit le montant en nombre', () => {
  const nouveau = ajouterRevenu({ ...revenuValide, montant: '250' })

  assert.strictEqual(nouveau.id, 1)
  assert.strictEqual(nouveau.montant, 250)
  assert.strictEqual(revenus.length, 1)
})

test('convertit les dates francaises jour/mois/annee lors de l’import', () => {
  assert.strictEqual(normaliserDateImport('01/09/2026'), '2026-09-01')
  assert.strictEqual(normaliserDateImport('1/9/26'), '2026-09-01')
})