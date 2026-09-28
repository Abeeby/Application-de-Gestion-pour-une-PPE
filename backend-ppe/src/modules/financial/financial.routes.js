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

export const financialRouter = Router()

// Route historique, montee separement sous /api/depenses (en dehors du
// prefixe /api/financial) pour ne pas casser l'URL utilisee par le frontend.
export const depensesHistoriqueRouter = Router()

depensesHistoriqueRouter.get('/historique', async (req, res, next) => {
  try {
    const anneeDebut = Number.parseInt(String(req.query.anneeDebut ?? '2022'), 10) || 2022
    const anneeFin = Number.parseInt(String(req.query.anneeFin ?? '2025'), 10) || 2025
    res.json(await getHistoriqueDepenses(anneeDebut, anneeFin))
  } catch (error) {
    next(error)
  }
})

financialRouter.get('/summary', requireAuth, requireRole('admin', 'owner'), async (req, res, next) => {
  try {
    res.json({ user: req.user, summary: await getSummary() })
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
    res.json({ budgets: await getBudgets() })
  } catch (error) {
    next(error)
  }
})

financialRouter.post('/budgets', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { category, planned } = req.body ?? {}

    if (!category || typeof planned !== 'number') {
      return res.status(400).json({ error: 'Données invalides : category et planned sont requis' })
    }

    res.status(201).json({ budget: await ajouterLigneBudget({ category, planned }) })
  } catch (error) {
    next(error)
  }
})
