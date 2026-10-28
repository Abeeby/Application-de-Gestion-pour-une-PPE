import { test } from 'node:test'
import assert from 'node:assert'
import { getDroitsUtilisateur, verifierDroitProjet, validerProjet } from './projets.validation.js'

// --- KAN-37 (droits) et KAN-38 (validations des projets) : tests sans base ---

const projetValide = {
  titre: 'Rénovation de la cage d’escalier',
  budgetTotal: 12000,
  statut: 'Planifié',
  dateDebut: '2026-11-01',
  dateFin: '2027-02-28',
  responsable: 'Peintures Léman SA',
}

test('KAN-37 : l administrateur a tous les droits sur les projets', () => {
  for (const permission of ['read', 'create', 'update', 'delete']) {
    assert.strictEqual(verifierDroitProjet('admin', permission), true, permission)
  }
})

test('KAN-37 : le coproprietaire peut seulement consulter', () => {
  assert.strictEqual(verifierDroitProjet('owner', 'read'), true)
  for (const permission of ['create', 'update', 'delete']) {
    assert.strictEqual(verifierDroitProjet('owner', permission), false, permission)
  }
})

test('KAN-37 : un role inconnu ou absent n a aucun droit', () => {
  for (const role of [undefined, null, '', 'comite', 'ADMIN']) {
    assert.strictEqual(verifierDroitProjet(role, 'read'), false, String(role))
  }
})

test('KAN-37 : les droits envoyes a l interface correspondent au role', () => {
  const admin = getDroitsUtilisateur('admin')
  assert.deepStrictEqual(
    { canRead: admin.canRead, canCreate: admin.canCreate, canEdit: admin.canEdit, canDelete: admin.canDelete, roleLabel: admin.roleLabel },
    { canRead: true, canCreate: true, canEdit: true, canDelete: true, roleLabel: 'Administrateur' },
  )
  const coproprietaire = getDroitsUtilisateur('owner')
  assert.deepStrictEqual(
    { canRead: coproprietaire.canRead, canCreate: coproprietaire.canCreate, canEdit: coproprietaire.canEdit, canDelete: coproprietaire.canDelete, roleLabel: coproprietaire.roleLabel },
    { canRead: true, canCreate: false, canEdit: false, canDelete: false, roleLabel: 'Copropriétaire' },
  )
  assert.strictEqual(getDroitsUtilisateur(undefined).roleLabel, 'Visiteur')
})

test('KAN-38 : un projet complet est accepte', () => {
  assert.deepStrictEqual(validerProjet(projetValide), [])
})

test('KAN-38 : un projet sans nom est refuse', () => {
  const erreurs = validerProjet({ ...projetValide, titre: '  ' })
  assert.ok(erreurs.some((e) => e.includes('titre')), erreurs.join(' | '))
})

test('KAN-38 : un titre trop court ou plus long que la colonne SQL (80) est refuse', () => {
  assert.ok(validerProjet({ ...projetValide, titre: 'Ab' }).some((e) => e.includes('3 caractères')))
  assert.ok(validerProjet({ ...projetValide, titre: 'x'.repeat(81) }).some((e) => e.includes('80')))
  assert.deepStrictEqual(validerProjet({ ...projetValide, titre: 'x'.repeat(80) }), [])
})

test('KAN-38 : un budget nul, negatif ou non numerique est refuse', () => {
  for (const budgetTotal of [0, -500, 'abc', '', null]) {
    const erreurs = validerProjet({ ...projetValide, budgetTotal })
    assert.ok(erreurs.some((e) => e.includes('budget')), `${budgetTotal} -> ${erreurs.join(' | ')}`)
  }
})

test('KAN-38 : statut inconnu, progression hors 0-100 et responsable absent sont refuses', () => {
  assert.ok(validerProjet({ ...projetValide, statut: 'Fini' }).some((e) => e.includes('statut')))
  assert.ok(validerProjet({ ...projetValide, progression: 120 }).some((e) => e.includes('progression')))
  assert.ok(validerProjet({ ...projetValide, responsable: '' }).some((e) => e.includes('responsable')))
})

test('KAN-38 : une date impossible ou une fin avant le debut est refusee', () => {
  assert.ok(validerProjet({ ...projetValide, dateDebut: '2026-02-31' }).some((e) => e.includes('date de début')))
  assert.ok(validerProjet({ ...projetValide, dateFin: '2026-10-01' }).some((e) => e.includes('antérieure')))
})

test('KAN-38 : une modification partielle n exige pas tous les champs', () => {
  assert.deepStrictEqual(validerProjet({ progression: 40 }, { isUpdate: true }), [])
  assert.ok(validerProjet({ titre: '' }, { isUpdate: true }).length > 0)
})

test('KAN-38 : les etapes du projet sont validees avant d aller en base', () => {
  assert.deepStrictEqual(validerProjet({ ...projetValide, etapes: [{ titre: 'Devis', date: '2026-11-15', statut: 'En attente' }] }), [])
  const erreurs = validerProjet({ ...projetValide, etapes: [{ titre: '', date: '2026-13-01', statut: 'Bientôt' }] })
  assert.strictEqual(erreurs.length, 3, erreurs.join(' | '))
  assert.ok(validerProjet({ ...projetValide, etapes: 'pas une liste' }).some((e) => e.includes('liste')))
})
