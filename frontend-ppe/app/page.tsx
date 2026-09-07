'use client'

import { useEffect, useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

type Role = 'admin' | 'owner'

type User = {
  id: string
  name: string
  email: string
  role: Role
}

type Summary = {
  totalBalance: number
  totalIncome: number
  totalExpenses: number
  monthlyForecast: number
  activeAccounts: number
  budgetUsage: number
}

export default function HomePage() {
  const [email, setEmail] = useState('admin@ppe.fr')
  const [role, setRole] = useState<Role>('admin')
  const [token, setToken] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [budgets, setBudgets] = useState<any[]>([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const fetchProtectedData = async (authToken: string) => {
    const response = await fetch(`${API_URL}/api/financial/summary`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    })

    if (!response.ok) {
      throw new Error('Impossible de récupérer le tableau de bord.')
    }

    const data = await response.json()
    setSummary(data.summary)
    setUser(data.user)

    const [transactionsResponse, budgetsResponse] = await Promise.all([
      fetch(`${API_URL}/api/financial/transactions`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }),
      fetch(`${API_URL}/api/financial/budgets`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }),
    ])

    if (!transactionsResponse.ok || !budgetsResponse.ok) {
      throw new Error('Les données financières sont inaccessibles.')
    }

    const transactionsData = await transactionsResponse.json()
    const budgetsData = await budgetsResponse.json()

    setTransactions(transactionsData.transactions)
    setBudgets(budgetsData.budgets)
  }

  const handleLogin = async () => {
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, role }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? 'Connexion impossible')
      }

      setToken(data.token)
      setUser(data.user)
      await fetchProtectedData(data.token)
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Une erreur inconnue est survenue')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!token) return

    void fetchProtectedData(token).catch((fetchError) => {
      setError(fetchError instanceof Error ? fetchError.message : 'Erreur de chargement')
    })
  }, [token])

  const currency = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  })

  if (!token || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">PPE</p>
          <h1 className="text-3xl font-bold text-slate-900">Connexion</h1>
          <p className="mt-2 text-sm text-slate-600">Authentification et rôles</p>

          <div className="mt-6 space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Email
              <input
                aria-label="Email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 outline-none ring-0 transition focus:border-blue-500"
                placeholder="admin@ppe.fr"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Rôle
              <select
                aria-label="Rôle"
                value={role}
                onChange={(event) => setRole(event.target.value as Role)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 outline-none transition focus:border-blue-500"
              >
                <option value="admin">Administrateur</option>
                <option value="owner">Copropriétaire</option>
              </select>
            </label>

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? 'Connexion...' : 'Se connecter'}
            </button>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-center justify-between rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-700">PPE</p>
            <h1 className="mt-2 text-3xl font-bold">Tableau de bord financier</h1>
          </div>
          <div className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800">
            {user.role === 'admin' ? 'Administrateur' : 'Copropriétaire'}
          </div>
        </header>

        {summary ? (
          <section className="grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <p className="text-sm text-slate-500">Solde total</p>
              <p className="mt-2 text-2xl font-bold">{currency.format(summary.totalBalance)}</p>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <p className="text-sm text-slate-500">Revenus</p>
              <p className="mt-2 text-2xl font-bold text-emerald-600">{currency.format(summary.totalIncome)}</p>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <p className="text-sm text-slate-500">Dépenses</p>
              <p className="mt-2 text-2xl font-bold text-rose-600">{currency.format(summary.totalExpenses)}</p>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <p className="text-sm text-slate-500">Prévision mensuelle</p>
              <p className="mt-2 text-2xl font-bold text-sky-600">{currency.format(summary.monthlyForecast)}</p>
            </div>
          </section>
        ) : null}

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Transactions</h2>
              <span className="text-sm text-slate-500">{transactions.length} éléments</span>
            </div>

            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                  <div>
                    <p className="font-medium">{transaction.label}</p>
                    <p className="text-sm text-slate-500">{transaction.category} • {transaction.date}</p>
                  </div>
                  <span className={`font-semibold ${transaction.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {transaction.type === 'income' ? '+' : '-'}
                    {currency.format(transaction.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-xl font-semibold">Budgets</h2>
              <div className="mt-4 space-y-4">
                {budgets.map((budget) => (
                  <div key={budget.id}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span>{budget.category}</span>
                      <span>{budget.progress}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-blue-600"
                        style={{ width: `${Math.min(budget.progress, 100)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {currency.format(budget.used)} / {currency.format(budget.planned)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-xl font-semibold">Profil</h2>
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <p><span className="font-medium text-slate-900">Nom :</span> {user.name}</p>
                <p><span className="font-medium text-slate-900">Email :</span> {user.email}</p>
                <p><span className="font-medium text-slate-900">Rôle :</span> {user.role}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
