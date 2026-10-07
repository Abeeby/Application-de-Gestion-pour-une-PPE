import { test } from 'node:test'
import assert from 'node:assert'
import { LONGUEUR_MIN_SECRET, resoudreSecret, signerToken, verifierToken } from './auth.token.js'

// --- KAN-12 : tests unitaires du token signe (aucune base, aucun .env) ---

const SECRET = 'a'.repeat(LONGUEUR_MIN_SECRET)
const AUTRE_SECRET = 'b'.repeat(LONGUEUR_MIN_SECRET)
const MAINTENANT = 1_800_000_000_000
const payloadValide = { email: 'admin@ppe.fr', exp: MAINTENANT + 60_000 }

test('un token signe par le serveur est accepte et rend son contenu', () => {
  const token = signerToken(payloadValide, SECRET)
  assert.deepStrictEqual(verifierToken(token, SECRET, MAINTENANT), payloadValide)
})

test('le token a deux morceaux separes par un point (contenu.signature)', () => {
  const token = signerToken(payloadValide, SECRET)
  assert.strictEqual(token.split('.').length, 2)
})

test('FAILLE CORRIGEE : un faux token fabrique a la main (ancien format) est refuse', () => {
  // C'est exactement l'attaque qui marchait avant KAN-12 : encoder soi-meme
  // { email: admin } en base64, sans connaitre aucun mot de passe.
  const fauxToken = Buffer.from(JSON.stringify({ email: 'admin@ppe.fr', exp: 9e15 })).toString('base64url')
  assert.strictEqual(verifierToken(fauxToken, SECRET, MAINTENANT), null)
})

test('changer l email dans un vrai token casse la signature', () => {
  const token = signerToken({ email: 'coproprietaire@ppe.fr', exp: MAINTENANT + 60_000 }, SECRET)
  const [, signature] = token.split('.')
  const contenuModifie = Buffer.from(JSON.stringify({ email: 'admin@ppe.fr', exp: MAINTENANT + 60_000 })).toString(
    'base64url',
  )
  assert.strictEqual(verifierToken(`${contenuModifie}.${signature}`, SECRET, MAINTENANT), null)
})

test('repousser la date d expiration casse aussi la signature', () => {
  const token = signerToken(payloadValide, SECRET)
  const [, signature] = token.split('.')
  const contenuModifie = Buffer.from(JSON.stringify({ ...payloadValide, exp: 9e15 })).toString('base64url')
  assert.strictEqual(verifierToken(`${contenuModifie}.${signature}`, SECRET, MAINTENANT), null)
})

test('un token signe avec un autre secret est refuse', () => {
  const token = signerToken(payloadValide, AUTRE_SECRET)
  assert.strictEqual(verifierToken(token, SECRET, MAINTENANT), null)
})

test('un token expire est refuse', () => {
  const token = signerToken({ email: 'admin@ppe.fr', exp: MAINTENANT - 1 }, SECRET)
  assert.strictEqual(verifierToken(token, SECRET, MAINTENANT), null)
})

test('un token sans date d expiration est refuse', () => {
  const token = signerToken({ email: 'admin@ppe.fr' }, SECRET)
  assert.strictEqual(verifierToken(token, SECRET, MAINTENANT), null)
})

test('les valeurs absurdes sont refusees sans planter', () => {
  for (const valeur of [undefined, null, '', 'abc', 'a.b.c', '.', 42, {}]) {
    assert.strictEqual(verifierToken(valeur, SECRET, MAINTENANT), null)
  }
})

test('signerToken refuse de signer sans secret', () => {
  assert.throws(() => signerToken(payloadValide, ''))
})

test('resoudreSecret utilise AUTH_SECRET quand il est assez long', () => {
  assert.deepStrictEqual(resoudreSecret(SECRET, 'development'), { secret: SECRET, genere: false })
})

test('resoudreSecret refuse un AUTH_SECRET trop court', () => {
  assert.throws(() => resoudreSecret('court', 'development'), /trop court/)
})

test('resoudreSecret refuse de demarrer en production sans AUTH_SECRET', () => {
  assert.throws(() => resoudreSecret(undefined, 'production'), /obligatoire en production/)
})

test('resoudreSecret genere un secret temporaire en developpement', () => {
  const resultat = resoudreSecret(undefined, 'development', () => 'secret-de-test')
  assert.deepStrictEqual(resultat, { secret: 'secret-de-test', genere: true })
})
