import { test, after } from 'node:test'
import assert from 'node:assert/strict'

// Test de lecture uniquement, activé explicitement avec PPE_REPORTS_DB_TESTS=1.
// Nécessite une base et les comptes de démonstration ; aucune table n'est vidée.
let contexte = null
if (process.env.PPE_REPORTS_DB_TESTS === '1') {
  const { pool } = await import('../../db/pool.js')
  const express = (await import('express')).default
  const { authRouter } = await import('../auth/auth.routes.js')
  const { rapportsRouter } = await import('./rapports.routes.js')
  const app = express()
  app.use(express.json())
  app.use('/api/auth', authRouter)
  app.use('/api/rapports', rapportsRouter)
  app.use((erreur, req, res, next) => res.status(500).json({ error: erreur.message }))
  const serveur = app.listen(0, '127.0.0.1')
  await new Promise(resolve => serveur.once('listening', resolve))
  contexte = { pool, serveur, url: `http://127.0.0.1:${serveur.address().port}` }
}

after(async () => {
  if (contexte) {
    await new Promise(resolve => contexte.serveur.close(resolve))
    await contexte.pool.end()
  }
})

async function connecter(email, password) {
  const reponse = await fetch(`${contexte.url}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
  assert.equal(reponse.status, 200, 'Le compte de démonstration doit exister')
  return (await reponse.json()).token
}

const options = { skip: !contexte && 'Activer PPE_REPORTS_DB_TESTS=1 pour tester avec MySQL' }

test('rapports et exports sont refusés sans connexion et au copropriétaire', options, async () => {
  const token = await connecter('coproprietaire@ppe.fr', 'coprop1234')
  for (const chemin of ['/api/rapports?annee=2026', '/api/rapports/export?annee=2026']) {
    assert.equal((await fetch(contexte.url + chemin)).status, 401)
    assert.equal((await fetch(contexte.url + chemin, { headers: { Authorization: `Bearer ${token}` } })).status, 403)
  }
})

test('le rapport admin correspond aux totaux réels de la période', options, async () => {
  const token = await connecter('admin@ppe.fr', 'admin1234')
  const reponse = await fetch(`${contexte.url}/api/rapports?type=mensuel&annee=2026&valeur=9`, { headers: { Authorization: `Bearer ${token}` } })
  assert.equal(reponse.status, 200)
  const rapport = await reponse.json()
  const [[totaux]] = await contexte.pool.query("SELECT COALESCE(SUM(CASE WHEN type='depense' THEN montant ELSE 0 END),0) AS depenses, COALESCE(SUM(CASE WHEN type='recette' THEN montant ELSE 0 END),0) AS revenus, COUNT(*) AS nombre FROM Transactions WHERE id_ppe=1 AND date_transaction BETWEEN '2026-09-01' AND '2026-09-30'")
  assert.equal(rapport.resume.depenses, Number(totaux.depenses))
  assert.equal(rapport.resume.revenus, Number(totaux.revenus))
  assert.equal(rapport.transactions.length, Number(totaux.nombre))
})

test('les deux exports sont téléchargeables par l’admin', options, async () => {
  const token = await connecter('admin@ppe.fr', 'admin1234')
  for (const contenu of ['transactions', 'synthese']) {
    const reponse = await fetch(`${contexte.url}/api/rapports/export?annee=2026&contenu=${contenu}`, { headers: { Authorization: `Bearer ${token}` } })
    assert.equal(reponse.status, 200)
    assert.match(reponse.headers.get('content-type'), /text\/csv/)
    assert.match(reponse.headers.get('content-disposition'), new RegExp(`attachment; filename="ppe-${contenu}`))
    const csv = await reponse.text()
    assert.ok(csv.length > 0)
    assert.ok(csv.includes(contenu === 'transactions' ? 'Débit CHF' : 'Budget annuel CHF'))
  }
})

test('les paramètres invalides donnent 400 avant toute génération', options, async () => {
  const token = await connecter('admin@ppe.fr', 'admin1234')
  for (const requete of ['/api/rapports?type=mensuel&annee=2026&valeur=13', '/api/rapports/export?annee=2026&contenu=incorrect']) {
    assert.equal((await fetch(contexte.url + requete, { headers: { Authorization: `Bearer ${token}` } })).status, 400)
  }
})
