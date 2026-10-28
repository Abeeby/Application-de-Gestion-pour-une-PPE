import { test } from 'node:test'
import assert from 'node:assert'
import { construireFiltresDepenses } from './depenses.repository.js'

test('construit un filtre de consultation pour projet, appartement et periode', () => {
  const filtres = construireFiltresDepenses({
    projet: 'Rénovation du toit',
    appartement: 'A1',
    dateDebut: '2026-01-01',
    dateFin: '2026-06-30',
  })

  assert.deepStrictEqual(filtres, {
    clauses: [
      'p.nom = ?',
      'l.reference = ?',
      't.date_transaction >= ?',
      't.date_transaction <= ?',
    ],
    valeurs: ['Rénovation du toit', 'A1', '2026-01-01', '2026-06-30'],
  })
})

test('ignore les filtres vides et ne renvoie que les clauses utiles', () => {
  const filtres = construireFiltresDepenses({
    projet: '',
    appartement: 'B2',
    dateDebut: '',
    dateFin: '2026-12-31',
  })

  assert.deepStrictEqual(filtres, {
    clauses: ['l.reference = ?', 't.date_transaction <= ?'],
    valeurs: ['B2', '2026-12-31'],
  })
})

// --- KAN-34 : filtres invalides refuses avant la base (MySQL 8 repondait 500) ---
import { validerFiltresDepenses } from './depenses.repository.js'

test('KAN-34 : des filtres valides ou vides sont acceptes', () => {
  assert.deepStrictEqual(validerFiltresDepenses({}), [])
  assert.deepStrictEqual(validerFiltresDepenses({ dateDebut: '', dateFin: '' }), [])
  assert.deepStrictEqual(validerFiltresDepenses({ dateDebut: '2026-01-01', dateFin: '2026-12-31', projet: 'Rénovation du toit', appartement: 'A1' }), [])
})

test('KAN-34 : une date mal formee ou impossible est refusee', () => {
  for (const dateDebut of ['abc', '2026', '2026-13-45', '2026-02-31', '0']) {
    assert.strictEqual(validerFiltresDepenses({ dateDebut }).length, 1, dateDebut)
  }
  assert.strictEqual(validerFiltresDepenses({ dateFin: ['2026-01-01', '2026-02-01'] }).length, 1)
})

test('KAN-34 : une periode inversee et un filtre en double sont refuses', () => {
  assert.ok(validerFiltresDepenses({ dateDebut: '2026-12-31', dateFin: '2026-01-01' })[0].includes('avant'))
  assert.strictEqual(validerFiltresDepenses({ projet: ['a', 'b'] }).length, 1)
})
