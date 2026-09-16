import { users } from '../data/users.js'

export const encodeToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    exp: Date.now() + 60 * 60 * 1000,
  }

  return Buffer.from(JSON.stringify(payload)).toString('base64url')
}

export const decodeToken = (token) => {
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

export const requireAuth = (req, res, next) => {
  const auth = req.headers.authorization

  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant ou invalide' })
  }

  const payload = decodeToken(auth.replace('Bearer ', ''))

  if (!payload || !users[payload.email]) {
    return res.status(401).json({ error: 'Session invalide' })
  }

  req.user = users[payload.email]
  next()
}

// A utiliser apres requireAuth (a besoin de req.user)
export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Accès refusé pour ce rôle' })
  }

  next()
}
