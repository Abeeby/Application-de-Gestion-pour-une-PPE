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
