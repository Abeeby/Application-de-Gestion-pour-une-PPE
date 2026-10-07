import { test, after } from 'node:test'
import assert from 'node:assert'

// --- KAN-15 : test d'integration du cycle de vie du budget ---
// Necessite MySQL + `npm run seed`, sinon les tests sont sautes (meme principe
// que charges.integration.test.js). Utilise l'annee 2099 pour ne pas toucher
// aux budgets du seed, et la supprime a la fin.

const ANNEE_TEST = 2099
let contexte = null

try {
  const { pool, verifierConnexionDb } = await import('../../db/pool.js')
  if (await verifierConnexionDb()) {
    const express = (await import('express')).default
    const { authRouter } = await import('../auth/auth.routes.js')
    const { budgetsRouter } = await import('./budgets.routes.js')

    const app = express()
    app.use(express.json())
    app.use('/api/auth', authRouter)
    app.use('/api/budgets', budgetsRouter)
    const serveur = app.listen(0)
    const url = `http://localhost:${serveur.address().port}`
    await pool.query('DELETE FROM Budgets_Annuels WHERE annee = ?', [ANNEE_TEST])
    contexte = { pool, serveur, url }
  } else {
    await pool.end()
  }
} catch (error) {
  console.warn('Test d integration KAN-15 saute :', error.message)
}

after(async () => {
  if (contexte) {
    await contexte.pool.query('DELETE FROM Budgets_Annuels WHERE annee = ?', [ANNEE_TEST])
    contexte.serveur.close()
    await contexte.pool.end()
  }
})

async function connecter(email, password) {
  const response = await fetch(`${contexte.url}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  return (await response.json()).token
}

async function appeler(token, methode, chemin, corps) {
  const response = await fetch(`${contexte.url}/api/budgets${chemin}`, {
    method: methode,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: corps ? JSON.stringify(corps) : undefined,
  })
  return { status: response.status, body: await response.json() }
}

const raisonSaut = 'base de donnees indisponible'

test('KAN-15 : cycle complet brouillon -> soumis -> approuve, puis budget fige', { skip: !contexte && raisonSaut }, async () => {
  const admin = await connecter('admin@ppe.fr', 'admin1234')

  // 1. Generation depuis l'historique
  const genere = await appeler(admin, 'POST', `/${ANNEE_TEST}/generer`)
  assert.strictEqual(genere.status, 201)
  assert.strictEqual(genere.body.statut, 'brouillon')
  assert.ok(genere.body.lignes.length > 0, 'le seed contient un historique de depenses')
  assert.deepStrictEqual(genere.body.actions, ['soumettre'])

  // 2. La repartition par lot redonne exactement le total du budget
  const totalLots = genere.body.repartition.reduce((total, lot) => total + Math.round(lot.partAnnuelle * 100), 0)
  assert.strictEqual(totalLots, Math.round(genere.body.totalLignes * 100))

  // 3. Modification du brouillon (lignes + enveloppe)
  const modifie = await appeler(admin, 'PUT', `/${ANNEE_TEST}`, {
    lignes: [
      { categorie: 'Entretien', montant: 15000 },
      { categorie: 'Assurances', montant: 9000 },
    ],
    enveloppe: 25000,
  })
  assert.strictEqual(modifie.status, 200)
  assert.strictEqual(modifie.body.totalLignes, 24000)
  assert.strictEqual(modifie.body.ecart, 1000)

  // 4. Impossible d'approuver sans passer par "soumis"
  const tropTot = await appeler(admin, 'POST', `/${ANNEE_TEST}/transition`, { action: 'approuver' })
  assert.strictEqual(tropTot.status, 409)

  // 5. Soumettre puis approuver
  assert.strictEqual((await appeler(admin, 'POST', `/${ANNEE_TEST}/transition`, { action: 'soumettre' })).body.statut, 'soumis')
  const approuve = await appeler(admin, 'POST', `/${ANNEE_TEST}/transition`, { action: 'approuver' })
  assert.strictEqual(approuve.body.statut, 'approuve')
  assert.ok(approuve.body.dateApprobation, 'la date d approbation est enregistree')

  // 6. Un budget approuve est fige
  assert.strictEqual((await appeler(admin, 'PUT', `/${ANNEE_TEST}`, { enveloppe: 1 })).status, 409)
  assert.strictEqual((await appeler(admin, 'POST', `/${ANNEE_TEST}/generer`)).status, 409)
})

test('KAN-15 : le coproprietaire ne voit pas un brouillon', { skip: !contexte && raisonSaut }, async () => {
  const admin = await connecter('admin@ppe.fr', 'admin1234')
  const copro = await connecter('coproprietaire@ppe.fr', 'coprop1234')
  await contexte.pool.query('DELETE FROM Budgets_Annuels WHERE annee = ?', [ANNEE_TEST])
  await appeler(admin, 'POST', `/${ANNEE_TEST}/generer`)

  assert.strictEqual((await appeler(copro, 'GET', `/${ANNEE_TEST}`)).status, 404)
  const liste = await appeler(copro, 'GET', '')
  assert.ok(!liste.body.budgets.some((budget) => budget.annee === ANNEE_TEST))

  // Une fois soumis a l'assemblee, il le voit (en lecture seule)
  await appeler(admin, 'POST', `/${ANNEE_TEST}/transition`, { action: 'soumettre' })
  const visible = await appeler(copro, 'GET', `/${ANNEE_TEST}`)
  assert.strictEqual(visible.status, 200)
  assert.deepStrictEqual(visible.body.actions, [])
  assert.strictEqual(visible.body.modifiable, false)
})

test('KAN-15 : le coproprietaire consulte mais ne peut rien modifier', { skip: !contexte && raisonSaut }, async () => {
  const copro = await connecter('coproprietaire@ppe.fr', 'coprop1234')

  const lecture = await appeler(copro, 'GET', '')
  assert.strictEqual(lecture.status, 200)

  assert.strictEqual((await appeler(copro, 'POST', `/${ANNEE_TEST}/generer`)).status, 403)
  assert.strictEqual((await appeler(copro, 'POST', `/${ANNEE_TEST}/transition`, { action: 'soumettre' })).status, 403)
})

test('KAN-15 : lignes invalides refusees avec des messages clairs', { skip: !contexte && raisonSaut }, async () => {
  const admin = await connecter('admin@ppe.fr', 'admin1234')
  await contexte.pool.query('DELETE FROM Budgets_Annuels WHERE annee = ?', [ANNEE_TEST])
  await appeler(admin, 'POST', `/${ANNEE_TEST}/generer`)

  const refuse = await appeler(admin, 'PUT', `/${ANNEE_TEST}`, { lignes: [{ categorie: 'Inexistante', montant: -5 }] })
  assert.strictEqual(refuse.status, 400)
  assert.strictEqual(refuse.body.erreurs.length, 2)
})
