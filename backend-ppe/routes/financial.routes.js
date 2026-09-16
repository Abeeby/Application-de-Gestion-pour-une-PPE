import { Router } from 'express'
import { accounts, transactions, budgets } from '../data/finances.js'
import { getSummary } from '../finances.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

router.get('/summary', requireAuth, requireRole('admin', 'owner'), (req, res) => {
  res.json({
    user: req.user,
    summary: getSummary(),
  })
})

router.get('/accounts', requireAuth, requireRole('admin', 'owner'), (req, res) => {
  res.json({ accounts })
})

router.get('/transactions', requireAuth, requireRole('admin', 'owner'), (req, res) => {
  res.json({ transactions })
})

router.get('/budgets', requireAuth, requireRole('admin', 'owner'), (req, res) => {
  res.json({ budgets })
})

router.post('/budgets', requireAuth, requireRole('admin'), (req, res) => {
  const { category, planned } = req.body ?? {}

  if (!category || typeof planned !== 'number') {
    return res.status(400).json({ error: 'Données invalides : category et planned sont requis' })
  }

  const nextBudget = {
    id: `budget-${Date.now()}`,
    category,
    planned,
    used: 0,
    progress: 0,
  }

  budgets.push(nextBudget)

  res.status(201).json({ budget: nextBudget })
})

export default router
