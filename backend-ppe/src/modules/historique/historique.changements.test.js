import { test } from 'node:test'
import assert from 'node:assert'
import { calculerChangements, photoDepense, photoProjet } from './historique.changements.js'

// --- KAN-35 : tests unitaires (sans base de donnees) ---

const projet = {
  id: 7,
  titre: 'Rénovation du toit',
  description: 'Isolation',
  responsable: 'Régie Naef SA',
  budgetTotal: 85000,
  depense: 12000,
  progression: 14,
  statut: 'En cours',
  dateDebut: '2026-01-15',
  dateFin: '2026-11-30',
  etapes: [{ titre: 'Étude', date: '2026-01-15', statut: 'Terminé' }],
  soldeRestant: 73000,
  depassement: 0,
}

test('TV-02. une modification ne garde que les champs modifies, avec ancienne et nouvelle valeur', () => {
  const apres = { ...projet, budgetTotal: 90000, statut: 'Suspendu' }
  const changements = calculerChangements(photoProjet(projet), photoProjet(apres))

  assert.deepStrictEqual(changements, {
    budgetTotal: { avant: 85000, apres: 90000 },
    statut: { avant: 'En cours', apres: 'Suspendu' },
  })
})

test('TV-04. enregistrer sans rien changer ne produit aucun changement', () => {
  assert.deepStrictEqual(calculerChangements(photoProjet(projet), photoProjet({ ...projet })), {})
})

test('TV-04b. les champs calcules (depense, solde) ne comptent pas comme une modification', () => {
  const apres = { ...projet, depense: 20000, soldeRestant: 65000 }
  assert.deepStrictEqual(calculerChangements(photoProjet(projet), photoProjet(apres)), {})
})

test('TV-02b. une etape modifiee est detectee', () => {
  const apres = { ...projet, etapes: [{ titre: 'Étude', date: '2026-01-15', statut: 'En cours' }] }
  const changements = calculerChangements(photoProjet(projet), photoProjet(apres))

  assert.deepStrictEqual(Object.keys(changements), ['etapes'])
})

test('TV-02c. une date de fin videe est detectee (valeur -> null)', () => {
  const apres = { ...projet, dateFin: null }
  assert.deepStrictEqual(calculerChangements(photoProjet(projet), photoProjet(apres)), {
    dateFin: { avant: '2026-11-30', apres: null },
  })
})

test('TV-05. la photo d une depense contient montant, date, categorie, lot, projet et justificatif', () => {
  const depense = {
    id: 3,
    montant: 1500,
    date: '2026-09-01',
    categorie: 'Entretien',
    appartement: 'A1',
    projet: 'Rénovation du toit',
    idProjet: 7,
    justificatif: 'FAC-001',
  }

  assert.deepStrictEqual(photoDepense(depense), {
    montant: 1500,
    date: '2026-09-01',
    categorie: 'Entretien',
    appartement: 'A1',
    projet: 'Rénovation du toit',
    justificatif: 'FAC-001',
  })
})
