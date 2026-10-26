// KAN-12 : jeton de session SIGNE (meme principe qu'un JWT HS256).
//
// Avant : le token etait juste { email, exp } encode en base64. Comme rien ne
// prouvait que c'etait le serveur qui l'avait fabrique, n'importe qui pouvait
// ecrire { "email": "admin@ppe.fr" } en base64 et devenir administrateur sans
// mot de passe.
//
// Maintenant : token = <contenu>.<signature>
//   - contenu   = le JSON { email, exp } en base64url (lisible, PAS secret)
//   - signature = HMAC-SHA256(contenu, secret du serveur) en base64url
// Sans connaitre le secret, impossible de calculer la bonne signature : toute
// modification du contenu (changer l'email, repousser exp) est detectee.
//
// Ce fichier ne depend ni de la base ni du .env : le secret est passe en
// parametre, ce qui permet de le tester unitairement (auth.token.test.js).

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export const LONGUEUR_MIN_SECRET = 32

function signer(contenu, secret) {
  return createHmac('sha256', secret).update(contenu).digest('base64url')
}

/**
 * Fabrique un token signe.
 * @param {object} payload ex. { email, exp } (exp = timestamp en ms)
 * @param {string} secret secret du serveur (AUTH_SECRET)
 * @returns {string} "<contenu>.<signature>"
 */
export function signerToken(payload, secret) {
  if (!secret) {
    throw new Error('Secret de signature manquant')
  }

  const contenu = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${contenu}.${signer(contenu, secret)}`
}

/**
 * Verifie un token : signature correcte ET pas expire.
 * @param {string} token
 * @param {string} secret
 * @param {number} [maintenant] injectable pour les tests
 * @returns {object|null} le payload si le token est valide, sinon null
 */
export function verifierToken(token, secret, maintenant = Date.now()) {
  if (typeof token !== 'string' || !secret) {
    return null
  }

  const morceaux = token.split('.')
  if (morceaux.length !== 2) {
    // Rejette aussi les anciens tokens non signes (un seul morceau)
    return null
  }

  const [contenu, signatureRecue] = morceaux
  const signatureAttendue = signer(contenu, secret)

  const recue = Buffer.from(signatureRecue)
  const attendue = Buffer.from(signatureAttendue)

  // timingSafeEqual : compare en temps constant, pour ne pas laisser deviner
  // la signature caractere par caractere en mesurant le temps de reponse.
  if (recue.length !== attendue.length || !timingSafeEqual(recue, attendue)) {
    return null
  }

  try {
    const payload = JSON.parse(Buffer.from(contenu, 'base64url').toString('utf8'))

    if (!payload || typeof payload.exp !== 'number' || payload.exp < maintenant) {
      return null
    }

    return payload
  } catch {
    return null
  }
}

/**
 * Choisit le secret de signature a partir de la variable AUTH_SECRET.
 * - AUTH_SECRET defini (>= 32 caracteres) : on l'utilise.
 * - AUTH_SECRET trop court : erreur (un secret court se devine).
 * - AUTH_SECRET absent en production : erreur (on refuse de demarrer).
 * - AUTH_SECRET absent en developpement : secret aleatoire genere au
 *   demarrage. Ca marche, mais toutes les sessions sont perdues a chaque
 *   redemarrage du backend (il faut se reconnecter).
 * @returns {{ secret: string, genere: boolean }}
 */
export function resoudreSecret(valeurEnv, nodeEnv, genererSecret = () => randomBytes(32).toString('hex')) {
  if (valeurEnv) {
    if (valeurEnv.length < LONGUEUR_MIN_SECRET) {
      throw new Error(`AUTH_SECRET est trop court (${LONGUEUR_MIN_SECRET} caracteres minimum, voir .env.example)`)
    }
    return { secret: valeurEnv, genere: false }
  }

  if (nodeEnv === 'production') {
    throw new Error('AUTH_SECRET est obligatoire en production (voir .env.example)')
  }

  return { secret: genererSecret(), genere: true }
}
