import { Router } from 'express'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { getEvolutionProduction } from './electricite.repository.js'

export const electriciteRouter = Router()

// KAN-12 : consultation reservee aux membres connectes de la PPE
electriciteRouter.get('/evolution', requireAuth, requireRole('admin', 'owner'), async (req, res, next) => {
  try {
    const annee = Number.parseInt(String(req.query.annee ?? '2024'), 10) || 2024
    res.json(await getEvolutionProduction(annee))
  } catch (error) {
    next(error)
  }
})
