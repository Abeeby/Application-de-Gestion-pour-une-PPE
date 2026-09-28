import { test, beforeEach, describe } from 'node:test'
import assert from 'node:assert'
import {
  validerProjet,
  estDateValide,
  ajouterProjet,
  modifierProjet,
  supprimerProjet,
  getProjets,
  getProjetById,
  reinitialiserProjets,
  verifierDroitProjet,
  getDroitsUtilisateur,
  ROLES,
  PERMISSIONS,
  statutsProjet,
} from './projets.js'

// Projet de reference valide
const projetValide = {
  titre: 'Isolation thermique façade sud',
  description: 'Pose d un isolant mineral et nouveau crepi.',
  budgetTotal: 45000,
  depense: 12000,
  progression: 25,
  statut: 'En cours',
  dateDebut: '2026-05-01',
  dateFin: '2026-10-31',
  responsable: 'Façades Suisses Sàrl',
}

beforeEach(() => {
  reinitialiserProjets()
})

// ============================================================================
// 1. VALIDATIONS METIER (KAN-38)
// ============================================================================

describe('KAN-38 : Validations des champs et regles metier', () => {
  test('un projet complet et conforme ne retourne aucune erreur', () => {
    const erreurs = validerProjet(projetValide)
    assert.strictEqual(erreurs.length, 0)
  })

  test('accepte un projet sans date de fin et sans description (champs facultatifs)', () => {
    const projetMinimal = {
      titre: 'Changement interphones',
      budgetTotal: 5000,
      statut: 'Planifié',
      dateDebut: '2026-11-01',
      responsable: 'TechElec SA',
    }
    const erreurs = validerProjet(projetMinimal)
    assert.strictEqual(erreurs.length, 0)
  })

  test('refuse un titre absent, vide ou compose uniquement d espaces', () => {
    assert.ok(validerProjet({ ...projetValide, titre: '' }).length > 0)
    assert.ok(validerProjet({ ...projetValide, titre: '   ' }).length > 0)
    assert.ok(validerProjet({ ...projetValide, titre: undefined }).length > 0)
  })

  test('refuse un titre trop court (< 3 caracteres)', () => {
    const erreurs = validerProjet({ ...projetValide, titre: 'AB' })
    assert.ok(erreurs.some((e) => e.includes('au moins 3 caractères')))
  })

  test('refuse un titre trop long (> 100 caracteres)', () => {
    const erreurs = validerProjet({ ...projetValide, titre: 'A'.repeat(101) })
    assert.ok(erreurs.some((e) => e.includes('100 caractères')))
  })

  test('refuse un budget total manquant, nul ou negatif', () => {
    assert.ok(validerProjet({ ...projetValide, budgetTotal: 0 }).length > 0)
    assert.ok(validerProjet({ ...projetValide, budgetTotal: -100 }).length > 0)
    assert.ok(validerProjet({ ...projetValide, budgetTotal: undefined }).length > 0)
  })

  test('refuse un budget total non numerique', () => {
    const erreurs = validerProjet({ ...projetValide, budgetTotal: 'cinq-mille' })
    assert.ok(erreurs.some((e) => e.includes('nombre supérieur à 0')))
  })

  test('refuse un montant depense negatif', () => {
    const erreurs = validerProjet({ ...projetValide, depense: -50 })
    assert.ok(erreurs.some((e) => e.includes('nombre positif ou nul')))
  })

  test('refuse une progression en dehors de l intervalle [0, 100]', () => {
    assert.ok(validerProjet({ ...projetValide, progression: -1 }).length > 0)
    assert.ok(validerProjet({ ...projetValide, progression: 101 }).length > 0)
    assert.ok(validerProjet({ ...projetValide, progression: 'cent' }).length > 0)
  })

  test('accepte les bornes de progression 0% et 100%', () => {
    assert.strictEqual(validerProjet({ ...projetValide, progression: 0 }).length, 0)
    assert.strictEqual(validerProjet({ ...projetValide, progression: 100 }).length, 0)
  })

  test('refuse un statut manquant ou invalide', () => {
    assert.ok(validerProjet({ ...projetValide, statut: '' }).length > 0)
    assert.ok(validerProjet({ ...projetValide, statut: 'StatutInconnu' }).length > 0)
  })

  test('accepte tous les statuts officiels definis dans le cahier des charges', () => {
    for (const s of statutsProjet) {
      assert.strictEqual(validerProjet({ ...projetValide, statut: s }).length, 0)
    }
  })

  test('refuse une date de debut invalide ou au mauvais format', () => {
    assert.ok(validerProjet({ ...projetValide, dateDebut: '' }).length > 0)
    assert.ok(validerProjet({ ...projetValide, dateDebut: '01/05/2026' }).length > 0)
    assert.ok(validerProjet({ ...projetValide, dateDebut: 'date-invalide' }).length > 0)
  })

  test('refuse une date de fin antérieure à la date de début', () => {
    const erreurs = validerProjet({
      ...projetValide,
      dateDebut: '2026-06-01',
      dateFin: '2026-05-01',
    })
    assert.ok(erreurs.some((e) => e.includes('antérieure à la date de début')))
  })

  test('accepte une date de fin égale ou postérieure à la date de début', () => {
    const memeDate = validerProjet({
      ...projetValide,
      dateDebut: '2026-06-01',
      dateFin: '2026-06-01',
    })
    assert.strictEqual(memeDate.length, 0)
  })

  test('refuse un responsable manquant ou trop court', () => {
    assert.ok(validerProjet({ ...projetValide, responsable: '' }).length > 0)
    assert.ok(validerProjet({ ...projetValide, responsable: 'A' }).length > 0)
    assert.ok(validerProjet({ ...projetValide, responsable: undefined }).length > 0)
  })

  test('permet la validation partielle en mode modification (isUpdate = true)', () => {
    const majValide = { progression: 80, statut: 'En cours' }
    assert.strictEqual(validerProjet(majValide, { isUpdate: true }).length, 0)

    const majInvalide = { progression: 150 }
    assert.ok(validerProjet(majInvalide, { isUpdate: true }).length > 0)
  })

  test('cumule plusieurs erreurs si plusieurs champs sont invalides', () => {
    const invalide = {
      titre: 'A',
      budgetTotal: -10,
      statut: 'Inconnu',
      dateDebut: 'non-date',
      responsable: '',
    }
    const erreurs = validerProjet(invalide)
    assert.ok(erreurs.length >= 5)
  })
})

