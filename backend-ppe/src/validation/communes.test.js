import { test } from 'node:test'
import assert from 'node:assert'
import { estDateValide, estMontantValide } from './communes.js'

test('date : accepte une vraie date AAAA-MM-JJ', () => {
  assert.strictEqual(estDateValide('2026-10-28'), true)
  assert.strictEqual(estDateValide('2024-02-29'), true) // annee bissextile
})

test('date : refuse les dates inexistantes et les formats libres', () => {
  for (const valeur of ['2026-02-31', '2025-02-29', '2026-13-01', 'hier', '28.10.2026', '', null, undefined, 20261028]) {
    assert.strictEqual(estDateValide(valeur), false, String(valeur))
  }
})

test('montant : accepte les montants positifs avec centimes', () => {
  for (const valeur of [1500, 0.05, '1500', '12.50', '12,50', 99999999.99]) {
    assert.strictEqual(estMontantValide(valeur), true, String(valeur))
  }
})

test('montant : refuse zero, negatif, infini, trop grand et plus de 2 decimales', () => {
  for (const valeur of [0, -10, Infinity, NaN, '1e12', 100000000, 12.345, 'abc', '', null, undefined]) {
    assert.strictEqual(estMontantValide(valeur), false, String(valeur))
  }
})

test('montant : la virgule decimale est convertie avant enregistrement', async () => {
  const { versMontant } = await import('./communes.js')
  assert.strictEqual(versMontant('12,50'), 12.5)
  assert.strictEqual(versMontant(' 1500 '), 1500)
  assert.strictEqual(versMontant(99.9), 99.9)
})
