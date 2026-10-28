'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  CheckCircle2,
} from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import MenuLateral from '@/components/MenuLateral'
import { formatDate } from '@/lib/format'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

type Role = 'admin' | 'owner'

type User = {
  id: string
  name: string
  email: string
  role: Role
}

// KAN-26 : resume de l'exercice renvoye par GET /api/financial/summary
type Summary = {
  annee: number
  totalBalance: number
  totalIncome: number
  totalExpenses: number
  budgetTotal: number
  budgetUtilise: number
  budgetRestant: number
  budgetUsage: number
  activeAccounts: number
}

// Graphique "Revenus & depenses" : GET /api/financial/mensuel
// Ligne renvoyee par GET /api/financial/transactions
type Transaction = { id: string; type: 'income' | 'expense'; category: string; label: string; amount: number; date: string }

type ProjetResume = { id: number; titre: string; progression: number; statut: string }
const COULEUR_STATUT: Record<string, string> = { 'En cours': 'bg-blue-600', Planifié: 'bg-amber-400', Terminé: 'bg-emerald-500' }

type MoisFinancier = { mois: number; recettes: number; depenses: number }
const NOMS_MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']

// KAN-17 : alerte budgetaire renvoyee par GET /api/budgets/:annee/suivi
type AlerteBudget = {
  niveau: 'depasse' | 'attention' | 'hors_budget'
  categorie: string | null
  message: string
}

const STYLE_ALERTE: Record<AlerteBudget['niveau'], { cadre: string; icone: string; titre: string }> = {
  depasse: { cadre: 'border-rose-200 bg-rose-50', icone: 'text-rose-600', titre: 'Budget dépassé' },
  attention: { cadre: 'border-amber-200 bg-amber-50', icone: 'text-amber-600', titre: 'Risque de dépassement' },
  hors_budget: { cadre: 'border-sky-200 bg-sky-50', icone: 'text-sky-600', titre: 'Dépense hors budget' },
}

