import { test, after } from 'node:test'
import assert from 'node:assert'

// --- KAN-35 : tests de validation de l'historique (necessite MySQL + `npm run seed`) ---
// Si la base n'est pas joignable (ou .env absent), les tests sont sautes
// plutot que de faire echouer `npm test` chez quelqu'un sans base.
// Les tests s'enchainent (meme projet / meme depense) : ne pas les lancer isolement.
// Le projet et la depense de test sont supprimes a la fin ; leurs lignes
// d'historique restent, c'est justement le but.

let contexte = null

try {
  const { pool, verifierConnexionDb } = await import('../../db/pool.js')
  if (await verifierConnexionDb()) {
    const express = (await import('express')).default
    const { authRouter } = await import('../auth/auth.routes.js')
    const { projetsRouter } = await import('../projets/projets.routes.js')
    const { depensesRouter } = await import('../depenses/depenses.routes.js')
    const { historiqueRouter } = await import('./historique.routes.js')

    const app = express()
    app.use(express.json())
    app.use('/api/auth', authRouter)
    app.use('/api/projets', projetsRouter)
    app.use('/api/saisies', depensesRouter)
    app.use('/api/historique', historiqueRouter)
    const serveur = app.listen(0)
    const url = `http://localhost:${serveur.address().port}`
    contexte = { pool, serveur, url }
  } else {
    await pool.end()
  }
} catch (error) {
  console.warn('Test d integration KAN-35 saute :', error.message)
}

after(async () => {
  if (contexte) {
    contexte.serveur.close()
    await contexte.pool.end()
  }
})

const raisonSaut = 'base de donnees indisponible'
const options = { skip: !contexte && raisonSaut }

// Etat partage entre les tests (ils s'executent dans l'ordre du fichier)
const etat = { tokenAdmin: null, tokenCopro: null, projet: null, depense: null }
const titreProjet = `Projet test KAN-35 ${Date.now()}`

