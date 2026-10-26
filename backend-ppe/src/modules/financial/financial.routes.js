import { Router } from 'express'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import {
  ajouterLigneBudget,
  getAccounts,
  getBudgets,
  getHistoriqueDepenses,
  getSummary,
  getTransactionsRecentes,
} from './financial.repository.js'
import { lireAnnee, validerLigneBudget } from './financial.calcul.js'

export const financialRouter = Router()

// Route historique, montee separement sous /api/depenses (en dehors du
// prefixe /api/financial) pour ne pas casser l'URL utilisee par le frontend.
export const depensesHistoriqueRouter = Router()

// KAN-12 : etait accessible sans connexion, maintenant protegee comme le reste
depensesHistoriqueRouter.get('/historique', requireAuth, requireRole('admin', 'owner'), async (req, res, next) => {
  try {
    const anneeDebut = Number.parseInt(String(req.query.anneeDebut ?? '2022'), 10) || 2022
    const anneeFin = Number.parseInt(String(req.query.anneeFin ?? '2025'), 10) || 2025
    res.json(await getHistoriqueDepenses(anneeDebut, anneeFin))
  } catch (error) {
    next(error)
  }
})

// KAN-26 : resume de l'exercice. ?annee=2025 pour une autre annee
// (annee en cours par defaut).
financialRouter.get('/summary', requireAuth, requireRole('admin', 'owner'), async (req, res, next) => {
  try {
    const annee = lireAnnee(req.query.annee)
    if (annee === null) return res.status(400).json({ error: 'Année invalide' })

    res.json({ user: req.user, summary: await getSummary(annee) })
  } catch (error) {
    next(error)
  }
})

financialRouter.get('/accounts', requireAuth, requireRole('admin', 'owner'), async (req, res, next) => {
  try {
    res.json({ accounts: await getAccounts() })
  } catch (error) {
    next(error)
  }
})

financialRouter.get('/transactions', requireAuth, requireRole('admin', 'owner'), async (req, res, next) => {
  try {
    res.json({ transactions: await getTransactionsRecentes() })
  } catch (error) {
    next(error)
  }
})

financialRouter.get('/budgets', requireAuth, requireRole('admin', 'owner'), async (req, res, next) => {
  try {
    const annee = lireAnnee(req.query.annee)
    if (annee === null) return res.status(400).json({ error: 'Année invalide' })

    res.json({ budgets: await getBudgets(annee) })
  } catch (error) {
    next(error)
  }
})

financialRouter.post('/budgets', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { category, planned } = req.body ?? {}

    // KAN-26 : avant, un montant de 0 ou negatif etait accepte
    const erreurs = validerLigneBudget({ category, planned })
    if (erreurs.length > 0) {
      return res.status(400).json({ error: erreurs.join(' ; '), erreurs })
    }

    res.status(201).json({ budget: await ajouterLigneBudget({ category: category.trim(), planned }) })
  } catch (error) {
    // KAN-15 : budget deja soumis ou approuve -> 409 (et non 500)
    if (error.status === 409) return res.status(409).json({ error: error.message })
    next(error)
  }
})
