import { test, after } from 'node:test'
import assert from 'node:assert'

// --- KAN-37 (droits) et KAN-38 (tests fonctionnels des projets) ---
// Necessite MySQL + `npm run seed`. Sans base, les tests sont sautes.
// Le projet et les depenses de test sont supprimes a la fin (leurs lignes
// d'historique KAN-35 restent, c'est le comportement voulu).

let contexte = null

try {
  const { pool, verifierConnexionDb } = await import('../../db/pool.js')
  if (await verifierConnexionDb()) {
    const express = (await import('express')).default
    const { authRouter } = await import('../auth/auth.routes.js')
    const { projetsRouter } = await import('./projets.routes.js')
    const { depensesRouter } = await import('../depenses/depenses.routes.js')

    const app = express()
    app.use(express.json())
    app.use('/api/auth', authRouter)
    app.use('/api/projets', projetsRouter)
    app.use('/api/saisies', depensesRouter)
    const serveur = app.listen(0)
    contexte = { pool, serveur, url: `http://localhost:${serveur.address().port}` }
  } else {
    await pool.end()
  }
} catch (error) {
  console.warn('Test d integration KAN-37/38 saute :', error.message)
}

const raisonSaut = 'base de donnees indisponible'
const etat = { admin: null, coproprietaire: null, idProjet: null, idsDepenses: [] }
const titreTest = `Projet test KAN-38 ${Date.now()}`

after(async () => {
  if (!contexte) return
  // Nettoyage : depenses puis projet de test
  for (const id of etat.idsDepenses) await appel('DELETE', `/api/saisies/${id}`, etat.admin)
  if (etat.idProjet) await appel('DELETE', `/api/projets/${etat.idProjet}`, etat.admin)
  contexte.serveur.close()
  await contexte.pool.end()
})

async function appel(methode, chemin, token, corps) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const reponse = await fetch(`${contexte.url}${chemin}`, { method: methode, headers, body: corps ? JSON.stringify(corps) : undefined })
  const texte = await reponse.text()
  return { status: reponse.status, data: texte ? JSON.parse(texte) : null }
}

async function connecter(email, password) {
  const { data } = await appel('POST', '/api/auth/login', null, { email, password })
  return data.token
}

const projet = {
  titre: titreTest,
  description: 'Projet cree par les tests KAN-38',
  budgetTotal: 5000,
  statut: 'Planifié',
  dateDebut: '2026-11-01',
  responsable: 'Tests automatiques',
}

test('connexion des comptes de demonstration', { skip: !contexte && raisonSaut }, async () => {
  etat.admin = await connecter('admin@ppe.fr', 'admin1234')
  etat.coproprietaire = await connecter('coproprietaire@ppe.fr', 'coprop1234')
  assert.ok(etat.admin && etat.coproprietaire)
})

test('KAN-37 : sans connexion, les projets sont inaccessibles (401)', { skip: !contexte && raisonSaut }, async () => {
  assert.strictEqual((await appel('GET', '/api/projets')).status, 401)
  assert.strictEqual((await appel('POST', '/api/projets', null, projet)).status, 401)
})

test('KAN-37 : /droits renvoie les droits du role connecte', { skip: !contexte && raisonSaut }, async () => {
  const admin = await appel('GET', '/api/projets/droits', etat.admin)
  assert.strictEqual(admin.data.droits.canCreate, true)
  const coproprietaire = await appel('GET', '/api/projets/droits', etat.coproprietaire)
  assert.strictEqual(coproprietaire.data.droits.canCreate, false)
  assert.strictEqual(coproprietaire.data.droits.canRead, true)
})

test('KAN-38 : l administrateur cree un projet complet, visible ensuite dans la liste', { skip: !contexte && raisonSaut }, async () => {
  const creation = await appel('POST', '/api/projets', etat.admin, projet)
  assert.strictEqual(creation.status, 201, JSON.stringify(creation.data))
  etat.idProjet = creation.data.id
  const liste = await appel('GET', '/api/projets', etat.coproprietaire)
  assert.strictEqual(liste.status, 200)
  assert.ok(liste.data.some((p) => p.id === etat.idProjet && p.titre === titreTest))
})

test('KAN-38 : un projet sans nom ou avec un budget invalide est refuse (400)', { skip: !contexte && raisonSaut }, async () => {
  const sansNom = await appel('POST', '/api/projets', etat.admin, { ...projet, titre: '' })
  assert.strictEqual(sansNom.status, 400)
  const budgetNegatif = await appel('POST', '/api/projets', etat.admin, { ...projet, budgetTotal: -10 })
  assert.strictEqual(budgetNegatif.status, 400)
})

test('KAN-37 : le coproprietaire consulte mais ne peut ni creer, ni modifier, ni supprimer (403)', { skip: !contexte && raisonSaut }, async () => {
  assert.strictEqual((await appel('GET', `/api/projets/${etat.idProjet}`, etat.coproprietaire)).status, 200)
  assert.strictEqual((await appel('POST', '/api/projets', etat.coproprietaire, projet)).status, 403)
  assert.strictEqual((await appel('PUT', `/api/projets/${etat.idProjet}`, etat.coproprietaire, { progression: 50 })).status, 403)
  assert.strictEqual((await appel('DELETE', `/api/projets/${etat.idProjet}`, etat.coproprietaire)).status, 403)
})

test('KAN-38 : les depenses associees au projet font son cout total (somme exacte)', { skip: !contexte && raisonSaut }, async () => {
  for (const montant of [1200.5, 799.25]) {
    const depense = await appel('POST', '/api/saisies', etat.admin, {
      montant, date: '2026-11-05', categorie: 'Entretien', appartement: 'Parties communes', projet: titreTest, justificatif: 'TEST-KAN-38',
    })
    assert.strictEqual(depense.status, 201, JSON.stringify(depense.data))
    etat.idsDepenses.push(depense.data.id)
  }
  const detail = await appel('GET', `/api/projets/${etat.idProjet}`, etat.admin)
  assert.strictEqual(detail.data.depense, 1999.75)
  assert.strictEqual(detail.data.soldeRestant, 3000.25)
})

test('KAN-38 : l administrateur modifie le projet ; une fin avant le debut est refusee', { skip: !contexte && raisonSaut }, async () => {
  const modification = await appel('PUT', `/api/projets/${etat.idProjet}`, etat.admin, { statut: 'En cours', progression: 30 })
  assert.strictEqual(modification.status, 200)
  assert.strictEqual(modification.data.statut, 'En cours')
  const finAvantDebut = await appel('PUT', `/api/projets/${etat.idProjet}`, etat.admin, { dateFin: '2026-01-01' })
  assert.strictEqual(finAvantDebut.status, 400)
})

test('KAN-38 : identifiant inconnu -> 404, identifiant non numerique -> 400', { skip: !contexte && raisonSaut }, async () => {
  assert.strictEqual((await appel('GET', '/api/projets/999999', etat.admin)).status, 404)
  assert.strictEqual((await appel('GET', '/api/projets/1abc', etat.admin)).status, 400)
  assert.strictEqual((await appel('DELETE', '/api/projets/1abc', etat.admin)).status, 400)
})
