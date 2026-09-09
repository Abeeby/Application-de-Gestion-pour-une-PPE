import { test } from 'node:test'
import assert from 'node:assert'
import { validerDepense, ajouterSaisie, saisies } from './saisies.js'

// Une depense correcte, pour servir de base aux tests
const depenseValide = {
  montant: 1500,
  date: '2026-09-01',
  categorie: 'Entretien',
  appartement: 'A1',
  justificatif: 'FAC-2026-001',
}

// --- validerDepense ---

test('une depense complete ne donne aucune erreur', () => {
  assert.strictEqual(validerDepense(depenseValide).length, 0)
})

test('refuse un montant vide ou a zero', () => {
  const erreurs = validerDepense({ ...depenseValide, montant: 0 })
  assert.ok(erreurs.length > 0)
})

test('refuse un montant negatif', () => {
  const erreurs = validerDepense({ ...depenseValide, montant: -50 })
  assert.ok(erreurs.length > 0)
})

test('refuse une date manquante', () => {
  const erreurs = validerDepense({ ...depenseValide, date: '' })
  assert.ok(erreurs.length > 0)
})

test('refuse une categorie qui n existe pas', () => {
  const erreurs = validerDepense({ ...depenseValide, categorie: 'Vacances' })
  assert.ok(erreurs.length > 0)
})

test('refuse un appartement qui n existe pas', () => {
  const erreurs = validerDepense({ ...depenseValide, appartement: 'Z9' })
  assert.ok(erreurs.length > 0)
})

test('donne plusieurs erreurs si plusieurs champs sont faux', () => {
  const erreurs = validerDepense({ montant: 0, date: '', categorie: '', appartement: '' })
  assert.strictEqual(erreurs.length, 4)
})

test('accepte un montant envoye en texte par le formulaire', () => {
  const erreurs = validerDepense({ ...depenseValide, montant: '1500' })
  assert.strictEqual(erreurs.length, 0)
})

// --- ajouterSaisie ---

test('ajouterSaisie enregistre la depense dans la liste', () => {
  const avant = saisies.length
  ajouterSaisie(depenseValide)

  assert.strictEqual(saisies.length, avant + 1)
})

test('ajouterSaisie transforme le montant en nombre', () => {
  const nouvelle = ajouterSaisie({ ...depenseValide, montant: '250' })

  assert.strictEqual(nouvelle.montant, 250)
})

test('ajouterSaisie met un justificatif vide si non fourni', () => {
  const nouvelle = ajouterSaisie({ ...depenseValide, justificatif: undefined })

  assert.strictEqual(nouvelle.justificatif, '')
})
