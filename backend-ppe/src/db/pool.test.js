import { test } from 'node:test'
import assert from 'node:assert'

// --- KAN-35 / TV-09 : avecTransaction, teste avec une fausse connexion ---
// env.js exige ces variables ; aucune connexion reelle n'est ouverte ici.
process.env.DB_USER ??= 'test'
process.env.DB_DATABASE ??= 'test'
const { avecTransaction } = await import('./pool.js')

function fausseSource() {
  const appels = []
  const connexion = {
    beginTransaction: async () => appels.push('begin'),
    commit: async () => appels.push('commit'),
    rollback: async () => appels.push('rollback'),
    release: () => appels.push('release'),
  }
  return { appels, source: { getConnection: async () => connexion } }
}

test('TV-09. si tout reussit, la transaction est validee', async () => {
  const { appels, source } = fausseSource()
  const resultat = await avecTransaction(async () => 'ok', source)

  assert.strictEqual(resultat, 'ok')
  assert.deepStrictEqual(appels, ['begin', 'commit', 'release'])
})

test('TV-09. si l ecriture de l historique echoue, l operation est annulee', async () => {
  const { appels, source } = fausseSource()

  await assert.rejects(
    avecTransaction(async () => {
      throw new Error('INSERT INTO Historique a echoue')
    }, source),
    /Historique/,
  )
  assert.deepStrictEqual(appels, ['begin', 'rollback', 'release'])
})