export default function HomePage() {
  const [email, setEmail] = useState('admin@ppe.fr')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState('')

  useEffect(() => {
    // localStorage n'existe que dans le navigateur : on le lit apres le
    // premier rendu (le lire pendant le rendu casserait l'hydratation Next).
    const savedToken = localStorage.getItem('ppe_token')
    if (savedToken) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture unique du stockage navigateur
      setToken(savedToken)
    }
  }, [])
  const [user, setUser] = useState<User | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [evolution, setEvolution] = useState<MoisFinancier[]>([])
  const [projets, setProjets] = useState<ProjetResume[]>([])
  const [error, setError] = useState('')
  // null = alertes non accessibles (reservees a l'administrateur)
  const [alertes, setAlertes] = useState<AlerteBudget[] | null>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchProtectedData = async (authToken: string) => {
    const response = await fetch(`${API_URL}/api/financial/summary`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    })

    if (response.status === 401) {
      // KAN-12 : token expiré ou invalide (ex. backend redémarré) -> on
      // l'oublie pour réafficher le formulaire de connexion.
      localStorage.removeItem('ppe_token')
      setToken('')
      throw new Error('Votre session a expiré, reconnectez-vous.')
    }

    if (!response.ok) {
      throw new Error('Impossible de récupérer le tableau de bord.')
    }

    const data = await response.json()
    setSummary(data.summary)
    setUser(data.user)

    // (l'appel a /api/financial/budgets a ete retire : son resultat n'etait affiche nulle part)
    const transactionsResponse = await fetch(`${API_URL}/api/financial/transactions`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })

    if (!transactionsResponse.ok) {
      throw new Error('Les données financières sont inaccessibles.')
    }

    const transactionsData = await transactionsResponse.json()
    setTransactions(transactionsData.transactions)

    // Graphique mensuel de l'exercice (vraies donnees, plus de barres en dur)
    const mensuelResponse = await fetch(`${API_URL}/api/financial/mensuel?annee=${data.summary.annee}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })
    setEvolution(mensuelResponse.ok ? (await mensuelResponse.json()).mois : [])

    // Projets reels (KAN-33), les plus avances en premier
    const projetsResponse = await fetch(`${API_URL}/api/projets`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })
    const listeProjets: ProjetResume[] = projetsResponse.ok ? await projetsResponse.json() : []
    setProjets([...listeProjets].sort((a, b) => b.progression - a.progression).slice(0, 4))

    // KAN-17 : alertes de depassement calculees en direct par le backend
    // (403 pour un coproprietaire : le suivi est reserve a l'administrateur)
    const suiviResponse = await fetch(`${API_URL}/api/budgets/${new Date().getFullYear()}/suivi`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })
    setAlertes(suiviResponse.ok ? (await suiviResponse.json()).alertes : null)
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
      // fetch() leve une TypeError ("Failed to fetch") si le backend est eteint
      setError(
        loginError instanceof TypeError
          ? 'Le serveur est injoignable. Vérifiez que le backend est démarré.'
          : loginError instanceof Error
            ? loginError.message
            : 'Une erreur inconnue est survenue',
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!token) return

    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement des donnees a la connexion
    void fetchProtectedData(token).catch((fetchError) => {
      setError(fetchError instanceof Error ? fetchError.message : 'Erreur de chargement')
    })
  }, [token])

  // KAN-26 : une PPE suisse compte en francs suisses (et non en euros)
  const currency = new Intl.NumberFormat('fr-CH', {
    style: 'currency',
    currency: 'CHF',
    maximumFractionDigits: 0,
  })

  const dateDuJour = new Intl.DateTimeFormat('fr-CH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())

  // Token present mais donnees pas encore recues : evite d'afficher
  // furtivement le formulaire de connexion au rechargement de la page.
  if (token && !user && !error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
        Chargement du tableau de bord…
      </div>
    )
  }

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
                  Espace membres
                </div>
              </div>

              <div className="space-y-5">
                <label className="block text-sm font-medium text-slate-700">
                  Email
                  <input
                    aria-label="Email"
                    type="email"
                    autoComplete="username"
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
      <MenuLateral onDeconnexion={() => setToken('')} />

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
              <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium capitalize text-slate-700 shadow-sm">
                {dateDuJour}
              </div>
              <button
                aria-label={alertes && alertes.length > 0 ? `${alertes.length} alerte(s) budgétaire(s)` : 'Aucune alerte'}
                className="relative rounded-full border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition hover:bg-slate-50"
              >
                <Bell className="h-5 w-5" />
                {alertes && alertes.length > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[11px] font-bold text-white">
                    {alertes.length}
                  </span>
                )}
              </button>
            </div>
          </header>

          {summary ? (
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {/* KAN-26 : les 4 cartes affichent les vrais chiffres de l'exercice
                  (avant : pourcentages ecrits en dur, ex. "8.4% vs mois dernier") */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Solde {summary.annee}</span>
                </div>
                <p className={`mb-2 text-3xl font-bold ${summary.totalBalance < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                  {currency.format(summary.totalBalance)}
                </p>
                <div className="flex items-center gap-2 text-xs">
                  <span className="rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-600">Revenus − dépenses de l’exercice</span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Revenus {summary.annee}</span>
                  <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                </div>
                <p className="mb-2 text-3xl font-bold text-slate-900">{currency.format(summary.totalIncome)}</p>
                <div className="flex items-center gap-2 text-xs">
                  <span className="rounded bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700">Encaissés depuis le 1er janvier</span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Dépenses {summary.annee}</span>
                  <ArrowDownRight className="h-4 w-4 text-rose-500" />
                </div>
                <p className="mb-2 text-3xl font-bold text-slate-900">{currency.format(summary.totalExpenses)}</p>
                <div className="flex items-center gap-2 text-xs">
                  <span className="rounded bg-rose-100 px-2 py-0.5 font-medium text-rose-700">Payées depuis le 1er janvier</span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Budget restant</span>
                </div>
                <p className={`mb-2 text-3xl font-bold ${summary.budgetRestant < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                  {currency.format(summary.budgetRestant)}
                </p>
                <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${summary.budgetUsage > 100 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(summary.budgetUsage, 100)}%` }}
                  />
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span
                    className={`rounded px-2 py-0.5 font-medium ${
                      summary.budgetUsage > 100 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {summary.budgetUsage}% de {currency.format(summary.budgetTotal)} utilisé
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
                  <p className="mt-1 text-sm text-slate-500">Évolution mensuelle • {summary?.annee ?? new Date().getFullYear()}</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                  <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Revenus</span>
                  <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Dépenses</span>
                </div>
              </div>

              <div className="h-64">
                {evolution.length === 0 ? (
                  <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400">
                    Aucun mouvement enregistré pour cet exercice
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={evolution.map((m) => ({ ...m, nom: NOMS_MOIS[m.mois - 1] }))} barGap={2}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="nom" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={56}
                        tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                      <Tooltip formatter={(v) => currency.format(Number(v))} cursor={{ fill: '#f1f5f9' }} />
                      <Bar dataKey="recettes" name="Revenus" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="depenses" name="Dépenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">Projets en cours</h2>
                <Link href="/projets" className="text-sm font-medium text-blue-600 hover:underline">Voir tout</Link>
              </div>

              <div className="space-y-5">
                {projets.length === 0 ? (
                  <p className="text-sm text-slate-400">Aucun projet enregistré.</p>
                ) : (
                  projets.map((projet) => (
                    <div key={projet.id}>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700">{projet.titre}</span>
                        <span className="font-semibold text-slate-700">{projet.progression}%</span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${COULEUR_STATUT[projet.statut] ?? 'bg-slate-400'}`}
                          style={{ width: `${Math.min(100, projet.progression)}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-slate-400">{projet.statut}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          <section className="mt-8 grid gap-6 xl:grid-cols-[1.6fr_0.9fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">Dernières transactions</h2>
                <Link href="/tableau-de-bord" className="text-sm font-medium text-blue-600 hover:underline">Tout voir</Link>
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
                        <p className="text-xs text-slate-500">{formatDate(transaction.date)} · {transaction.category}</p>
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
                <h2 className="text-xl font-semibold text-slate-900">Alertes budgétaires</h2>
                <Link href="/budgets" className="text-sm font-medium text-blue-600">
                  Voir le budget
                </Link>
              </div>

              {/* KAN-17 : alertes reelles (avant : 3 alertes ecrites en dur) */}
              <div className="space-y-4">
                {alertes === null ? (
                  <p className="text-sm text-slate-500">Le suivi du budget est réservé à l’administrateur.</p>
                ) : alertes.length === 0 ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                      <div>
                        <p className="font-semibold text-slate-800">Tout est dans le budget</p>
                        <p className="text-xs text-slate-600">Aucune catégorie ne dépasse ou ne risque de dépasser son budget.</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  alertes.slice(0, 4).map((alerte) => (
                    <div key={alerte.message} className={`rounded-xl border p-3 ${STYLE_ALERTE[alerte.niveau].cadre}`}>
                      <div className="flex items-start gap-3">
                        <AlertTriangle className={`mt-0.5 h-4 w-4 flex-shrink-0 ${STYLE_ALERTE[alerte.niveau].icone}`} />
                        <div>
                          <p className="font-semibold text-slate-800">{STYLE_ALERTE[alerte.niveau].titre}</p>
                          <p className="text-xs text-slate-600">{alerte.message}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                {alertes && alertes.length > 4 && (
                  <p className="text-xs text-slate-500">+ {alertes.length - 4} autre(s) alerte(s) dans la page Budgets</p>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
