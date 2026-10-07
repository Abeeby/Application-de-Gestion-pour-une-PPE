'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart2,
  Calculator,
  Bell,
  CheckCircle2,
  ChevronDown,
  FileText,
  Folder,
  LayoutDashboard,
  LogOut,
  Plus,
  Settings,
  Users,
  Zap,
} from 'lucide-react'

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
  const [password, setPassword] = useState('')
  const [token, setToken] = useState('')

  useEffect(() => {
    const savedToken = localStorage.getItem('ppe_token')
    if (savedToken) {
      setToken(savedToken)
    }
  }, [])
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
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? 'Connexion impossible')
      }

      setToken(data.token)
      localStorage.setItem('ppe_token', data.token)
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
      <div className="flex min-h-screen items-center justify-center bg-slate-50 font-sans text-slate-900">
        <main className="w-full">
          <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center p-6">
            <section className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">PPE</p>
                  <h1 className="text-3xl font-bold text-slate-900">Connexion</h1>
                </div>
                <div className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
                  Admin
                </div>
              </div>

              <div className="space-y-5">
                <label className="block text-sm font-medium text-slate-700">
                  Email
                  <input
                    aria-label="Email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition focus:border-blue-500"
                    placeholder="admin@ppe.fr"
                  />
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  Mot de passe
                  <input
                    aria-label="Mot de passe"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        void handleLogin()
                      }
                    }}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition focus:border-blue-500"
                    placeholder="••••••••"
                  />
                </label>

                {error ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
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
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-[#f5f7fb] font-sans text-slate-900">
      <aside className="w-full border-b border-slate-200 bg-white lg:w-56 lg:flex-shrink-0 lg:border-b-0 lg:border-r lg:flex lg:flex-col">
        <div className="flex items-center gap-3 p-6">
          <div className="rounded-lg bg-blue-600 p-2 text-sm font-bold text-white">PPE</div>
          <div>
            <h2 className="text-sm font-bold leading-tight text-slate-900">PPE Gestion</h2>
            <p className="text-xs text-slate-500">Gestion de copropriété</p>
          </div>
        </div>

        <div className="px-4 pb-3">
          <button className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-sm font-medium text-slate-700 shadow-sm">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
              Les Terrasses
            </span>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>
        </div>

        <div className="px-4 pb-3">
          <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2.5 text-sm font-semibold text-orange-700 shadow-sm transition hover:bg-orange-100">
            <Plus className="h-4 w-4" /> Nouvelle PPE
          </button>
        </div>

        <nav className="space-y-1 px-4 pb-2 pt-1">
          <Link href="/" className="flex items-center gap-3 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-medium text-white shadow-sm transition">
            <LayoutDashboard className="h-5 w-5" /> Tableau de bord
          </Link>
          <Link href="/electricite" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100">
            <Zap className="h-5 w-5" /> Électricité
          </Link>
          <Link href="/saisie" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100">
            <FileText className="h-5 w-5" /> Dépenses
          </Link>
          <Link href="/revenus" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100">
            <Users className="h-5 w-5" /> Revenus
          </Link>
          <Link href="/projets" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100">
            <Folder className="h-5 w-5" /> Projets
          </Link>
          <Link href="/historique" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100">
            <BarChart2 className="h-5 w-5" /> Historique
          </Link>
          <Link href="/charges" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100">
            <Calculator className="h-5 w-5" /> Charges
          </Link>
        </nav>

        <div className="mt-2 space-y-1 border-t border-slate-200 p-4">
          <a href="#" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100">
            <Settings className="h-5 w-5" /> Paramètres
          </a>
          <button
            type="button"
            onClick={() => {
              setToken('')
              localStorage.removeItem('ppe_token')
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
          >
            <LogOut className="h-5 w-5" /> Déconnexion
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <header className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h1 className="text-2xl font-bold tracking-[-0.04em] text-slate-900 sm:text-[2.2rem]">Tableau de bord</h1>
              <p className="mt-1 text-sm text-slate-500">Vue d’ensemble de votre PPE • Les Terrasses, Lausanne</p>
              <Link href="/tableau-de-bord" className="mt-2 inline-block text-sm font-medium text-blue-600 hover:underline">
                Explorer les finances avec les filtres
              </Link>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto">
              <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
                Mardi, 25 août 2026
              </div>
              <button className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition hover:bg-slate-50">
                <Bell className="h-5 w-5" />
              </button>
            </div>
          </header>

          {summary ? (
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Solde actuel</span>
                  <span className="rounded-full bg-slate-100 p-1 text-slate-400">
                    <span className="sr-only">Info</span>i
                  </span>
                </div>
                <p className="mb-2 text-3xl font-bold text-slate-900">{currency.format(summary.totalBalance)}</p>
                <div className="flex items-center gap-2 text-xs">
                  <span className="flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700">
                    <ArrowUpRight className="h-3.5 w-3.5" /> 8.4% vs mois dernier
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Revenus 2026</span>
                  <span className="rounded-full bg-slate-100 p-1 text-slate-400">
                    <span className="sr-only">Info</span>i
                  </span>
                </div>
                <p className="mb-2 text-3xl font-bold text-slate-900">{currency.format(summary.totalIncome)}</p>
                <div className="flex items-center gap-2 text-xs">
                  <span className="flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700">
                    <ArrowUpRight className="h-3.5 w-3.5" /> 5.2% vs budget 2025
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Dépenses 2026</span>
                  <span className="rounded-full bg-slate-100 p-1 text-slate-400">
                    <span className="sr-only">Info</span>i
                  </span>
                </div>
                <p className="mb-2 text-3xl font-bold text-slate-900">{currency.format(summary.totalExpenses)}</p>
                <div className="flex items-center gap-2 text-xs">
                  <span className="flex items-center gap-1 rounded bg-rose-100 px-2 py-0.5 font-medium text-rose-700">
                    <ArrowDownRight className="h-3.5 w-3.5" /> - 3.1% vs budget 2025
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Budget restant</span>
                  <span className="rounded-full bg-slate-100 p-1 text-slate-400">
                    <span className="sr-only">Info</span>i
                  </span>
                </div>
                <p className="mb-2 text-3xl font-bold text-slate-900">{currency.format(summary.monthlyForecast)}</p>
                <div className="flex items-center gap-2 text-xs">
                  <span className="flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700">
                    42% utilisé
                  </span>
                </div>
              </div>
            </section>
          ) : null}

          <section className="mt-8 grid gap-6 xl:grid-cols-[1.6fr_0.9fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Revenus & dépenses</h2>
                  <p className="mt-1 text-sm text-slate-500">Evolution mensuelle • 2026</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                  <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Revenus</span>
                  <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Dépenses</span>
                </div>
              </div>

              <div className="h-64 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4">
                <div className="flex h-full items-end justify-between gap-3">
                  {[44, 52, 48, 61, 58, 74, 80, 70, 90].map((value, index) => (
                    <div key={index} className="flex flex-1 flex-col items-center justify-end gap-3">
                      <div className="relative w-full">
                        <div
                          className="w-full rounded-t-md bg-emerald-500"
                          style={{ height: `${value}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-400">
                        {['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep'][index]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">Projets en cours</h2>
                <button className="text-sm font-medium text-blue-600">Voir tout</button>
              </div>

              <div className="space-y-5">
                {[
                  { label: 'Rénovation du toit', value: 88, color: 'bg-blue-600' },
                  { label: 'Rénovation de la façade', value: 35, color: 'bg-orange-400' },
                  { label: 'Éclairage LED garages', value: 90, color: 'bg-emerald-500' },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{item.label}</span>
                      <span className="font-semibold text-slate-700">{item.value}%</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-8 grid gap-6 xl:grid-cols-[1.6fr_0.9fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">Dernières transactions</h2>
                <button className="text-sm font-medium text-slate-500">Historique</button>
              </div>

              <div className="space-y-4">
                {transactions.slice(0, 4).map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                        {transaction.type === 'income' ? <ArrowUpRight className="h-4 w-4 text-emerald-600" /> : <ArrowDownRight className="h-4 w-4 text-rose-600" />}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{transaction.label}</p>
                        <p className="text-xs text-slate-500">{transaction.date}</p>
                      </div>
                    </div>
                    <div className={`font-semibold ${transaction.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {transaction.type === 'income' ? '+' : '-'}{currency.format(transaction.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">Alertes & actions</h2>
                <button className="text-sm font-medium text-blue-600">Voir tout</button>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
                    <div>
                      <p className="font-semibold text-slate-800">Budget électricité</p>
                      <p className="text-xs text-slate-600">Dépassement de 8% par rapport au budget estimé</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                    <div>
                      <p className="font-semibold text-slate-800">Vote en attente</p>
                      <p className="text-xs text-slate-600">Budget 2027 en attente de validation par 3 copropriétaires</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-sky-600 text-[9px] font-bold text-white">i</span>
                    <div>
                      <p className="font-semibold text-slate-800">Devis à valider</p>
                      <p className="text-xs text-slate-600">Rénovation du toit - 3 devis reçus à examiner</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
