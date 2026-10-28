import { test, after } from 'node:test'
import assert from 'node:assert'
import * as XLSX from 'xlsx'

// --- KAN-18 : import des revenus (CSV / Excel) ---
// Necessite MySQL + `npm run seed`. Sans base, les tests sont sautes.
// Les revenus importes par ces tests sont supprimes a la fin.

let contexte = null

try {
  const { pool, verifierConnexionDb } = await import('../../db/pool.js')
  if (await verifierConnexionDb()) {
    const express = (await import('express')).default
    const { authRouter } = await import('../auth/auth.routes.js')
    const { revenusRouter } = await import('./revenus.routes.js')

    const app = express()
    app.use(express.json())
    app.use('/api/auth', authRouter)
    app.use('/api/revenus', revenusRouter)
    const serveur = app.listen(0)
    contexte = { pool, serveur, url: `http://localhost:${serveur.address().port}` }
  } else {
    await pool.end()
  }
} catch (error) {
  console.warn('Test d integration KAN-18 saute :', error.message)
}

const raisonSaut = 'base de donnees indisponible'
const etat = { admin: null, coproprietaire: null, ids: [] }

after(async () => {
  if (!contexte) return
  if (etat.ids.length) await contexte.pool.query('DELETE FROM Transactions WHERE id IN (?)', [etat.ids])
  contexte.serveur.close()
  await contexte.pool.end()
})

async function connecter(email, password) {
  const reponse = await fetch(`${contexte.url}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  return (await reponse.json()).token
}

async function importer(token, contenu, nomFichier, type) {
  const formulaire = new FormData()
  formulaire.append('fichier', new Blob([contenu], { type }), nomFichier)
  const reponse = await fetch(`${contexte.url}/api/revenus/import`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formulaire,
  })
  return { status: reponse.status, data: await reponse.json() }
}

async function nombreRevenus() {
  const [[ligne]] = await contexte.pool.query("SELECT COUNT(*) AS n FROM Transactions WHERE type = 'recette'")
  return Number(ligne.n)
}

test('connexion des comptes de demonstration', { skip: !contexte && raisonSaut }, async () => {
  etat.admin = await connecter('admin@ppe.fr', 'admin1234')
  etat.coproprietaire = await connecter('coproprietaire@ppe.fr', 'coprop1234')
  assert.ok(etat.admin && etat.coproprietaire)
})

test('KAN-18 : import CSV valide -> toutes les lignes creees (dates JJ/MM/AAAA comprises)', { skip: !contexte && raisonSaut }, async () => {
  const csv = 'montant,date,categorie,appartement\n111.10,04/03/2026,Loyers,A1\n222.20,2026-03-05,Loyers,B2\n'
  const { status, data } = await importer(etat.admin, csv, 'revenus.csv', 'text/csv')
  assert.strictEqual(status, 201, JSON.stringify(data))
  assert.strictEqual(data.importes, 2)
  etat.ids.push(...data.revenus.map((r) => r.id))
  // 04/03/2026 = 4 mars (format suisse), pas le 3 avril
  assert.deepStrictEqual(data.revenus.map((r) => r.date), ['2026-03-04', '2026-03-05'])
})

test('KAN-18 : CSV exporte par Excel en Suisse (separateur ; et virgule decimale)', { skip: !contexte && raisonSaut }, async () => {
  const csv = 'montant;date;categorie;appartement\n1234,55;15/06/2026;Loyers;B1\n'
  const { status, data } = await importer(etat.admin, csv, 'export-excel.csv', 'text/csv')
  assert.strictEqual(status, 201, JSON.stringify(data))
  etat.ids.push(...data.revenus.map((r) => r.id))
  assert.strictEqual(data.revenus[0].montant, 1234.55)
  assert.strictEqual(data.revenus[0].date, '2026-06-15')
})

test('KAN-18 : import Excel -> une cellule date garde le bon jour et le bon mois', { skip: !contexte && raisonSaut }, async () => {
  const feuille = XLSX.utils.aoa_to_sheet([
    ['montant', 'date', 'categorie', 'appartement'],
    [333.3, new Date(2026, 2, 4), 'Loyers', 'A3'],
  ], { cellDates: true })
  const classeur = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(classeur, feuille, 'Revenus')
  const contenu = XLSX.write(classeur, { type: 'buffer', bookType: 'xlsx' })
  const { status, data } = await importer(etat.admin, contenu, 'revenus.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  assert.strictEqual(status, 201, JSON.stringify(data))
  etat.ids.push(...data.revenus.map((r) => r.id))
  assert.strictEqual(data.revenus[0].date, '2026-03-04')
})

test('KAN-18 : une ligne invalide -> erreurs par ligne et RIEN n est enregistre', { skip: !contexte && raisonSaut }, async () => {
  const avant = await nombreRevenus()
  const csv = 'montant,date,categorie,appartement\n100,2026-03-01,Loyers,A1\nabc,31/02/2026,Inconnue,Z9\n'
  const { status, data } = await importer(etat.admin, csv, 'revenus.csv', 'text/csv')
  assert.strictEqual(status, 400)
  assert.ok(data.erreurs.every((e) => e.startsWith('Ligne 3')), data.erreurs.join(' | '))
  assert.strictEqual(await nombreRevenus(), avant)
})

test('KAN-18 : un fichier qui n est ni CSV ni Excel, ou vide, est refuse', { skip: !contexte && raisonSaut }, async () => {
  assert.strictEqual((await importer(etat.admin, 'texte', 'notes.txt', 'text/plain')).status, 400)
  assert.strictEqual((await importer(etat.admin, 'montant,date,categorie,appartement\n', 'vide.csv', 'text/csv')).status, 400)
})

test('KAN-18 : le coproprietaire ne peut pas importer (403)', { skip: !contexte && raisonSaut }, async () => {
  const csv = 'montant,date,categorie,appartement\n100,2026-03-01,Loyers,A1\n'
  assert.strictEqual((await importer(etat.coproprietaire, csv, 'revenus.csv', 'text/csv')).status, 403)
})
