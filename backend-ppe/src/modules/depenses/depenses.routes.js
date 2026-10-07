import { Router } from 'express'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { getCategoriesParType, getLotsReferences, getProjetsNoms } from '../reference/reference.repository.js'
import { ajouterDepense, listerDepenses } from './depenses.repository.js'
import { validerDepense } from './depenses.validation.js'

export const depensesRouter = Router()

// KAN-12 : toutes ces routes exigent une session valide (401 sinon).
// Roles autorises : administrateur et coproprietaire, comme le demandent les
// user stories (KAN-36 : "En tant que coproprietaire ou administrateur, je
// veux enregistrer une depense...").
depensesRouter.use(requireAuth, requireRole('admin', 'owner'))

// --- KAN-19 : module de saisie des depenses ---

// Donne les listes a afficher dans le formulaire
depensesRouter.get('/options', async (req, res, next) => {
  try {
    const [categories, appartements, projets] = await Promise.all([
      getCategoriesParType('depense'),
      getLotsReferences(),
      getProjetsNoms(),
    ])
    res.json({ categories, appartements, projets })
  } catch (error) {
    next(error)
  }
})

// Liste les depenses deja saisies
depensesRouter.get('/', async (req, res, next) => {
  try {
    res.json(await listerDepenses())
  } catch (error) {
    next(error)
  }
})

// Enregistre une nouvelle depense
depensesRouter.post('/', async (req, res, next) => {
  try {
    const depense = req.body ?? {}
    const erreurs = await validerDepense(depense)

    if (erreurs.length > 0) {
      return res.status(400).json({ erreurs })
    }

    res.status(201).json(await ajouterDepense(depense))
  } catch (error) {
    next(error)
  }
})
