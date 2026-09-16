import { Router } from 'express'
import { users } from '../data/users.js'
import { encodeToken, requireAuth } from '../middleware/auth.js'

const router = Router()

router.post('/login', (req, res) => {
  const { email = '', role = 'admin' } = req.body ?? {}
  const normalizedEmail = String(email).trim().toLowerCase()
  const normalizedRole = String(role).trim().toLowerCase()
  const user = users[normalizedEmail]

  if (!user) {
    return res.status(404).json({ error: 'Compte introuvable' })
  }

  if (user.role !== normalizedRole) {
    return res.status(403).json({ error: 'Rôle incorrect pour cet utilisateur' })
  }

  const token = encodeToken(user)

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  })
})

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user })
})

export default router
