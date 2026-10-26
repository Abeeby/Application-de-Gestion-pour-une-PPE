import { test } from 'node:test'
import assert from 'node:assert'
import { calculerResume, lireAnnee, validerLigneBudget } from './financial.calcul.js'

// --- KAN-26 : tests unitaires du resume financier (aucune base) ---

const lignesBudget = [
  { planned: 2200, used: 1260 },
  { planned: 1800, used: 870 },
  { planned: 1000, used: 0 },
]

test('le solde de l exercice = recettes - depenses de l annee', () => {
  const resume = calculerResume({ annee: 2026, recettes: 78000, depenses: 77380, lignesBudget })
  assert.strictEqual(resume.totalIncome, 78000)
  assert.strictEqual(resume.totalExpenses, 77380)
  assert.strictEqual(resume.totalBalance, 620)
})

test('le budget utilise est compare au BUDGET vote, pas aux recettes', () => {
  const resume = calculerResume({ annee: 2026, recettes: 78000, depenses: 77380, lignesBudget })
  assert.strictEqual(resume.budgetTotal, 5000)
  assert.strictEqual(resume.budgetUtilise, 2130)
  assert.strictEqual(resume.budgetRestant, 2870)
  assert.strictEqual(resume.budgetUsage, 43) // 2130 / 5000 = 42.6 % -> 43
})

test('sans budget vote, le taux d utilisation vaut 0 (pas de division par zero)', () => {
  const resume = calculerResume({ annee: 2026, recettes: 100, depenses: 50, lignesBudget: [] })
  assert.strictEqual(resume.budgetTotal, 0)
  assert.strictEqual(resume.budgetUsage, 0)
  assert.strictEqual(resume.budgetRestant, 0)
})

test('un depassement de budget donne un reste negatif et un taux > 100 %', () => {
  const resume = calculerResume({ annee: 2026, recettes: 0, depenses: 0, lignesBudget: [{ planned: 1000, used: 1500 }] })
  assert.strictEqual(resume.budgetRestant, -500)
  assert.strictEqual(resume.budgetUsage, 150)
})

test('les montants sont arrondis au centime', () => {
  const resume = calculerResume({ annee: 2026, recettes: 0.1 + 0.2, depenses: 0.1, lignesBudget: [] })
  assert.strictEqual(resume.totalIncome, 0.3)
  assert.strictEqual(resume.totalBalance, 0.2)
})

test('les valeurs venant de MySQL en texte sont converties en nombres', () => {
  const resume = calculerResume({ annee: 2026, recettes: '1500.50', depenses: '500.25', lignesBudget: [{ planned: '1000', used: '250' }] })
  assert.strictEqual(resume.totalBalance, 1000.25)
  assert.strictEqual(resume.budgetUsage, 25)
})

test('l annee du resume est renvoyee pour l affichage ("Revenus 2026")', () => {
  assert.strictEqual(calculerResume({ annee: 2025, recettes: 0, depenses: 0 }).annee, 2025)
})

test('lireAnnee : annee en cours par defaut, annee valide acceptee', () => {
  assert.strictEqual(lireAnnee(undefined, 2026), 2026)
  assert.strictEqual(lireAnnee('', 2026), 2026)
  assert.strictEqual(lireAnnee('2024', 2026), 2024)
})

test('lireAnnee : valeur invalide -> null (la route repond 400)', () => {
  for (const valeur of ['abc', '1999', '2101', '2024.5']) {
    assert.strictEqual(lireAnnee(valeur, 2026), null, valeur)
  }
})

test('validerLigneBudget accepte une ligne correcte', () => {
  assert.deepStrictEqual(validerLigneBudget({ category: 'Entretien', planned: 1800 }), [])
})

test('validerLigneBudget refuse un montant nul, negatif ou absent', () => {
  for (const planned of [0, -100, undefined, '1800']) {
    assert.strictEqual(validerLigneBudget({ category: 'Entretien', planned }).length, 1, String(planned))
  }
})

test('validerLigneBudget refuse une categorie vide', () => {
  assert.deepStrictEqual(validerLigneBudget({ category: '  ', planned: 100 }), ['La catégorie est obligatoire'])
})
