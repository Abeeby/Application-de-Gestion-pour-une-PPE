import express from 'express'

const app = express()
const PORT = Number(process.env.PORT ?? 3001)

const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]

app.use((req, res, next) => {
  const origin = req.headers.origin

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }

  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET,POST,PUT,PATCH,DELETE,OPTIONS'
  )

  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization'
  )

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
  {
    id: 'acc-1',
    name: 'Compte courant',
    balance: 18250,
  },
  {
    id: 'acc-2',
    name: 'Compte épargne',
    balance: 6400,
  },
  {
    id: 'acc-3',
    name: 'Fonds travaux',
    balance: 12400,
  },
]

const transactions = [
  {
    id: 'txn-1',
    type: 'income',
    category: 'Revenus',
    label: 'Cotisations mensuelles',
    amount: 4200,
    date: '2026-08-05',
  },
  {
    id: 'txn-2',
    type: 'expense',
    category: 'Électricité',
    label: 'Facture d’électricité',
    amount: 1260,
    date: '2026-08-12',
  },
  {
    id: 'txn-3',
    type: 'expense',
    category: 'Entretien',
    label: 'Plomberie et réparation',
    amount: 870,
    date: '2026-08-17',
  },
  {
    id: 'txn-4',
    type: 'income',
    category: 'Travaux',
    label: 'Remboursement travaux',
    amount: 1800,
    date: '2026-08-20',
  },
]

const budgets = [
  {
    id: 'budget-1',
    category: 'Électricité',
    planned: 2200,
    used: 1260,
    progress: 57,
  },
  {
    id: 'budget-2',
    category: 'Entretien',
    planned: 1800,
    used: 870,
    progress: 48,
  },
  {
    id: 'budget-3',
    category: 'Sécurité',
    planned: 1000,
    used: 320,
    progress: 32,
  },
]

const getSummary = () => {
  const totalIncome = transactions
    .filter((item) => item.type === 'income')
    .reduce((sum, item) => sum + item.amount, 0)

  const totalExpenses = transactions
    .filter((item) => item.type === 'expense')
    .reduce((sum, item) => sum + item.amount, 0)

  const totalBalance = accounts.reduce(
    (sum, account) => sum + account.balance,
    0
  )

  return {
    totalBalance,
    totalIncome,
    totalExpenses,
    monthlyForecast: totalIncome - totalExpenses,
    activeAccounts: accounts.length,
    budgetUsage: Math.round(
      (totalExpenses / Math.max(totalIncome, 1)) * 100
    ),
  }
}

const encodeToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    exp: Date.now() + 60 * 60 * 1000,
  }

  return Buffer.from(
    JSON.stringify(payload)
  ).toString('base64url')
}

const decodeToken = (token) => {
  try {
    const payload = JSON.parse(
      Buffer.from(token, 'base64url').toString('utf8')
    )

    if (!payload.exp || payload.exp < Date.now()) {
      return null
    }

    return payload
  } catch {
    return null
  }
}

const requireAuth = (req, res, next) => {
  const auth = req.headers.authorization

  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Token manquant ou invalide',
    })
  }

  const token = auth.replace('Bearer ', '')
  const payload = decodeToken(token)

  if (!payload || !users[payload.email]) {
    return res.status(401).json({
      error: 'Session invalide ou expirée',
    })
  }

  req.user = users[payload.email]

  next()
}

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Accès refusé pour ce rôle',
      })
    }

    next()
  }
}

/*
 * Route principale
 */
app.get('/', (req, res) => {
  res.json({
    message: 'API financière PPE opérationnelle',
    documentation: '/api',
    health: '/api/health',
  })
})

/*
 * Liste des routes de l’API
 */
