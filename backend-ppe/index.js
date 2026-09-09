import express from 'express'

const app = express()
const PORT = Number(process.env.PORT ?? 3001)

const allowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000']

app.use((req, res, next) => {
  const origin = req.headers.origin

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204)
  }

  next()
})

app.use(express.json())

const depenses = [
  { annee: 2022, categorie: 'Entretien', montant: 12400 },
  { annee: 2022, categorie: 'Assurances', montant: 8700 },
  { annee: 2022, categorie: 'Nettoyage', montant: 5200 },
  { annee: 2022, categorie: 'Eau & Electricite', montant: 9800 },
  { annee: 2022, categorie: 'Administration', montant: 4100 },
  { annee: 2022, categorie: 'Reparations', montant: 6300 },

  { annee: 2023, categorie: 'Entretien', montant: 13100 },
  { annee: 2023, categorie: 'Assurances', montant: 9200 },
  { annee: 2023, categorie: 'Nettoyage', montant: 5400 },
  { annee: 2023, categorie: 'Eau & Electricite', montant: 10500 },
  { annee: 2023, categorie: 'Administration', montant: 4300 },
  { annee: 2023, categorie: 'Reparations', montant: 9800 },

  { annee: 2024, categorie: 'Entretien', montant: 14200 },
  { annee: 2024, categorie: 'Assurances', montant: 9200 },
  { annee: 2024, categorie: 'Nettoyage', montant: 5900 },
  { annee: 2024, categorie: 'Eau & Electricite', montant: 11300 },
  { annee: 2024, categorie: 'Administration', montant: 4600 },
  { annee: 2024, categorie: 'Reparations', montant: 7100 },

  { annee: 2025, categorie: 'Entretien', montant: 13800 },
  { annee: 2025, categorie: 'Assurances', montant: 9500 },
  { annee: 2025, categorie: 'Nettoyage', montant: 6100 },
  { annee: 2025, categorie: 'Eau & Electricite', montant: 10900 },
  { annee: 2025, categorie: 'Administration', montant: 4800 },
  { annee: 2025, categorie: 'Reparations', montant: 5400 },
]

const users = {
  'admin@ppe.fr': {
    id: 'u-admin',
    name: 'Administrateur principal',
    email: 'admin@ppe.fr',
    role: 'admin',
  },
  'coproprietaire@ppe.fr': {
    id: 'u-owner',
    name: 'Copropriétaire',
    email: 'coproprietaire@ppe.fr',
    role: 'owner',
  },
}

const accounts = [
  { id: 'acc-1', name: 'Compte courant', balance: 18250 },
  { id: 'acc-2', name: 'Compte épargne', balance: 6400 },
  { id: 'acc-3', name: 'Fonds travaux', balance: 12400 },
]

const transactions = [
  { id: 'txn-1', type: 'income', category: 'Revenus', label: 'Cotisations mensuelles', amount: 4200, date: '2026-08-05' },
  { id: 'txn-2', type: 'expense', category: 'Électricité', label: 'Facture d’électricité', amount: 1260, date: '2026-08-12' },
  { id: 'txn-3', type: 'expense', category: 'Entretien', label: 'Plomberie et réparation', amount: 870, date: '2026-08-17' },
  { id: 'txn-4', type: 'income', category: 'Travaux', label: 'Remboursement travaux', amount: 1800, date: '2026-08-20' },
]

const budgets = [
  { id: 'budget-1', category: 'Électricité', planned: 2200, used: 1260, progress: 57 },
  { id: 'budget-2', category: 'Entretien', planned: 1800, used: 870, progress: 48 },
  { id: 'budget-3', category: 'Sécurité', planned: 1000, used: 320, progress: 32 },
]