async function connecter(email, password) {
  const response = await fetch(`${contexte.url}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  return (await response.json()).token
}

function appeler(methode, chemin, token, corps) {
  return fetch(`${contexte.url}${chemin}`, {
    method: methode,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    ...(corps && { body: JSON.stringify(corps) }),
  })
}

async function historique(query) {
  const response = await appeler('GET', `/api/historique?${new URLSearchParams(query)}`, etat.tokenAdmin)
  assert.strictEqual(response.status, 200)
  return response.json()
}

async function compterLignesHistorique() {
  const [[{ total }]] = await contexte.pool.query('SELECT COUNT(*) AS total FROM Historique')
  return Number(total)
}

test('connexion des comptes de demonstration', options, async () => {
  etat.tokenAdmin = await connecter('admin@ppe.fr', 'admin1234')
  etat.tokenCopro = await connecter('coproprietaire@ppe.fr', 'coprop1234')
  assert.ok(etat.tokenAdmin && etat.tokenCopro)
})

test('TV-01. la creation d un projet est tracee', options, async () => {
  const response = await appeler('POST', '/api/projets', etat.tokenAdmin, {
    titre: titreProjet,
    description: 'Projet cree par les tests KAN-35',
    responsable: 'Tests automatiques',
    budgetTotal: 50000,
    statut: 'Planifié',
    dateDebut: '2026-10-01',
  })
  assert.strictEqual(response.status, 201)
  etat.projet = await response.json()

  const entrees = await historique({ type: 'projet', idElement: etat.projet.id })
  assert.strictEqual(entrees.length, 1)
  assert.strictEqual(entrees[0].action, 'creation')
  assert.strictEqual(entrees[0].utilisateur.nom, 'Alex Martin')
  assert.match(entrees[0].date, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
  assert.strictEqual(entrees[0].details.apres.titre, titreProjet)
  assert.strictEqual(entrees[0].details.apres.budgetTotal, 50000)
})

test('TV-02. la modification d un projet trace uniquement les champs modifies', options, async () => {
  const response = await appeler('PUT', `/api/projets/${etat.projet.id}`, etat.tokenAdmin, {
    budgetTotal: 60000,
    statut: 'En cours',
  })
  assert.strictEqual(response.status, 200)

  const entrees = await historique({ type: 'projet', idElement: etat.projet.id, action: 'modification' })
  assert.strictEqual(entrees.length, 1)
  assert.deepStrictEqual(entrees[0].details.changements, {
    budgetTotal: { avant: 50000, apres: 60000 },
    statut: { avant: 'Planifié', apres: 'En cours' },
  })
})

test('TV-04. enregistrer un projet sans changement ne cree pas d entree', options, async () => {
  const avant = await compterLignesHistorique()
  const response = await appeler('PUT', `/api/projets/${etat.projet.id}`, etat.tokenAdmin, {
    budgetTotal: 60000,
    statut: 'En cours',
  })
  assert.strictEqual(response.status, 200)
  assert.strictEqual(await compterLignesHistorique(), avant)
})

test('TV-08. une operation refusee (400, 403, 404) ne laisse aucune trace', options, async () => {
  const avant = await compterLignesHistorique()

  const invalide = await appeler('POST', '/api/projets', etat.tokenAdmin, { titre: '' })
  assert.strictEqual(invalide.status, 400)

  const interdit = await appeler('PUT', `/api/projets/${etat.projet.id}`, etat.tokenCopro, { budgetTotal: 1 })
  assert.strictEqual(interdit.status, 403)

  const introuvable = await appeler('DELETE', '/api/projets/999999', etat.tokenAdmin)
  assert.strictEqual(introuvable.status, 404)

  const depenseInvalide = await appeler('POST', '/api/saisies', etat.tokenAdmin, { montant: -5 })
  assert.strictEqual(depenseInvalide.status, 400)

  assert.strictEqual(await compterLignesHistorique(), avant)
})

test('TV-05. la creation d une depense est tracee', options, async () => {
  const response = await appeler('POST', '/api/saisies', etat.tokenAdmin, {
    montant: 1234.5,
    date: '2026-10-02',
    categorie: 'Entretien',
    appartement: 'A1',
    projet: titreProjet,
    justificatif: 'FAC-KAN-35',
  })
  assert.strictEqual(response.status, 201)
  etat.depense = await response.json()

  const entrees = await historique({ type: 'depense', idElement: etat.depense.id })
  assert.strictEqual(entrees.length, 1)
  assert.strictEqual(entrees[0].action, 'creation')
  assert.strictEqual(entrees[0].utilisateur.nom, 'Alex Martin')
  assert.deepStrictEqual(entrees[0].details.apres, {
    montant: 1234.5,
    date: '2026-10-02',
    categorie: 'Entretien',
    appartement: 'A1',
    projet: titreProjet,
    justificatif: 'FAC-KAN-35',
  })
})

test('TV-07. les operations sur une depense apparaissent dans l historique de son projet', options, async () => {
  const entrees = await historique({ idProjet: etat.projet.id })
  const surDepense = entrees.filter((e) => e.typeElement === 'depense' && e.idElement === etat.depense.id)
  assert.strictEqual(surDepense.length, 1)
})

test('TV-12. un coproprietaire ne peut pas supprimer une depense, un visiteur n a acces a rien', options, async () => {
  const copro = await appeler('DELETE', `/api/saisies/${etat.depense.id}`, etat.tokenCopro)
  assert.strictEqual(copro.status, 403)

  const sansTokenDepenses = await appeler('GET', '/api/saisies')
  assert.strictEqual(sansTokenDepenses.status, 401)
})

test('TV-06. la suppression d une depense est tracee avec son etat avant suppression', options, async () => {
  const response = await appeler('DELETE', `/api/saisies/${etat.depense.id}`, etat.tokenAdmin)
  assert.strictEqual(response.status, 200)

  const deuxiemeFois = await appeler('DELETE', `/api/saisies/${etat.depense.id}`, etat.tokenAdmin)
  assert.strictEqual(deuxiemeFois.status, 404)

  const entrees = await historique({ type: 'depense', idElement: etat.depense.id, action: 'suppression' })
  assert.strictEqual(entrees.length, 1)
  assert.strictEqual(entrees[0].details.avant.montant, 1234.5)
  assert.strictEqual(entrees[0].idProjet, etat.projet.id)
})

test('TV-03. la suppression d un projet est tracee et son historique reste consultable', options, async () => {
  const response = await appeler('DELETE', `/api/projets/${etat.projet.id}`, etat.tokenAdmin)
  assert.strictEqual(response.status, 200)

  const entrees = await historique({ type: 'projet', idElement: etat.projet.id })
  assert.deepStrictEqual(
    entrees.map((e) => e.action),
    ['suppression', 'modification', 'creation'],
  )
  assert.strictEqual(entrees[0].details.avant.titre, titreProjet)
  assert.strictEqual(entrees[0].details.avant.budgetTotal, 60000)
})

test('TV-10. l historique est trie du plus recent au plus ancien', options, async () => {
  const entrees = await historique({ idProjet: etat.projet.id })
  assert.strictEqual(entrees.length, 5) // projet : creation, modification, suppression ; depense : creation, suppression

  for (let i = 1; i < entrees.length; i += 1) {
    const precedente = entrees[i - 1]
    const courante = entrees[i]
    assert.ok(
      precedente.date > courante.date || (precedente.date === courante.date && precedente.id > courante.id),
      'ordre decroissant attendu',
    )
  }
})

test('TV-11. les filtres sont appliques et un filtre invalide est refuse', options, async () => {
  const suppressions = await historique({ idProjet: etat.projet.id, action: 'suppression' })
  assert.strictEqual(suppressions.length, 2)
  assert.ok(suppressions.every((e) => e.action === 'suppression'))

  const depenses = await historique({ idProjet: etat.projet.id, type: 'depense' })
  assert.ok(depenses.length === 2 && depenses.every((e) => e.typeElement === 'depense'))

  const futur = await historique({ idProjet: etat.projet.id, du: '2999-01-01' })
  assert.strictEqual(futur.length, 0)

  const invalide = await appeler('GET', '/api/historique?type=facture', etat.tokenAdmin)
  assert.strictEqual(invalide.status, 400)
})

test('TV-12. le coproprietaire peut lire l historique, un visiteur recoit 401', options, async () => {
  const copro = await appeler('GET', '/api/historique', etat.tokenCopro)
  assert.strictEqual(copro.status, 200)

  const sansToken = await appeler('GET', '/api/historique')
  assert.strictEqual(sansToken.status, 401)
})

test('TV-13. aucune entree d historique ne peut etre modifiee ou supprimee', options, async () => {
  const [entree] = await historique({ idProjet: etat.projet.id })

  const modification = await appeler('PUT', `/api/historique/${entree.id}`, etat.tokenAdmin, { action: 'creation' })
  const suppression = await appeler('DELETE', `/api/historique/${entree.id}`, etat.tokenAdmin)
  assert.strictEqual(modification.status, 404)
  assert.strictEqual(suppression.status, 404)

  const toujoursLa = await historique({ idProjet: etat.projet.id })
  assert.strictEqual(toujoursLa.length, 5)
})
