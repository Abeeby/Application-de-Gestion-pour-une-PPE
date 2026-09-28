import bcrypt from 'bcryptjs'
import { env } from '../../config/env.js'
import { trouverUtilisateurParEmail } from './auth.repository.js'

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

  return Buffer.from(JSON.stringify(payload)).toString('base64url')
}

export function decoderToken(token) {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'))

    if (!payload.exp || payload.exp < Date.now()) {
      return null
    }

    return payload
  } catch (error) {
    return null
  }
}
