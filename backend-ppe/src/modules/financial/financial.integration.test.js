import { test, after } from 'node:test'
import assert from 'node:assert'

// --- KAN-26, KAN-29, KAN-30, KAN-32 : coherence des chiffres entre les pages ---
// Necessite MySQL + `npm run seed`. Sans base, les tests sont sautes.
// Lecture seule : ces tests ne creent ni ne modifient aucune donnee.

let contexte = null

try {
  const { pool, verifierConnexionDb } = await import('../../db/pool.js')
  if (await verifierConnexionDb()) {
    const express = (await import('express')).default
    const { authRouter } = await import('../auth/auth.routes.js')
    const { financialRouter, depensesHistoriqueRouter } = await import('./financial.routes.js')
    const { electriciteRouter } = await import('../electricite/electricite.routes.js')

    const app = express()
    app.use(express.json())
    app.use('/api/auth', authRouter)
    app.use('/api/financial', financialRouter)
    app.use('/api/depenses', depensesHistoriqueRouter)
    app.use('/api/electricite', electriciteRouter)
    const serveur = app.listen(0)
    contexte = { pool, serveur, url: `http://localhost:${serveur.address().port}` }
  } else {
    await pool.end()
  }
} catch (error) {
  console.warn('Test d integration financier saute :', error.message)
}

after(async () => {
  if (contexte) {
    contexte.serveur.close()
    await contexte.pool.end()
  }
})

const raisonSaut = 'base de donnees indisponible'
const ANNEE = 2026
let jeton = null

async function lire(chemin, token = jeton) {
  const reponse = await fetch(`${contexte.url}${chemin}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  return { status: reponse.status, data: await reponse.json() }
}

const centimes = (montant) => Math.round(montant * 100)

test('connexion du coproprietaire (consultation)', { skip: !contexte && raisonSaut }, async () => {
  const reponse = await fetch(`${contexte.url}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'coproprietaire@ppe.fr', password: 'coprop1234' }),
  })
  jeton = (await reponse.json()).token
  assert.ok(jeton)
})

test('KAN-12 : ces routes de consultation repondent 401 sans connexion', { skip: !contexte && raisonSaut }, async () => {
  for (const chemin of ['/api/financial/summary', '/api/financial/mensuel', `/api/depenses/historique?anneeDebut=${ANNEE}&anneeFin=${ANNEE}`, '/api/electricite/evolution?annee=2024']) {
    assert.strictEqual((await lire(chemin, null)).status, 401, chemin)
  }
})

test('KAN-30 : les 12 mois du graphique additionnes = les totaux du tableau de bord', { skip: !contexte && raisonSaut }, async () => {
  const { data: resume } = await lire(`/api/financial/summary?annee=${ANNEE}`)
  const { data: mensuel } = await lire(`/api/financial/mensuel?annee=${ANNEE}`)
  assert.strictEqual(mensuel.mois.length, 12)
  assert.deepStrictEqual(mensuel.mois.map((m) => m.mois), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  const recettes = mensuel.mois.reduce((s, m) => s + centimes(m.recettes), 0)
  const depenses = mensuel.mois.reduce((s, m) => s + centimes(m.depenses), 0)
  assert.strictEqual(recettes, centimes(resume.summary.totalIncome))
  assert.strictEqual(depenses, centimes(resume.summary.totalExpenses))
})

test('KAN-29 : l historique compte TOUTES les depenses de l annee, meme sans categorie', { skip: !contexte && raisonSaut }, async () => {
  const { data: resume } = await lire(`/api/financial/summary?annee=${ANNEE}`)
  const { data: historique } = await lire(`/api/depenses/historique?anneeDebut=${ANNEE}&anneeFin=${ANNEE}`)
  const total = historique.reduce((s, ligne) => s + centimes(ligne.montant), 0)
  assert.strictEqual(total, centimes(resume.summary.totalExpenses))
  assert.ok(historique.every((ligne) => typeof ligne.categorie === 'string' && ligne.categorie.length > 0))
})

test('KAN-29 : chaque categorie apparait une seule fois par annee', { skip: !contexte && raisonSaut }, async () => {
  const { data: historique } = await lire('/api/depenses/historique?anneeDebut=2022&anneeFin=2026')
  const cles = historique.map((ligne) => `${ligne.annee}|${ligne.categorie}`)
  assert.strictEqual(new Set(cles).size, cles.length)
  assert.ok(historique.every((ligne) => ligne.annee >= 2022 && ligne.annee <= 2026))
})

test('KAN-32 : la production solaire renvoie un releve par mois, egal a la base', { skip: !contexte && raisonSaut }, async () => {
  const { status, data } = await lire('/api/electricite/evolution?annee=2024')
  assert.strictEqual(status, 200)
  assert.deepStrictEqual(data.map((m) => m.mois), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  const [[base]] = await contexte.pool.query(
    `SELECT COALESCE(SUM(r.consommation), 0) AS production FROM Releves r
     JOIN Compteurs c ON c.id = r.id_compteur
     WHERE c.type = 'production_pv' AND YEAR(r.date_releve) = 2024`,
  )
  assert.strictEqual(data.reduce((s, m) => s + m.productionKwh, 0), Number(base.production))
})

test('KAN-32 : une annee sans releve donne une liste vide (pas d erreur)', { skip: !contexte && raisonSaut }, async () => {
  const { status, data } = await lire('/api/electricite/evolution?annee=2001')
  assert.strictEqual(status, 200)
  assert.deepStrictEqual(data, [])
})

test('KAN-26 : une annee invalide est refusee (400)', { skip: !contexte && raisonSaut }, async () => {
  assert.strictEqual((await lire('/api/financial/summary?annee=abc')).status, 400)
  assert.strictEqual((await lire('/api/financial/mensuel?annee=1800')).status, 400)
})
