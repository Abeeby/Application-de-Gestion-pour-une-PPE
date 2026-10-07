import { Router } from 'express'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { listerHistorique } from './historique.repository.js'
import { validerFiltresHistorique } from './historique.validation.js'

export const historiqueRouter = Router()

// --- KAN-35 : historique des modifications des projets et depenses ---
// Lecture seule pour tout le monde, y compris l'administrateur : aucune route
// PUT/DELETE, une ligne d'historique ne peut etre ni modifiee ni effacee.

historiqueRouter.get('/', requireAuth, requireRole('admin', 'owner'), async (req, res, next) => {
  try {
    const { erreurs, filtres } = validerFiltresHistorique(req.query)
    if (erreurs.length > 0) {
      return res.status(400).json({ erreurs })
    }
    res.json(await listerHistorique(filtres))
  } catch (error) {
    next(error)
  }
})
