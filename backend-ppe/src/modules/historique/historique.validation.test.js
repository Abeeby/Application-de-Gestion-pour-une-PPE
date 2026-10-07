import { test } from 'node:test'
import assert from 'node:assert'
import { validerFiltresHistorique } from './historique.validation.js'

// --- KAN-35 : filtres de consultation de l'historique (TV-11), sans base ---

test('TV-11. sans filtre, tout est accepte', () => {
  assert.deepStrictEqual(validerFiltresHistorique({}), { erreurs: [], filtres: {} })
})

test('TV-11. des filtres valides sont convertis', () => {
  const { erreurs, filtres } = validerFiltresHistorique({
    type: 'depense',
    action: 'suppression',
    idElement: '12',
    idProjet: '3',
    du: '2026-01-01',
    au: '2026-12-31',
  })

  assert.deepStrictEqual(erreurs, [])
  assert.deepStrictEqual(filtres, {
    type: 'depense',
    action: 'suppression',
    idElement: 12,
    idProjet: 3,
    du: '2026-01-01',
    au: '2026-12-31',
  })
})

test('TV-11. les parametres vides sont ignores', () => {
  assert.deepStrictEqual(validerFiltresHistorique({ type: '', action: '', du: '' }), { erreurs: [], filtres: {} })
})

test('TV-11. un type ou une action inconnus sont refuses', () => {
  const { erreurs } = validerFiltresHistorique({ type: 'facture', action: 'lecture' })
  assert.strictEqual(erreurs.length, 2)
})

test('TV-11. un identifiant non numerique ou nul est refuse', () => {
  assert.strictEqual(validerFiltresHistorique({ idElement: 'abc' }).erreurs.length, 1)
  assert.strictEqual(validerFiltresHistorique({ idProjet: '0' }).erreurs.length, 1)
  assert.strictEqual(validerFiltresHistorique({ idProjet: '1 OR 1=1' }).erreurs.length, 1)
})

test('TV-11. une periode mal formee ou inversee est refusee', () => {
  assert.strictEqual(validerFiltresHistorique({ du: '01.02.2026' }).erreurs.length, 1)
  assert.strictEqual(validerFiltresHistorique({ du: '2026-12-31', au: '2026-01-01' }).erreurs.length, 1)
})
