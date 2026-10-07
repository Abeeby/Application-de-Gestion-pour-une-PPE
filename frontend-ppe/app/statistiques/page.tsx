'use client'

import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { LayoutDashboard, FileText, Zap, BarChart2, Folder, Wallet, Settings, LogOut, Bell, Plus, Activity } from 'lucide-react'
import Link from 'next/link'

const evolutionData = [
  { name: 'Jan', revenus: 12000, depenses: 8000 },
  { name: 'Fév', revenus: 15000, depenses: 9500 },
  { name: 'Mar', revenus: 18000, depenses: 10200 },
  { name: 'Avr', revenus: 22000, depenses: 11000 },
  { name: 'Mai', revenus: 28000, depenses: 15000 },
  { name: 'Juin', revenus: 25000, depenses: 14000 },
]

const repartitionData = [
  { name: 'Entretien & Rénovations', value: 55, fill: '#3b82f6' }, // blue-500
  { name: 'Électricité & Chauffage', value: 30, fill: '#f59e0b' }, // amber-500
  { name: 'Assurances & Admin', value: 15, fill: '#ef4444' }, // red-500
]

export default function StatistiquesPage() {
  const [timeframe, setTimeframe] = useState('mensuel')

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
          <Link href="/electricite" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100">
            <Zap className="h-5 w-5" /> Électricité
          </Link>
          <Link href="/statistiques" className="flex items-center gap-3 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-medium text-white shadow-sm transition">
            <Activity className="h-5 w-5 fill-current" /> Statistiques
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
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Statistiques & Rapports</h1>
              <p className="mt-1 break-words text-sm text-slate-500 sm:text-base">Analyses financières et consommations de la PPE</p>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 sm:gap-3 md:w-auto md:justify-end">
              <div className="bg-white border border-slate-200 px-4 py-2 rounded-full text-sm font-medium text-slate-700 shadow-sm hidden sm:block">
                Mardi, 25 août 2026
              </div>
              
              <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200">
                <button 
                  onClick={() => setTimeframe('mensuel')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${timeframe === 'mensuel' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Mensuel
                </button>
                <button 
                  onClick={() => setTimeframe('trimestriel')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${timeframe === 'trimestriel' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Trimestriel
                </button>
                <button 
                  onClick={() => setTimeframe('annuel')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${timeframe === 'annuel' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Annuel
                </button>
              </div>

              <button className="bg-white border border-slate-200 p-2 rounded-full text-slate-600 shadow-sm hover:bg-slate-50 transition">
                <Bell className="h-5 w-5" />
              </button>
            </div>
          </header>

          {/* Content Grid */}
          <section className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] sm:gap-6">
            
            {/* Chart Evolution */}
            <div className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-slate-900">Évolution financière de la PPE</h2>
                  <p className="break-words text-sm text-slate-500">Revenus vs Dépenses cumulés sur l'exercice</p>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-slate-600">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div> Revenus
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500"></div> Dépenses
                  </div>
                </div>
              </div>

              <div className="flex-1 min-h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={evolutionData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                    <Tooltip 
                      cursor={{stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '3 3'}}
                      contentStyle={{borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                      itemStyle={{color: '#0f172a', fontWeight: '500'}}
                    />
                    <Line type="monotone" dataKey="revenus" name="Revenus" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} />
                    <Line type="monotone" dataKey="depenses" name="Dépenses" stroke="#f43f5e" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#f43f5e', stroke: '#fff', strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Repartition */}
            <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-6">Répartition des coûts</h2>
              
              <div className="flex flex-col items-center justify-center min-h-[350px]">
                <div className="h-48 w-full max-w-[250px] relative -mt-8">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={repartitionData}
                        cx="50%"
                        cy="100%"
                        startAngle={180}
                        endAngle={0}
                        innerRadius="60%"
                        outerRadius="100%"
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {repartitionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                        itemStyle={{color: '#0f172a', fontWeight: '500'}}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="w-full space-y-4 mt-8">
                  {repartitionData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill }}></div>
                        <span className="text-sm font-medium text-slate-700">{item.name}</span>
                      </div>
                      <span className="text-sm font-bold text-slate-900">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </section>
        </div>
      </main>
    </div>
  )
}
