import { test } from 'node:test'
import assert from 'node:assert'
import { calculerDecomptes, statutRapprochement, ventilerDepense } from './charges.calcul.js'

// --- KAN-22 : repartition des charges et rapprochement ---
// Tests unitaires sans base de donnees : les lots sont ceux du seed.

const LOTS_SEED = [
  { reference: 'A1', quote_part: 16.67 },
  { reference: 'A2', quote_part: 16.67 },
  { reference: 'A3', quote_part: 16.67 },
  { reference: 'B1', quote_part: 16.67 },
  { reference: 'B2', quote_part: 16.67 },
  { reference: 'B3', quote_part: 16.65 },
  { reference: 'Parties communes', quote_part: 0 },
]

const somme = (parts) => Math.round(Object.values(parts).reduce((total, part) => total + part, 0) * 100) / 100

test('1. une depense commune est ventilee selon la quote-part', () => {
  const parts = ventilerDepense({ montant: 1000, lot: null, cle: 'quote_part' }, LOTS_SEED)
  assert.deepStrictEqual(parts, {
    A1: 166.7, A2: 166.7, A3: 166.7, B1: 166.7, B2: 166.7, B3: 166.5, 'Parties communes': 0,
  })
})

test('2. la somme des parts tombe juste au centime (10 CHF en parts egales sur 3 lots)', () => {
  const lots = [
    { reference: 'A1', quote_part: 33.33 },
    { reference: 'A2', quote_part: 33.33 },
    { reference: 'A3', quote_part: 33.34 },
  ]
  const parts = ventilerDepense({ montant: 10, lot: null, cle: 'egal' }, lots)
  assert.deepStrictEqual(parts, { A1: 3.34, A2: 3.33, A3: 3.33 })
  assert.strictEqual(somme(parts), 10)
})

test('3. une depense rattachee a un lot est imputee a 100% a ce lot', () => {
  const parts = ventilerDepense({ montant: 450, lot: 'A2', cle: 'quote_part' }, LOTS_SEED)
  assert.strictEqual(parts.A2, 450)
  assert.strictEqual(somme(parts), 450)
})

test('3b. une depense sur « Parties communes » est traitee comme une charge commune', () => {
  const parts = ventilerDepense({ montant: 1000, lot: 'Parties communes', cle: 'quote_part' }, LOTS_SEED)
  assert.strictEqual(parts.A1, 166.7)
  assert.strictEqual(parts['Parties communes'], 0)
})

test('4. une categorie a cle « egal » est repartie a parts egales entre les lots habitables', () => {
  const parts = ventilerDepense({ montant: 1260, lot: null, cle: 'egal' }, LOTS_SEED)
  assert.deepStrictEqual(parts, {
    A1: 210, A2: 210, A3: 210, B1: 210, B2: 210, B3: 210, 'Parties communes': 0,
  })
})

test('5. une transaction liee a une facture du meme montant est rapprochee', () => {
  assert.strictEqual(statutRapprochement({ montant: 1260, montantFacture: 1260 }), 'rapprochee')
})

test('6. une transaction liee a une facture d un autre montant est en ecart', () => {
  assert.strictEqual(statutRapprochement({ montant: 870, montantFacture: 920 }), 'ecart')
})

test('7. une transaction sans facture est sans justificatif', () => {
  assert.strictEqual(statutRapprochement({ montant: 870, montantFacture: null }), 'sans_justificatif')
})

test('8. le decompte d un lot donne charges - acomptes = solde, avec avertissement si non rapproche', () => {
  const lots = [
    { reference: 'A1', quote_part: 50 },
    { reference: 'A2', quote_part: 50 },
  ]
  const depenses = [
    { montant: 1000, categorie: 'Entretien', lot: null, cle: 'quote_part', montantFacture: 1000 },
    { montant: 200, categorie: 'Reparations', lot: 'A2', cle: 'quote_part', montantFacture: null },
  ]
  const acomptes = [
    { lot: 'A1', montant: 400 },
    { lot: 'A2', montant: 600 },
  ]

  const decompte = calculerDecomptes({ depenses, acomptes, lots })
  const [a1, a2] = decompte.lots

  assert.deepStrictEqual(
    { charges: a1.charges, acomptes: a1.acomptes, solde: a1.solde },
    { charges: 500, acomptes: 400, solde: 100 },
  )
  assert.deepStrictEqual(a2.parCategorie, { Entretien: 500, Reparations: 200 })
  assert.strictEqual(a2.solde, 100)
  assert.strictEqual(decompte.totalDepenses, 1200)
  assert.deepStrictEqual(
    { nombre: decompte.avertissement.nombre, montant: decompte.avertissement.montant },
    { nombre: 1, montant: 200 },
  )
})

test('8b. pas d avertissement quand toutes les depenses sont rapprochees', () => {
  const decompte = calculerDecomptes({
    depenses: [{ montant: 100, categorie: 'Entretien', lot: null, cle: 'quote_part', montantFacture: 100 }],
    acomptes: [],
    lots: [{ reference: 'A1', quote_part: 100 }],
  })
  assert.strictEqual(decompte.avertissement, null)
})
