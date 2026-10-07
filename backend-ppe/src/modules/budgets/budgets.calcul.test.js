import { test } from 'node:test'
import assert from 'node:assert'
import {
  actionsPossibles,
  anneesDeReference,
  appliquerTransition,
  estModifiable,
  genererProposition,
  repartirBudgetParLot,
  validerLignes,
} from './budgets.calcul.js'

// --- KAN-15 : tests unitaires du budget annuel (aucune base) ---

// 1. Cycle de vie -----------------------------------------------------------

test('1. un brouillon peut seulement etre soumis', () => {
  assert.deepStrictEqual(actionsPossibles('brouillon'), ['soumettre'])
  assert.strictEqual(appliquerTransition('brouillon', 'soumettre'), 'soumis')
})

test('2. un budget soumis peut etre approuve ou rejete', () => {
  assert.strictEqual(appliquerTransition('soumis', 'approuver'), 'approuve')
  assert.strictEqual(appliquerTransition('soumis', 'rejeter'), 'rejete')
})

test('3. un budget rejete repasse en brouillon pour etre retravaille', () => {
  assert.strictEqual(appliquerTransition('rejete', 'retravailler'), 'brouillon')
})

test('4. on ne peut pas sauter d etape ni toucher a un budget approuve', () => {
  assert.strictEqual(appliquerTransition('brouillon', 'approuver'), null)
  assert.strictEqual(appliquerTransition('approuve', 'retravailler'), null)
  assert.strictEqual(appliquerTransition('approuve', 'rejeter'), null)
  assert.deepStrictEqual(actionsPossibles('approuve'), [])
  assert.strictEqual(appliquerTransition('statut-inconnu', 'soumettre'), null)
})

test('5. seul un brouillon est modifiable', () => {
  assert.strictEqual(estModifiable('brouillon'), true)
  for (const statut of ['soumis', 'approuve', 'rejete']) {
    assert.strictEqual(estModifiable(statut), false, statut)
  }
})

// 2. Generation depuis l'historique ------------------------------------------

test('6. annees de reference = les 3 dernieres annees COMPLETES', () => {
  // En 2026 : l'annee 2026 n'est pas finie, elle ne compte pas
  assert.deepStrictEqual(anneesDeReference(2027, 2026), [2023, 2024, 2025])
  assert.deepStrictEqual(anneesDeReference(2026, 2026), [2023, 2024, 2025])
  // Pour un budget passe, les 3 annees juste avant
  assert.deepStrictEqual(anneesDeReference(2024, 2026), [2021, 2022, 2023])
})

const historique = [
  { annee: 2022, categorie: 'Entretien', montant: 12400 }, // hors reference
  { annee: 2023, categorie: 'Entretien', montant: 13100 },
  { annee: 2024, categorie: 'Entretien', montant: 12800 },
  { annee: 2025, categorie: 'Entretien', montant: 14100 },
  { annee: 2025, categorie: 'Reparations', montant: 9000 }, // une seule annee
  { annee: 2026, categorie: 'Entretien', montant: 2000 }, // annee en cours, incomplete : ignoree
]
const annees = [2023, 2024, 2025]

test('7. montant propose = moyenne des annees de reference + 2 %, arrondi a la dizaine superieure', () => {
  const entretien = genererProposition({ historique, annees }).find((ligne) => ligne.categorie === 'Entretien')
  // (13100 + 12800 + 14100) / 3 = 13333.33 ; x 1.02 = 13599.99 -> 13600
  assert.strictEqual(entretien.moyenneHistorique, 13333.33)
  assert.strictEqual(entretien.montant, 13600)
})

test('8. une annee sans depense compte pour 0 (une depense exceptionnelle ne gonfle pas le budget)', () => {
  const reparations = genererProposition({ historique, annees }).find((ligne) => ligne.categorie === 'Reparations')
  // 9000 / 3 = 3000 ; x 1.02 = 3060
  assert.strictEqual(reparations.montant, 3060)
})

test('9. sans historique, la proposition est vide ; les lignes sont triees par categorie', () => {
  assert.deepStrictEqual(genererProposition({ historique: [], annees }), [])
  assert.deepStrictEqual(
    genererProposition({ historique, annees }).map((ligne) => ligne.categorie),
    ['Entretien', 'Reparations'],
  )
})

// 3. Validation ---------------------------------------------------------------

const categoriesConnues = ['Entretien', 'Assurances', 'Nettoyage']

test('10. des lignes correctes sont acceptees', () => {
  assert.deepStrictEqual(
    validerLignes([{ categorie: 'Entretien', montant: 1000 }, { categorie: 'Assurances', montant: 500.5 }], categoriesConnues),
    [],
  )
})

test('11. budget vide, categorie inconnue, doublon et montant <= 0 sont refuses', () => {
  assert.deepStrictEqual(validerLignes([], categoriesConnues), ['Le budget doit contenir au moins une ligne'])
  assert.deepStrictEqual(validerLignes('pas un tableau', categoriesConnues), ['Le budget doit contenir au moins une ligne'])

  const erreurs = validerLignes(
    [
      { categorie: 'Inconnue', montant: 100 },
      { categorie: 'Entretien', montant: 0 },
      { categorie: 'Entretien', montant: 100 },
    ],
    categoriesConnues,
  )
  assert.strictEqual(erreurs.length, 3)
  assert.match(erreurs[0], /Ligne 1 : catégorie inconnue/)
  assert.match(erreurs[1], /Ligne 2 : le montant/)
  assert.match(erreurs[2], /Ligne 3 : la catégorie « Entretien » apparaît deux fois/)
})

// 4. Repartition par lot -----------------------------------------------------

const lots = [
  { reference: 'A1', quote_part: 50 },
  { reference: 'A2', quote_part: 30 },
  { reference: 'A3', quote_part: 20 },
  { reference: 'Parties communes', quote_part: 0 },
]

test('12. le budget est reparti selon la quote-part, sans le lot technique', () => {
  const repartition = repartirBudgetParLot([{ categorie: 'Entretien', montant: 12000, cle: 'quote_part' }], lots)
  assert.deepStrictEqual(
    repartition.map((lot) => [lot.reference, lot.partAnnuelle, lot.acompteMensuel]),
    [
      ['A1', 6000, 500],
      ['A2', 3600, 300],
      ['A3', 2400, 200],
    ],
  )
})

test('13. une categorie a parts egales est divisee egalement (meme regle que KAN-22)', () => {
  const repartition = repartirBudgetParLot([{ categorie: 'Eau & Electricite', montant: 3000, cle: 'egal' }], lots)
  assert.deepStrictEqual(
    repartition.map((lot) => lot.partAnnuelle),
    [1000, 1000, 1000],
  )
})

test('14. la somme des parts est exactement egale au budget (aucun centime perdu)', () => {
  const lignes = [
    { categorie: 'Entretien', montant: 10000.01, cle: 'quote_part' },
    { categorie: 'Eau & Electricite', montant: 1000, cle: 'egal' },
  ]
  const lotsReels = [
    { reference: 'A1', quote_part: 16.67 },
    { reference: 'A2', quote_part: 16.67 },
    { reference: 'A3', quote_part: 16.67 },
    { reference: 'B1', quote_part: 16.67 },
    { reference: 'B2', quote_part: 16.67 },
    { reference: 'B3', quote_part: 16.65 },
  ]
  const repartition = repartirBudgetParLot(lignes, lotsReels)
  const totalCentimes = repartition.reduce((total, lot) => total + Math.round(lot.partAnnuelle * 100), 0)
  assert.strictEqual(totalCentimes, 1100001)
})
