import { test, after } from 'node:test'
import assert from 'node:assert'

// --- KAN-17 : test d'integration du suivi et des alertes ---
// Necessite MySQL + `npm run seed`, sinon saute. Cree un budget et des
// depenses sur l'annee 2001 (annee passee : 100 % ecoulee, resultat stable
// quelle que soit la date du jour) puis les supprime.

const ANNEE_TEST = 2001
const MARQUEUR = 'TEST KAN-17'
let contexte = null

async function nettoyer(pool) {
  await pool.query('DELETE FROM Transactions WHERE description LIKE ?', [`${MARQUEUR}%`])
  await pool.query('DELETE FROM Budgets_Annuels WHERE annee = ?', [ANNEE_TEST])
}

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
    contexte = { pool, serveur, url: `http://localhost:${serveur.address().port}` }

    await nettoyer(pool)
    const [[{ id: idEntretien }]] = await pool.query("SELECT id FROM Categories WHERE libelle = 'Entretien'")
    const [[{ id: idNettoyage }]] = await pool.query("SELECT id FROM Categories WHERE libelle = 'Nettoyage'")
    const [budget] = await pool.query(
      `INSERT INTO Budgets_Annuels (id_ppe, annee, prevision_budget, date_creation, statut, date_approbation)
       VALUES (1, ?, 1000, '2000-12-01', 'approuve', '2000-12-15')`,
      [ANNEE_TEST],
    )
    await pool.query('INSERT INTO Ligne_Budgets (id_budget_annuel, id_categorie, montant) VALUES (?, ?, 1000)', [
      budget.insertId,
      idEntretien,
    ])
    for (const [idCategorie, montant] of [
      [idEntretien, 700],
      [idEntretien, 500], // total Entretien 1200 > 1000 -> depasse
      [idNettoyage, 80], // pas de ligne au budget -> hors budget
    ]) {
      await pool.query(
        `INSERT INTO Transactions (id_ppe, id_categorie, montant, date_transaction, description, type)
         VALUES (1, ?, ?, '${ANNEE_TEST}-06-15', '${MARQUEUR}', 'depense')`,
        [idCategorie, montant],
      )
    }
  } else {
    await pool.end()
  }
} catch (error) {
  console.warn('Test d integration KAN-17 saute :', error.message)
}

after(async () => {
  if (contexte) {
    await nettoyer(contexte.pool)
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

test('KAN-17 : un depassement reel en base declenche une alerte', { skip: !contexte && raisonSaut }, async () => {
  const admin = await connecter('admin@ppe.fr', 'admin1234')
  const response = await fetch(`${contexte.url}/api/budgets/${ANNEE_TEST}/suivi`, {
    headers: { Authorization: `Bearer ${admin}` },
  })
  assert.strictEqual(response.status, 200)
  const suivi = await response.json()

  const entretien = suivi.categories.find((c) => c.categorie === 'Entretien')
  assert.deepStrictEqual(
    { consomme: entretien.consomme, restant: entretien.restant, taux: entretien.taux, niveau: entretien.niveau },
    { consomme: 1200, restant: -200, taux: 120, niveau: 'depasse' },
  )
  assert.deepStrictEqual(
    suivi.alertes.map((a) => [a.categorie, a.niveau]),
    [
      ['Entretien', 'depasse'],
      ['Nettoyage', 'hors_budget'],
    ],
  )
  assert.strictEqual(suivi.statutBudget, 'approuve')
})

test('KAN-17 : suivi reserve a l administrateur', { skip: !contexte && raisonSaut }, async () => {
  const copro = await connecter('coproprietaire@ppe.fr', 'coprop1234')
  const response = await fetch(`${contexte.url}/api/budgets/${ANNEE_TEST}/suivi`, {
    headers: { Authorization: `Bearer ${copro}` },
  })
  assert.strictEqual(response.status, 403)
})

test('KAN-17 : sans budget, une alerte le signale', { skip: !contexte && raisonSaut }, async () => {
  const admin = await connecter('admin@ppe.fr', 'admin1234')
  const response = await fetch(`${contexte.url}/api/budgets/2002/suivi`, { headers: { Authorization: `Bearer ${admin}` } })
  const suivi = await response.json()
  assert.strictEqual(suivi.statutBudget, null)
  assert.match(suivi.alertes[0].message, /Aucun budget pour 2002/)
})
