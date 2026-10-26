import bcrypt from 'bcryptjs'
import { env } from '../../config/env.js'
import { trouverUtilisateurParEmail } from './auth.repository.js'
import { resoudreSecret, signerToken, verifierToken } from './auth.token.js'

// Secret de signature des tokens, lu une seule fois au chargement.
const { secret: AUTH_SECRET, genere: secretGenere } = resoudreSecret(process.env.AUTH_SECRET, process.env.NODE_ENV)

if (secretGenere) {
  console.warn(
    'Attention : AUTH_SECRET absent du .env, un secret temporaire a ete genere. ' +
      'Les sessions seront perdues au prochain redemarrage (voir .env.example).',
  )
}

// Le schema stocke le role d'acces au format base (Appartenir.role), le
// frontend attend un role applicatif simplifie. 'comite' (membre du comite
// de copropriete) beneficie des memes ecrans que 'owner' pour l'instant.
const ROLE_DB_VERS_APP = {
  admin: 'admin',
  coproprietaire: 'owner',
  comite: 'owner',
}

function versUtilisateurPublic(ligneUtilisateur) {
  return {
    id: ligneUtilisateur.id,
    name: `${ligneUtilisateur.prenom} ${ligneUtilisateur.nom}`,
    email: ligneUtilisateur.email,
    role: ROLE_DB_VERS_APP[ligneUtilisateur.role] ?? 'owner',
  }
}

/**
 * Verifie un couple email/mot de passe contre la base.
 * @returns {Promise<object|null>} l'utilisateur (forme publique) ou null si invalide
 */
export async function authentifier(email, motDePasse) {
  const utilisateur = await trouverUtilisateurParEmail(String(email ?? '').trim().toLowerCase())

  if (!utilisateur) {
    return null
  }

  const motDePasseValide = await bcrypt.compare(String(motDePasse ?? ''), utilisateur.mot_de_passe)

  if (!motDePasseValide) {
    return null
  }

  return versUtilisateurPublic(utilisateur)
}

/**
 * Recupere l'utilisateur courant a partir de son email (utilise par requireAuth
 * pour rafraichir le role a chaque requete plutot que de se fier uniquement au
 * contenu du token).
 */
export async function recupererUtilisateurPublic(email) {
  const utilisateur = await trouverUtilisateurParEmail(email)
  return utilisateur ? versUtilisateurPublic(utilisateur) : null
}

export function encoderToken(utilisateur) {
  const payload = {
    email: utilisateur.email,
    exp: Date.now() + env.auth.tokenTtlMs,
  }

  return signerToken(payload, AUTH_SECRET)
}

/**
 * Renvoie le payload si le token est authentique (signature valide) et non
 * expire, sinon null. Voir auth.token.js pour le detail.
 */
export function decoderToken(token) {
  return verifierToken(token, AUTH_SECRET)
}
