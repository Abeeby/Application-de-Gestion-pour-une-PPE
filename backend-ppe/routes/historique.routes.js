// --- KAN-29 : historique pluriannuel des depenses ---
import { Router } from 'express'
import { depenses } from '../data/depenses.js'

const router = Router()

router.get('/historique', (req, res) => {
  const anneeDebut = Number.parseInt(String(req.query.anneeDebut ?? '2022'), 10) || 2022
  const anneeFin = Number.parseInt(String(req.query.anneeFin ?? '2025'), 10) || 2025
  const resultat = depenses.filter((depense) => depense.annee >= anneeDebut && depense.annee <= anneeFin)

  res.json(resultat)
})

export default router
