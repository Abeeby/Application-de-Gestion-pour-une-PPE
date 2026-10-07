import { test, after } from 'node:test'
import assert from 'node:assert'

// --- KAN-22 : test d'integration (necessite MySQL + `npm run seed`) ---
// Si la base n'est pas joignable (ou .env absent), le test est saute
// plutot que de faire echouer `npm test` chez quelqu'un sans base.

let contexte = null

try {
  const { pool, verifierConnexionDb } = await import('../../db/pool.js')
  if (await verifierConnexionDb()) {
    const express = (await import('express')).default
    const { authRouter } = await import('../auth/auth.routes.js')
    const { chargesRouter } = await import('./charges.routes.js')

    const app = express()
    app.use(express.json())
    app.use('/api/auth', authRouter)
    app.use('/api/charges', chargesRouter)
    const serveur = app.listen(0)
    const url = `http://localhost:${serveur.address().port}`
    contexte = { pool, serveur, url }
  } else {
    await pool.end()
  }
} catch (error) {
  console.warn('Test d integration KAN-22 saute :', error.message)
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
  return (await response.json()).token
}

const raisonSaut = 'base de donnees indisponible'

test('9. le total des decomptes est egal au total des depenses de l annee', { skip: !contexte && raisonSaut }, async () => {
  const token = await connecter('admin@ppe.fr', 'admin1234')
  const response = await fetch(`${contexte.url}/api/charges/decompte?annee=2026`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  assert.strictEqual(response.status, 200)
  const decompte = await response.json()

  const [[{ total }]] = await contexte.pool.query(
    `SELECT COALESCE(SUM(montant), 0) AS total FROM Transactions
     WHERE id_ppe = 1 AND type = 'depense' AND YEAR(date_transaction) = 2026`,
  )
  const totalLots = decompte.lots.reduce((somme, lot) => somme + Math.round(lot.charges * 100), 0) / 100

  assert.ok(total > 0, 'le seed doit contenir des depenses en 2026')
  assert.strictEqual(decompte.totalDepenses, Number(total))
  assert.strictEqual(totalLots, Number(total))
})

test('9b. un coproprietaire recoit 403, sans token 401', { skip: !contexte && raisonSaut }, async () => {
  const token = await connecter('coproprietaire@ppe.fr', 'coprop1234')
  const avecToken = await fetch(`${contexte.url}/api/charges/decompte?annee=2026`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  assert.strictEqual(avecToken.status, 403)

  const sansToken = await fetch(`${contexte.url}/api/charges/decompte?annee=2026`)
  assert.strictEqual(sansToken.status, 401)
})
