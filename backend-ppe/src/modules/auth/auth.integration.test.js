import { test, after } from 'node:test'
import assert from 'node:assert'

// --- KAN-12 : tests d'integration de la securite (MySQL + `npm run seed`) ---
// Meme principe que charges.integration.test.js : si la base n'est pas
// joignable (ou .env absent), les tests sont sautes au lieu d'echouer.

let contexte = null

try {
  const { pool, verifierConnexionDb } = await import('../../db/pool.js')
  if (await verifierConnexionDb()) {
    const express = (await import('express')).default
    const { authRouter } = await import('./auth.routes.js')
    const { depensesRouter } = await import('../depenses/depenses.routes.js')
    const { revenusRouter } = await import('../revenus/revenus.routes.js')
    const { electriciteRouter } = await import('../electricite/electricite.routes.js')
    const { depensesHistoriqueRouter } = await import('../financial/financial.routes.js')

    const app = express()
    app.use(express.json())
    app.use('/api/auth', authRouter)
    app.use('/api/saisies', depensesRouter)
    app.use('/api/revenus', revenusRouter)
    app.use('/api/electricite', electriciteRouter)
    app.use('/api/depenses', depensesHistoriqueRouter)
    const serveur = app.listen(0)
    const url = `http://localhost:${serveur.address().port}`
    contexte = { pool, serveur, url }
  } else {
    await pool.end()
  }
} catch (error) {
  console.warn('Test d integration KAN-12 saute :', error.message)
}

after(async () => {
  if (contexte) {
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
  return { status: response.status, ...(await response.json()) }
}

const raisonSaut = 'base de donnees indisponible'
const routesLecture = ['/api/saisies', '/api/saisies/options', '/api/revenus', '/api/revenus/options', '/api/electricite/evolution?annee=2024', '/api/depenses/historique']

test('KAN-12 : chaque route de donnees repond 401 sans token', { skip: !contexte && raisonSaut }, async () => {
  for (const route of routesLecture) {
    const response = await fetch(`${contexte.url}${route}`)
    assert.strictEqual(response.status, 401, `${route} devrait etre protegee`)
  }
})

test('KAN-12 : impossible d ajouter une depense sans etre connecte', { skip: !contexte && raisonSaut }, async () => {
  const response = await fetch(`${contexte.url}/api/saisies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ montant: 1, date: '2026-10-01', categorie: 'Entretien', appartement: 'A1' }),
  })
  assert.strictEqual(response.status, 401)
})

test('KAN-12 : un faux token admin fabrique sans mot de passe est refuse', { skip: !contexte && raisonSaut }, async () => {
  const fauxToken = Buffer.from(JSON.stringify({ email: 'admin@ppe.fr', exp: 9e15 })).toString('base64url')
  const me = await fetch(`${contexte.url}/api/auth/me`, { headers: { Authorization: `Bearer ${fauxToken}` } })
  assert.strictEqual(me.status, 401)
})

test('KAN-12 : un mauvais mot de passe est refuse avec un message generique', { skip: !contexte && raisonSaut }, async () => {
  const resultat = await connecter('admin@ppe.fr', 'mauvais')
  assert.strictEqual(resultat.status, 401)
  assert.strictEqual(resultat.error, 'Email ou mot de passe incorrect')
})

test('KAN-12 : admin et coproprietaire connectes peuvent consulter les donnees', { skip: !contexte && raisonSaut }, async () => {
  for (const [email, password] of [['admin@ppe.fr', 'admin1234'], ['coproprietaire@ppe.fr', 'coprop1234']]) {
    const { token, user } = await connecter(email, password)
    assert.ok(token, `${email} doit recevoir un token`)
    assert.ok(['admin', 'owner'].includes(user.role))

    for (const route of routesLecture) {
      const response = await fetch(`${contexte.url}${route}`, { headers: { Authorization: `Bearer ${token}` } })
      assert.strictEqual(response.status, 200, `${email} sur ${route}`)
    }
  }
})

test('KAN-12 : /api/auth/me renvoie l utilisateur du token signe', { skip: !contexte && raisonSaut }, async () => {
  const { token } = await connecter('coproprietaire@ppe.fr', 'coprop1234')
  const response = await fetch(`${contexte.url}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
  assert.strictEqual(response.status, 200)
  const { user } = await response.json()
  assert.strictEqual(user.email, 'coproprietaire@ppe.fr')
  assert.strictEqual(user.role, 'owner')
})