app.get('/api', (req, res) => {
  res.json({
    name: 'API financière PPE',
    status: 'ok',
    routes: {
      health: 'GET /api/health',
      login: 'POST /api/auth/login',
      currentUser: 'GET /api/auth/me',
      summary: 'GET /api/financial/summary',
      accounts: 'GET /api/financial/accounts',
      transactions: 'GET /api/financial/transactions',
      budgets: 'GET /api/financial/budgets',
      createBudget: 'POST /api/financial/budgets',
      expensesHistory: 'GET /api/depenses/historique',
    },
  })
})

/*
 * Vérification du serveur
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'ppe-backend',
    time: new Date().toISOString(),
  })
})

/*
 * Historique des dépenses
 */
app.get('/api/depenses/historique', (req, res) => {
  const anneeDebut =
    Number.parseInt(
      String(req.query.anneeDebut ?? '2022'),
      10
    ) || 2022

  const anneeFin =
    Number.parseInt(
      String(req.query.anneeFin ?? '2025'),
      10
    ) || 2025

  if (anneeDebut > anneeFin) {
    return res.status(400).json({
      error:
        'L’année de début doit être inférieure ou égale à l’année de fin.',
    })
  }

  const resultat = depenses.filter(
    (depense) =>
      depense.annee >= anneeDebut &&
      depense.annee <= anneeFin
  )

  res.json(resultat)
})

/*
 * Connexion
 */
app.post('/api/auth/login', (req, res) => {
  const { email = '', role = 'admin' } = req.body ?? {}

  const normalizedEmail = String(email)
    .trim()
    .toLowerCase()

  const normalizedRole = String(role)
    .trim()
    .toLowerCase()

  const user = users[normalizedEmail]

  if (!normalizedEmail || !normalizedRole) {
    return res.status(400).json({
      error: 'L’adresse électronique et le rôle sont requis',
    })
  }

  if (!user) {
    return res.status(404).json({
      error: 'Compte introuvable',
    })
  }

  if (user.role !== normalizedRole) {
    return res.status(403).json({
      error: 'Rôle incorrect pour cet utilisateur',
    })
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

/*
 * Utilisateur connecté
 */
app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({
    user: req.user,
  })
})

/*
 * Résumé financier
 */
app.get(
  '/api/financial/summary',
  requireAuth,
  requireRole('admin', 'owner'),
  (req, res) => {
    res.json({
      user: req.user,
      summary: getSummary(),
    })
  }
)

/*
 * Comptes
 */
app.get(
  '/api/financial/accounts',
  requireAuth,
  requireRole('admin', 'owner'),
  (req, res) => {
    res.json({
      accounts,
    })
  }
)

/*
 * Transactions
 */
app.get(
  '/api/financial/transactions',
  requireAuth,
  requireRole('admin', 'owner'),
  (req, res) => {
    res.json({
      transactions,
    })
  }
)

/*
 * Budgets
 */
app.get(
  '/api/financial/budgets',
  requireAuth,
  requireRole('admin', 'owner'),
  (req, res) => {
    res.json({
      budgets,
    })
  }
)

/*
 * Création d’un budget
 */
app.post(
  '/api/financial/budgets',
  requireAuth,
  requireRole('admin'),
  (req, res) => {
    const category = String(
      req.body?.category ?? ''
    ).trim()

    const planned = Number(req.body?.planned)

    if (!category) {
      return res.status(400).json({
        error: 'La catégorie est obligatoire',
      })
    }

    if (!Number.isFinite(planned) || planned <= 0) {
      return res.status(400).json({
        error:
          'Le montant planifié doit être un nombre supérieur à zéro',
      })
    }

    const nextBudget = {
      id: `budget-${Date.now()}`,
      category,
      planned,
      used: 0,
      progress: 0,
    }

    budgets.push(nextBudget)

    res.status(201).json({
      budget: nextBudget,
    })
  }
)

/*
 * Route inconnue
 */
app.use((req, res) => {
  res.status(404).json({
    error: 'Route introuvable',
    path: req.originalUrl,
  })
})
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'ppe-backend',
    time: new Date().toISOString(),
  })
})
app.listen(PORT, () => {
  console.log(
    `PPE backend running on http://localhost:${PORT}`
  )
})