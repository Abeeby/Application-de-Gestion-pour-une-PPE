import { test } from 'node:test'
import assert from 'node:assert'
import { readFile } from 'node:fs/promises'
import { nomBaseCreeeParBdSql, controlerNomBase } from './reset.js'

// npm run reset-db : ces tests ne touchent jamais a la base (la vraie remise
// a zero efface tout, elle n'est donc pas lancee par npm test).

test('le vrai BD.sql recree la base PPE', async () => {
  const sql = await readFile(new URL('../../BD.sql', import.meta.url), 'utf8')
  assert.strictEqual(nomBaseCreeeParBdSql(sql), 'PPE')
})

test('CREATE DATABASE est reconnu avec IF NOT EXISTS et des guillemets inverses', () => {
  assert.strictEqual(nomBaseCreeeParBdSql('CREATE DATABASE IF NOT EXISTS `Demo_2` CHARACTER SET utf8mb4;'), 'Demo_2')
  assert.strictEqual(nomBaseCreeeParBdSql('SELECT 1;'), null)
})

test('.env doit viser la base que BD.sql recree, sinon rien n est fait', () => {
  const sql = 'DROP DATABASE IF EXISTS PPE;\nCREATE DATABASE PPE;'
  assert.strictEqual(controlerNomBase(sql, 'PPE'), null)
  assert.strictEqual(controlerNomBase(sql, 'ppe'), null) // Windows ignore la casse
  assert.match(controlerNomBase(sql, 'autre_base'), /DB_DATABASE=PPE/)
  assert.match(controlerNomBase('SELECT 1;', 'PPE'), /CREATE DATABASE/)
})