// ============================================================================
// 2. GESTION DES DROITS ET RBAC (KAN-37)
// ============================================================================

describe('KAN-37 : Gestion des droits RBAC pour les projets', () => {
  test('l administrateur (admin) a les droits de lecture, creation, modification et suppression', () => {
    assert.strictEqual(verifierDroitProjet(ROLES.ADMIN, PERMISSIONS.READ), true)
    assert.strictEqual(verifierDroitProjet(ROLES.ADMIN, PERMISSIONS.CREATE), true)
    assert.strictEqual(verifierDroitProjet(ROLES.ADMIN, PERMISSIONS.UPDATE), true)
    assert.strictEqual(verifierDroitProjet(ROLES.ADMIN, PERMISSIONS.DELETE), true)
  })

  test('le coproprietaire (owner) a uniquement le droit de lecture', () => {
    assert.strictEqual(verifierDroitProjet(ROLES.OWNER, PERMISSIONS.READ), true)
    assert.strictEqual(verifierDroitProjet(ROLES.OWNER, PERMISSIONS.CREATE), false)
    assert.strictEqual(verifierDroitProjet(ROLES.OWNER, PERMISSIONS.UPDATE), false)
    assert.strictEqual(verifierDroitProjet(ROLES.OWNER, PERMISSIONS.DELETE), false)
  })

  test('un role inconnu ou non defini n a aucun droit', () => {
    assert.strictEqual(verifierDroitProjet('visiteur', PERMISSIONS.READ), false)
    assert.strictEqual(verifierDroitProjet(null, PERMISSIONS.READ), false)
    assert.strictEqual(verifierDroitProjet(undefined, PERMISSIONS.CREATE), false)
  })

  test('getDroitsUtilisateur retourne la matrice complete pour un administrateur', () => {
    const droits = getDroitsUtilisateur(ROLES.ADMIN)
    assert.deepStrictEqual(droits, {
      role: 'admin',
      canRead: true,
      canCreate: true,
      canEdit: true,
      canDelete: true,
      roleLabel: 'Administrateur',
      estAdmin: true,
      estCoproprietaire: false,
    })
  })

  test('getDroitsUtilisateur retourne la matrice en lecture seule pour un coproprietaire', () => {
    const droits = getDroitsUtilisateur(ROLES.OWNER)
    assert.deepStrictEqual(droits, {
      role: 'owner',
      canRead: true,
      canCreate: false,
      canEdit: false,
      canDelete: false,
      roleLabel: 'Copropriétaire',
      estAdmin: false,
      estCoproprietaire: true,
    })
  })
})

