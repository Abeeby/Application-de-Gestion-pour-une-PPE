import { Router } from 'express'
import { getEvolutionProduction } from './electricite.repository.js'

export const electriciteRouter = Router()

electriciteRouter.get('/evolution', async (req, res, next) => {
  try {
    const annee = Number.parseInt(String(req.query.annee ?? '2024'), 10) || 2024
    res.json(await getEvolutionProduction(annee))
  } catch (error) {
    next(error)
  }
})
