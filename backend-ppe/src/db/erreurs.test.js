import { test } from 'node:test'
import assert from 'node:assert'
import { reponsePourErreurSql } from './erreurs.js'

// --- Erreurs SQL traduites en messages clairs (au lieu d'une 500 muette) ---

test('une donnee trop longue ou hors limites donne 400 (la requete est en cause)', () => {
  for (const code of ['ER_DATA_TOO_LONG', 'ER_WARN_DATA_OUT_OF_RANGE', 'ER_TRUNCATED_WRONG_VALUE']) {
    assert.strictEqual(reponsePourErreurSql({ code }).status, 400, code)
  }
})

test('une base creee avec une ancienne version de BD.sql est signalee clairement', () => {
  for (const code of ['ER_NO_SUCH_TABLE', 'ER_BAD_FIELD_ERROR']) {
    const reponse = reponsePourErreurSql({ code })
    assert.strictEqual(reponse.status, 500)
    assert.ok(reponse.corps.error.includes('BD.sql'))
  }
})

test('MySQL arrete ou mauvais mot de passe dans .env -> 503 avec la marche a suivre', () => {
  for (const code of ['ECONNREFUSED', 'ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR']) {
    const reponse = reponsePourErreurSql({ code })
    assert.strictEqual(reponse.status, 503)
    assert.ok(reponse.corps.error.includes('.env'))
  }
})

test('un doublon donne 409 ; une erreur inconnue reste au gestionnaire general', () => {
  assert.strictEqual(reponsePourErreurSql({ code: 'ER_DUP_ENTRY' }).status, 409)
  assert.strictEqual(reponsePourErreurSql({ code: 'ER_PARSE_ERROR' }), null)
  assert.strictEqual(reponsePourErreurSql(new Error('bug')), null)
  assert.strictEqual(reponsePourErreurSql(undefined), null)
})
