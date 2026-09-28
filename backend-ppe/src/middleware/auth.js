import { decoderToken, recupererUtilisateurPublic } from '../modules/auth/auth.service.js'

/**
 * Verifie le token Bearer et attache l'utilisateur courant (relu en base a
 * chaque requete, pour refleter un changement de role sans devoir se
 * reconnecter) sur req.user.
 */
export async function requireAuth(req, res, next) {
  const auth = req.headers.authorization

  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant ou invalide' })
  }

  const payload = decoderToken(auth.replace('Bearer ', ''))

  if (!payload) {
    return res.status(401).json({ error: 'Session invalide' })
  }

  try {
    const utilisateur = await recupererUtilisateurPublic(payload.email)

    if (!utilisateur) {
      return res.status(401).json({ error: 'Session invalide' })
    }

    req.user = utilisateur
    next()
  } catch (error) {
    next(error)
  }
}

export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Accès refusé pour ce rôle' })
  }

  next()
}
