import { Router } from 'express'
import { productionsElectricite } from '../data/electricite.js'

const router = Router()

router.get('/evolution', (req, res) => {
  const annee = Number.parseInt(String(req.query.annee ?? '2024'), 10) || 2024
  const resultat = productionsElectricite.filter((prod) => prod.annee === annee)

  res.json(resultat)
})

export default router