const productionsElectricite = [
  { annee: 2023, mois: 1, productionKwh: 320, revenuChf: 64, chargesChf: 220 },
  { annee: 2023, mois: 2, productionKwh: 380, revenuChf: 76, chargesChf: 200 },
  { annee: 2023, mois: 3, productionKwh: 550, revenuChf: 110, chargesChf: 170 },
  { annee: 2023, mois: 4, productionKwh: 700, revenuChf: 140, chargesChf: 150 },
  { annee: 2023, mois: 5, productionKwh: 850, revenuChf: 170, chargesChf: 130 },
  { annee: 2023, mois: 6, productionKwh: 1000, revenuChf: 200, chargesChf: 110 },
  { annee: 2023, mois: 7, productionKwh: 1050, revenuChf: 210, chargesChf: 120 },
  { annee: 2023, mois: 8, productionKwh: 950, revenuChf: 190, chargesChf: 125 },
  { annee: 2023, mois: 9, productionKwh: 750, revenuChf: 150, chargesChf: 140 },
  { annee: 2023, mois: 10, productionKwh: 550, revenuChf: 110, chargesChf: 170 },
  { annee: 2023, mois: 11, productionKwh: 380, revenuChf: 76, chargesChf: 200 },
  { annee: 2023, mois: 12, productionKwh: 280, revenuChf: 56, chargesChf: 230 },

  { annee: 2024, mois: 1, productionKwh: 350, revenuChf: 70, chargesChf: 200 },
  { annee: 2024, mois: 2, productionKwh: 420, revenuChf: 84, chargesChf: 180 },
  { annee: 2024, mois: 3, productionKwh: 600, revenuChf: 120, chargesChf: 160 },
  { annee: 2024, mois: 4, productionKwh: 750, revenuChf: 150, chargesChf: 140 },
  { annee: 2024, mois: 5, productionKwh: 900, revenuChf: 180, chargesChf: 120 },
  { annee: 2024, mois: 6, productionKwh: 1050, revenuChf: 210, chargesChf: 100 },
  { annee: 2024, mois: 7, productionKwh: 1100, revenuChf: 220, chargesChf: 110 },
  { annee: 2024, mois: 8, productionKwh: 1000, revenuChf: 200, chargesChf: 115 },
  { annee: 2024, mois: 9, productionKwh: 800, revenuChf: 160, chargesChf: 130 },
  { annee: 2024, mois: 10, productionKwh: 600, revenuChf: 120, chargesChf: 160 },
  { annee: 2024, mois: 11, productionKwh: 400, revenuChf: 80, chargesChf: 190 },
  { annee: 2024, mois: 12, productionKwh: 300, revenuChf: 60, chargesChf: 210 },
]

const getSummary = () => {
  const totalIncome = transactions
    .filter((item) => item.type === 'income')
    .reduce((sum, item) => sum + item.amount, 0)

  const totalExpenses = transactions
    .filter((item) => item.type === 'expense')
    .reduce((sum, item) => sum + item.amount, 0)

  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0)

  return {
    totalBalance,
    totalIncome,
    totalExpenses,
    monthlyForecast: totalIncome - totalExpenses,
    activeAccounts: accounts.length,
    budgetUsage: Math.round((totalExpenses / Math.max(totalIncome, 1)) * 100),
  }
}

const encodeToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    exp: Date.now() + 60 * 60 * 1000,
  }

  return Buffer.from(JSON.stringify(payload)).toString('base64url')
}

const decodeToken = (token) => {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'))

    if (!payload.exp || payload.exp < Date.now()) {
      return null
    }

    return payload
  } catch (error) {
    return null
  }
}

const requireAuth = (req, res, next) => {
  const auth = req.headers.authorization

  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant ou invalide' })
  }

  const payload = decodeToken(auth.replace('Bearer ', ''))

  if (!payload || !users[payload.email]) {
    return res.status(401).json({ error: 'Session invalide' })
  }

  req.user = users[payload.email]
  next()
}

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Accès refusé pour ce rôle' })
  }

  next()
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'ppe-backend', time: new Date().toISOString() })
})

app.get('/api/depenses/historique', (req, res) => {
  const anneeDebut = Number.parseInt(String(req.query.anneeDebut ?? '2022'), 10) || 2022
  const anneeFin = Number.parseInt(String(req.query.anneeFin ?? '2025'), 10) || 2025
  const resultat = depenses.filter((depense) => depense.annee >= anneeDebut && depense.annee <= anneeFin)

  res.json(resultat)
})

app.post('/api/auth/login', (req, res) => {
  const { email = '', role = 'admin' } = req.body ?? {}
  const normalizedEmail = String(email).trim().toLowerCase()
  const normalizedRole = String(role).trim().toLowerCase()
  const user = users[normalizedEmail]

  if (!user) {
    return res.status(404).json({ error: 'Compte introuvable' })
  }

  if (user.role !== normalizedRole) {
    return res.status(403).json({ error: 'Rôle incorrect pour cet utilisateur' })
  }

  const token = encodeToken(user)

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  })
})

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user })
})

app.get('/api/financial/summary', requireAuth, requireRole('admin', 'owner'), (req, res) => {
  res.json({
    user: req.user,
    summary: getSummary(),
  })
})

app.get('/api/financial/accounts', requireAuth, requireRole('admin', 'owner'), (req, res) => {
  res.json({ accounts })
})

app.get('/api/financial/transactions', requireAuth, requireRole('admin', 'owner'), (req, res) => {
  res.json({ transactions })
})

app.get('/api/financial/budgets', requireAuth, requireRole('admin', 'owner'), (req, res) => {
  res.json({ budgets })
})

app.post('/api/financial/budgets', requireAuth, requireRole('admin'), (req, res) => {
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

app.get('/api/electricite/evolution', (req, res) => {
  const annee = Number.parseInt(String(req.query.annee ?? '2024'), 10) || 2024
  const resultat = productionsElectricite.filter((prod) => prod.annee === annee)

  res.json(resultat)
})

app.listen(PORT, () => {
  console.log(`PPE backend running on http://localhost:${PORT}`)
})
