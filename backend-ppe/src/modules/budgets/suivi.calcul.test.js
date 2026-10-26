import { test } from 'node:test'
import assert from 'node:assert'
import { calculerSuivi, fractionEcoulee, niveauCategorie } from './suivi.calcul.js'

// --- KAN-17 : tests unitaires du suivi de budget (aucune base) ---

const MI_ANNEE = new Date(2026, 6, 1) // 1er juillet 2026

test('1. part de l annee ecoulee : passee = 1, future = 0, en cours = entre les deux', () => {
  assert.strictEqual(fractionEcoulee(2025, MI_ANNEE), 1)
  assert.strictEqual(fractionEcoulee(2027, MI_ANNEE), 0)
  const fraction = fractionEcoulee(2026, MI_ANNEE)
  assert.ok(fraction > 0.49 && fraction < 0.51, `environ la moitie (${fraction})`)
  assert.strictEqual(fractionEcoulee(2026, new Date(2026, 11, 31)), 1)
})

test('2. consomme > budget -> depasse', () => {
  assert.strictEqual(niveauCategorie({ budget: 1000, consomme: 1000.01, fraction: 0.5 }), 'depasse')
})

test('3. 90 % consomme -> attention (meme si le rythme est bon)', () => {
  assert.strictEqual(niveauCategorie({ budget: 1000, consomme: 900, fraction: 0.95 }), 'attention')
})

test('4. au rythme actuel on depassera -> attention (projection)', () => {
  // mi-annee, deja 600 sur 1000 : projection 1200 > 1000
  assert.strictEqual(niveauCategorie({ budget: 1000, consomme: 600, fraction: 0.5 }), 'attention')
})

test('5. pas de projection pendant le 1er trimestre (evite les fausses alertes de janvier)', () => {
  // en janvier, une grosse facture annuelle d'assurance n'est pas un "rythme"
  assert.strictEqual(niveauCategorie({ budget: 1000, consomme: 400, fraction: 0.1 }), 'ok')
})

test('6. rythme normal -> ok', () => {
  assert.strictEqual(niveauCategorie({ budget: 1000, consomme: 400, fraction: 0.5 }), 'ok')
})

test('7. calculerSuivi : chiffres par categorie et totaux', () => {
  const suivi = calculerSuivi({
    annee: 2026,
    date: MI_ANNEE,
    lignes: [
      { categorie: 'Entretien', montant: 1000 },
      { categorie: 'Assurances', montant: 2000 },
    ],
    depenses: [
      { categorie: 'Entretien', montant: 300 },
      { categorie: 'Assurances', montant: 2100 },
    ],
  })

  const assurances = suivi.categories.find((c) => c.categorie === 'Assurances')
  assert.deepStrictEqual(
    { consomme: assurances.consomme, restant: assurances.restant, taux: assurances.taux, niveau: assurances.niveau },
    { consomme: 2100, restant: -100, taux: 105, niveau: 'depasse' },
  )
  assert.deepStrictEqual(suivi.totaux, { budget: 3000, consomme: 2400, restant: 600, taux: 80, horsBudget: 0 })
})

test('8. une depense sans ligne au budget donne une alerte "hors budget"', () => {
  const suivi = calculerSuivi({
    annee: 2026,
    date: MI_ANNEE,
    lignes: [{ categorie: 'Entretien', montant: 1000 }],
    depenses: [{ categorie: 'Reparations', montant: 450 }],
  })
  assert.strictEqual(suivi.alertes.length, 1)
  assert.strictEqual(suivi.alertes[0].niveau, 'hors_budget')
  assert.match(suivi.alertes[0].message, /Reparations : 450 CHF dépensés sans ligne au budget/)
  assert.strictEqual(suivi.totaux.horsBudget, 450)
})

test('9. les alertes sont triees : depasse, puis attention, puis hors budget', () => {
  const suivi = calculerSuivi({
    annee: 2026,
    date: MI_ANNEE,
    lignes: [
      { categorie: 'A', montant: 1000 }, // ok
      { categorie: 'B', montant: 1000 }, // attention (95 %)
      { categorie: 'C', montant: 1000 }, // depasse
    ],
    depenses: [
      { categorie: 'A', montant: 100 },
      { categorie: 'B', montant: 950 },
      { categorie: 'C', montant: 1200 },
      { categorie: 'D', montant: 50 }, // hors budget
    ],
  })
  assert.deepStrictEqual(
    suivi.alertes.map((a) => [a.categorie, a.niveau]),
    [
      ['C', 'depasse'],
      ['B', 'attention'],
      ['D', 'hors_budget'],
    ],
  )
  assert.match(suivi.alertes[0].message, /C : budget dépassé de 200 CHF \(120 % consommé\)/)
})

test('10. aucune depense -> aucune alerte', () => {
  const suivi = calculerSuivi({ annee: 2026, date: MI_ANNEE, lignes: [{ categorie: 'A', montant: 1000 }], depenses: [] })
  assert.deepStrictEqual(suivi.alertes, [])
  assert.strictEqual(suivi.categories[0].niveau, 'ok')
})
