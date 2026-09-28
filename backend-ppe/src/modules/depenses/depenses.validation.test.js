import { test } from 'node:test'
import assert from 'node:assert'
import { validerDepenseAvecListes } from './depenses.validation.js'

// Listes de reference figees pour des tests unitaires sans base de donnees
// (validerDepenseAvecListes ne fait aucun appel DB, contrairement a
// validerDepense() utilisee par les routes).
const listes = {
  categories: ['Entretien', 'Assurances', 'Nettoyage', 'Eau & Electricite', 'Administration', 'Reparations'],
  appartements: ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'Parties communes'],
  projets: ['Rénovation du toit', 'Rénovation de la façade', 'Panneaux solaires'],
}

const depenseValide = {
  montant: 1500,
  date: '2026-09-01',
  categorie: 'Entretien',
  appartement: 'A1',
  justificatif: 'FAC-2026-001',
}

test('une depense complete ne donne aucune erreur', () => {
  assert.strictEqual(validerDepenseAvecListes(depenseValide, listes).length, 0)
})

test('refuse un montant vide ou a zero', () => {
  const erreurs = validerDepenseAvecListes({ ...depenseValide, montant: 0 }, listes)
  assert.ok(erreurs.length > 0)
})

test('refuse un montant negatif', () => {
  const erreurs = validerDepenseAvecListes({ ...depenseValide, montant: -50 }, listes)
  assert.ok(erreurs.length > 0)
})

test('refuse un montant qui n est pas un nombre', () => {
  const erreurs = validerDepenseAvecListes({ ...depenseValide, montant: 'abc' }, listes)
  assert.ok(erreurs.length > 0)
})

test('refuse une date manquante', () => {
  const erreurs = validerDepenseAvecListes({ ...depenseValide, date: '' }, listes)
  assert.ok(erreurs.length > 0)
})

test('refuse une categorie qui n existe pas', () => {
  const erreurs = validerDepenseAvecListes({ ...depenseValide, categorie: 'Vacances' }, listes)
  assert.ok(erreurs.length > 0)
})

test('refuse un appartement qui n existe pas', () => {
  const erreurs = validerDepenseAvecListes({ ...depenseValide, appartement: 'Z9' }, listes)
  assert.ok(erreurs.length > 0)
})

test('refuse un projet qui n existe pas', () => {
  const erreurs = validerDepenseAvecListes({ ...depenseValide, projet: 'Projet Invalide' }, listes)
  assert.ok(erreurs.length > 0)
})

test('donne plusieurs erreurs si plusieurs champs sont faux', () => {
  const erreurs = validerDepenseAvecListes({ montant: 0, date: '', categorie: '', appartement: '' }, listes)
  assert.strictEqual(erreurs.length, 4)
})

test('accepte un montant envoye en texte par le formulaire', () => {
  const erreurs = validerDepenseAvecListes({ ...depenseValide, montant: '1500' }, listes)
  assert.strictEqual(erreurs.length, 0)
})

test('accepte une depense sans justificatif', () => {
  const erreurs = validerDepenseAvecListes({ ...depenseValide, justificatif: '' }, listes)
  assert.strictEqual(erreurs.length, 0)
})

test('accepte une depense sans projet', () => {
  const erreurs = validerDepenseAvecListes({ ...depenseValide, projet: '' }, listes)
  assert.strictEqual(erreurs.length, 0)
})

test('accepte un projet existant', () => {
  const erreurs = validerDepenseAvecListes({ ...depenseValide, projet: 'Panneaux solaires' }, listes)
  assert.strictEqual(erreurs.length, 0)
})
