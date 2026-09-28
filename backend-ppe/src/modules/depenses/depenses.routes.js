import { Router } from 'express'
import { getCategoriesParType, getLotsReferences, getProjetsNoms } from '../reference/reference.repository.js'
import { ajouterDepense, listerDepenses } from './depenses.repository.js'
import { validerDepense } from './depenses.validation.js'

export const depensesRouter = Router()

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
