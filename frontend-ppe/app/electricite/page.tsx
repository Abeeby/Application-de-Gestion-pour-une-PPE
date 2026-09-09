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
import { LayoutDashboard, FileText, Zap, BarChart2, Folder, Users, Settings, LogOut, Bell, Upload, Plus } from 'lucide-react'
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

  useEffect(() => {
    setIsLoading(true)
    fetch(`http://localhost:3001/api/electricite/evolution?annee=2024`)
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
      .catch(() => setIsLoading(false))
  }, [])

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col hidden lg:flex">
        <div className="p-6 flex items-center gap-3">
          <div className="bg-blue-600 text-white p-2 rounded-lg font-bold text-sm">PPE</div>
          <div>
            <h2 className="font-bold text-slate-900 leading-tight">PPE Gestion</h2>
            <p className="text-xs text-slate-500">Gestion de copropriété</p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-100 transition text-sm font-medium">
            <LayoutDashboard className="h-5 w-5" /> Tableau de bord
          </Link>
          <Link href="/electricite" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-blue-600 text-white transition text-sm font-medium shadow-sm">
            <Zap className="h-5 w-5 fill-white" /> Électricité
          </Link>
        </nav>

        <div className="p-4 space-y-1 border-t border-slate-200">
          <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-100 transition text-sm font-medium">
            <Settings className="h-5 w-5" /> Paramètres
          </a>
          <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-rose-600 hover:bg-rose-50 transition text-sm font-medium">
            Déconnexion
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-7xl mx-auto space-y-8">
          
          {/* Header */}
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Électricité</h1>
              <p className="text-slate-500 mt-1">Consommations communes, relevés solaires et décomptes individuels</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition">
                <Upload className="h-4 w-4" /> Import CSV
              </button>
              <button className="flex items-center gap-2 bg-blue-600 border border-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium shadow-sm hover:bg-blue-700 transition">
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

          {/* KPIs */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Consommation Totale</h3>
                <div className="w-2 h-2 rounded-full bg-slate-300"></div>
              </div>
              <p className="text-3xl font-bold text-slate-900 mb-2">28'450 <span className="text-xl font-semibold text-slate-600">kWh</span></p>
              <div className="flex items-center gap-2 text-xs">
                <span className="bg-emerald-100 text-emerald-700 font-medium px-2 py-0.5 rounded">-4.2% vs l'année dernière</span>
                <span className="text-slate-400">vs budget voté</span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Coût Global 2026</h3>
                <div className="w-2 h-2 rounded-full bg-slate-300"></div>
              </div>
              <p className="text-3xl font-bold text-slate-900 mb-2">CHF 8'650.00</p>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-emerald-600 font-medium">Dans la cible estimée</span>
                <span className="text-slate-400">vs budget voté</span>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Production Solaire</h3>
                <div className="w-2 h-2 rounded-full bg-slate-300"></div>
              </div>
              <p className="text-3xl font-bold text-slate-900 mb-2">12'340 <span className="text-xl font-semibold text-slate-600">kWh</span></p>
              <div className="flex items-center gap-2 text-xs">
                <span className="bg-emerald-100 text-emerald-700 font-medium px-2 py-0.5 rounded">62% d'autoconsommation</span>
                <span className="text-slate-400">vs budget voté</span>
              </div>
            </div>

            {/* Card 4 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Économies Réalisées</h3>
                <div className="w-2 h-2 rounded-full bg-slate-300"></div>
              </div>
              <p className="text-3xl font-bold text-slate-900 mb-2">CHF 2'890.00</p>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-emerald-600 font-medium">Grâce au photovoltaïque</span>
                <span className="text-slate-400">vs budget voté</span>
              </div>
            </div>
          </section>

          {/* Content Grid */}
          <section className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
            
            {/* Chart */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Consommation vs Production</h2>
                  <p className="text-sm text-slate-500">Suivi mensuel (kWh) - Année en cours</p>
                </div>
                <div className="flex items-center gap-4 text-sm font-medium text-slate-600">
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
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-6">Répartition par lot</h2>
              
              <div className="space-y-6">
                {/* Lot 1 */}
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Appartement 01</h4>
                      <p className="text-xs text-slate-500">M. Jean Durand</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900 text-sm">CHF 1'105.00</p>
                      <p className="text-xs text-slate-500">4'250 kWh</p>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: '65%' }}></div>
                  </div>
                </div>

                {/* Lot 2 */}
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Appartement 02</h4>
                      <p className="text-xs text-slate-500">Mme. Marie Favre</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900 text-sm">CHF 988.00</p>
                      <p className="text-xs text-slate-500">3'800 kWh</p>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '50%' }}></div>
                  </div>
                </div>

                {/* Lot 3 */}
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Appartement 03</h4>
                      <p className="text-xs text-slate-500">M. Pierre Gobet</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900 text-sm">CHF 1'326.00</p>
                      <p className="text-xs text-slate-500">5'100 kWh</p>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: '85%' }}></div>
                  </div>
                </div>

                {/* Lot 4 */}
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Appartement 04</h4>
                      <p className="text-xs text-slate-500">Famille Pittet</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900 text-sm">CHF 754.00</p>
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
