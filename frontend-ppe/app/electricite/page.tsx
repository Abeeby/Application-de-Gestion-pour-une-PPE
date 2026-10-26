'use client'

import { useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'
import BanniereConnexion from '@/components/BanniereConnexion'
import { apiFetch, SessionExpireeError } from '@/lib/api'
import { LayoutDashboard, FileText, Zap, BarChart2, Folder, Wallet, Settings, LogOut, Bell, Upload, Plus, Activity, Calculator } from 'lucide-react'
import Link from 'next/link'

type ProductionData = {
  annee: number
  mois: number
  productionKwh: number
  revenuChf: number
  chargesChf: number
  // calculated
  consommationKwh?: number
  nomMois?: string
}

const moisNoms = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']

export default function ElectricitePage() {
  const [data, setData] = useState<ProductionData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [nonConnecte, setNonConnecte] = useState(false)

  useEffect(() => {
    setIsLoading(true)
    apiFetch('/api/electricite/evolution?annee=2024')
      .then(res => res.json())
      .then(fetchedData => {
        const formattedData = fetchedData.map((item: ProductionData) => ({
          ...item,
          nomMois: moisNoms[item.mois - 1],
          consommationKwh: Math.round(item.chargesChf * 4.5) // Fake consumption based on charges
        }))
        setData(formattedData)
        setIsLoading(false)
      })
      .catch((erreur: unknown) => {
        // KAN-12 : 401 -> bandeau de connexion
        if (erreur instanceof SessionExpireeError) setNonConnecte(true)
        setIsLoading(false)
      })
  }, [])

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Sidebar */}
      <aside className="hidden w-56 flex-shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
        <div className="flex items-center gap-3 p-6">
          <div className="rounded-lg bg-blue-600 p-2 text-sm font-bold text-white">PPE</div>
          <div>
            <h2 className="text-sm font-bold leading-tight text-slate-900">PPE Gestion</h2>
            <p className="text-xs text-slate-500">Gestion de copropriété</p>
          </div>
        </div>

        <div className="px-4 pb-3">
          <button className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-sm font-medium text-slate-700 shadow-sm">
            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-blue-600" /> Les Terrasses</span>
            <span className="text-slate-400">▼</span>
          </button>
        </div>

        <div className="px-4 pb-3">
          <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2.5 text-sm font-semibold text-orange-700 shadow-sm transition hover:bg-orange-100">
            <Plus className="h-4 w-4" /> Nouvelle PPE
          </button>
        </div>

        <nav className="space-y-1 px-4 pb-2 pt-1">
          <Link href="/" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100">
            <LayoutDashboard className="h-5 w-5" /> Tableau de bord
          </Link>
          <Link href="/electricite" className="flex items-center gap-3 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-medium text-white shadow-sm transition">
            <Zap className="h-5 w-5 fill-current" /> Électricité
          </Link>
          <Link href="/statistiques" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100">
            <Activity className="h-5 w-5" /> Statistiques
          </Link>
          <Link href="/saisie" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100">
            <FileText className="h-5 w-5" /> Dépenses
          </Link>
          <Link href="/revenus" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100">
            <Wallet className="h-5 w-5" /> Revenus
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
          <Link href="/" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50">
            <LogOut className="h-5 w-5" /> Déconnexion
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="min-w-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl space-y-6 p-4 sm:space-y-8 sm:p-6 lg:p-8">
          
          {/* Header */}
          <header className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Électricité</h1>
              <p className="mt-1 break-words text-sm text-slate-500 sm:text-base">Consommations communes, relevés solaires et décomptes individuels</p>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 sm:gap-3 md:w-auto md:justify-end">
              <button className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50">
                <Upload className="h-4 w-4" /> Import CSV
              </button>
              <button className="flex min-w-0 items-center gap-2 rounded-lg border border-blue-600 bg-blue-600 px-3 py-2 text-left text-sm font-medium text-white shadow-sm transition hover:bg-blue-700">
                <Plus className="h-4 w-4" /> Saisie manuelle
              </button>
              <div className="bg-white border border-slate-200 px-4 py-2 rounded-full text-sm font-medium text-slate-700 shadow-sm hidden sm:block">
                Mardi, 25 août 2026
              </div>
              <button className="bg-white border border-slate-200 p-2 rounded-full text-slate-600 shadow-sm hover:bg-slate-50 transition">
                <Bell className="h-5 w-5" />
              </button>
            </div>
          </header>

          {nonConnecte && <BanniereConnexion />}

          {/* KPIs */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-6">
            {/* Card 1 */}
            <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Consommation Totale</h3>
                <div className="w-2 h-2 rounded-full bg-slate-300"></div>
              </div>
              <p className="mb-2 break-words text-2xl font-bold text-slate-900 sm:text-3xl">28'450 <span className="text-lg font-semibold text-slate-600 sm:text-xl">kWh</span></p>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="bg-emerald-100 text-emerald-700 font-medium px-2 py-0.5 rounded">-4.2% vs l'année dernière</span>
                <span className="text-slate-400">vs budget voté</span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Coût Global 2026</h3>
                <div className="w-2 h-2 rounded-full bg-slate-300"></div>
              </div>
              <p className="mb-2 break-words text-2xl font-bold text-slate-900 sm:text-3xl">CHF 8'650.00</p>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-emerald-600 font-medium">Dans la cible estimée</span>
                <span className="text-slate-400">vs budget voté</span>
              </div>
            </div>

            {/* Card 3 */}
            <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Production Solaire</h3>
                <div className="w-2 h-2 rounded-full bg-slate-300"></div>
              </div>
              <p className="mb-2 break-words text-2xl font-bold text-slate-900 sm:text-3xl">12'340 <span className="text-lg font-semibold text-slate-600 sm:text-xl">kWh</span></p>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="bg-emerald-100 text-emerald-700 font-medium px-2 py-0.5 rounded">62% d'autoconsommation</span>
                <span className="text-slate-400">vs budget voté</span>
              </div>
            </div>

            {/* Card 4 */}
            <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Économies Réalisées</h3>
                <div className="w-2 h-2 rounded-full bg-slate-300"></div>
              </div>
              <p className="mb-2 break-words text-2xl font-bold text-slate-900 sm:text-3xl">CHF 2'890.00</p>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-emerald-600 font-medium">Grâce au photovoltaïque</span>
                <span className="text-slate-400">vs budget voté</span>
              </div>
            </div>
          </section>

          {/* Content Grid */}
          <section className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] sm:gap-6">
            
            {/* Chart */}
            <div className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-slate-900">Consommation vs Production</h2>
                  <p className="break-words text-sm text-slate-500">Suivi mensuel (kWh) - Année en cours</p>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-slate-600">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-600"></div> Consommation
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div> Solaire
                  </div>
                </div>
              </div>

              <div className="flex-1 min-h-[300px]">
                {isLoading ? (
                  <div className="h-full flex items-center justify-center text-slate-400">Chargement...</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }} barGap={2}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="nomMois" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                      <Tooltip 
                        cursor={{fill: '#f1f5f9'}}
                        contentStyle={{borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                        itemStyle={{color: '#0f172a', fontWeight: '500'}}
                      />
                      <Bar dataKey="consommationKwh" name="Consommation" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={16} />
                      <Bar dataKey="productionKwh" name="Solaire" fill="#10b981" radius={[4, 4, 0, 0]} barSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Repartition */}
            <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-6">Répartition par lot</h2>
              
              <div className="space-y-6">
                {/* Lot 1 */}
                <div>
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 text-sm">Appartement 01</h4>
                      <p className="text-xs text-slate-500">M. Jean Durand</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="break-words text-xs font-bold text-slate-900 sm:text-sm">CHF 1'105.00</p>
                      <p className="text-xs text-slate-500">4'250 kWh</p>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: '65%' }}></div>
                  </div>
                </div>

                {/* Lot 2 */}
                <div>
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 text-sm">Appartement 02</h4>
                      <p className="text-xs text-slate-500">Mme. Marie Favre</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="break-words text-xs font-bold text-slate-900 sm:text-sm">CHF 988.00</p>
                      <p className="text-xs text-slate-500">3'800 kWh</p>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '50%' }}></div>
                  </div>
                </div>

                {/* Lot 3 */}
                <div>
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 text-sm">Appartement 03</h4>
                      <p className="text-xs text-slate-500">M. Pierre Gobet</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="break-words text-xs font-bold text-slate-900 sm:text-sm">CHF 1'326.00</p>
                      <p className="text-xs text-slate-500">5'100 kWh</p>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: '85%' }}></div>
                  </div>
                </div>

                {/* Lot 4 */}
                <div>
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 text-sm">Appartement 04</h4>
                      <p className="text-xs text-slate-500">Famille Pittet</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="break-words text-xs font-bold text-slate-900 sm:text-sm">CHF 754.00</p>
                      <p className="text-xs text-slate-500">2'900 kWh</p>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: '35%' }}></div>
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
