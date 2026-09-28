import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.js'
import { authentifier, encoderToken } from './auth.service.js'

export const authRouter = Router()

// IMPORTANT (changement de contrat) : le login precedent acceptait un email
// et un role choisi librement (aucune verification reelle). Il exige
// desormais un mot de passe verifie contre le hash stocke en base.
authRouter.post('/login', async (req, res, next) => {
  try {
    const { email = '', password = '' } = req.body ?? {}

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe sont requis' })
    }

    const utilisateur = await authentifier(email, password)

    if (!utilisateur) {
      // Message volontairement generique : on ne revele pas si c'est
      // l'email ou le mot de passe qui est incorrect (anti-enumeration).
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' })
    }

    const token = encoderToken(utilisateur)

    res.json({ token, user: utilisateur })
  } catch (error) {
    next(error)
  }
})

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user })
})