// ============================================================================
// 3. FONCTIONS METIER ET CYCLE DE VIE CRUD
// ============================================================================

describe('KAN-38 : Cycle de vie et operations CRUD des projets', () => {
  test('ajouterProjet enregistre le projet avec un identifiant unique et calculs derives', () => {
    const initialCount = getProjets().length
    const nouveau = ajouterProjet(projetValide)

    assert.ok(nouveau.id.startsWith('proj-'))
    assert.strictEqual(nouveau.titre, projetValide.titre)
    assert.strictEqual(nouveau.budgetTotal, 45000)
    assert.strictEqual(nouveau.depense, 12000)
    assert.strictEqual(nouveau.soldeRestant, 33000)
    assert.strictEqual(getProjets().length, initialCount + 1)
  })

  test('ajouterProjet calcule la progression automatique si non fournie', () => {
    const sansProg = {
      ...projetValide,
      budgetTotal: 100000,
      depense: 40000,
      progression: undefined,
    }
    const cree = ajouterProjet(sansProg)
    assert.strictEqual(cree.progression, 40)
  })

  test('modifierProjet met a jour les informations d un projet existant', () => {
    const nouveau = ajouterProjet(projetValide)
    const maj = modifierProjet(nouveau.id, {
      titre: 'Isolation thermique façade sud (Phase 2)',
      depense: 30000,
      progression: 65,
    })

    assert.strictEqual(maj.titre, 'Isolation thermique façade sud (Phase 2)')
    assert.strictEqual(maj.depense, 30000)
    assert.strictEqual(maj.progression, 65)
    assert.strictEqual(maj.soldeRestant, 15000)
  })

  test('modifierProjet renvoie null si le projet n existe pas', () => {
    const res = modifierProjet('id-inexistant', { titre: 'Test' })
    assert.strictEqual(res, null)
  })

  test('supprimerProjet retire le projet de la liste', () => {
    const nouveau = ajouterProjet(projetValide)
    const countAvant = getProjets().length

    const succes = supprimerProjet(nouveau.id)
    assert.strictEqual(succes, true)
    assert.strictEqual(getProjets().length, countAvant - 1)
    assert.strictEqual(getProjetById(nouveau.id), null)
  })

  test('supprimerProjet renvoie false si le projet n existe pas', () => {
    const succes = supprimerProjet('id-inexistant')
    assert.strictEqual(succes, false)
  })

  test('getProjetById renvoie le projet avec le solde restant et le depassement', () => {
    const p = getProjetById('proj-1')
    assert.ok(p !== null)
    assert.strictEqual(p.id, 'proj-1')
    assert.strictEqual(p.soldeRestant, 85000 - 74800)
    assert.strictEqual(p.depassement, 0)
  })

  test('reinitialiserProjets restaure la liste initiale des projets', () => {
    ajouterProjet(projetValide)
    supprimerProjet('proj-1')
    reinitialiserProjets()

    const liste = getProjets()
    assert.strictEqual(liste.length, 3)
    assert.ok(liste.some((p) => p.id === 'proj-1'))
  })
})
