'use client'

// KAN-30 : graphiques financiers de la PPE.
//
// Correction : la page affichait uniquement des donnees inventees (aucun
// appel a l'API) et les boutons Mensuel / Trimestriel / Annuel ne
// changeaient rien. Les deux graphiques lisent maintenant les vraies
// donnees de l'exercice choisi :
//   - GET /api/financial/mensuel   -> revenus et depenses cumules
//   - GET /api/depenses/historique -> repartition des depenses par categorie

import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import BanniereConnexion from '@/components/BanniereConnexion'
import MenuLateral from '@/components/MenuLateral'
import { apiFetch, messageErreur, SessionExpireeError } from '@/lib/api'
import { formatChf } from '@/lib/format'

type Mois = { mois: number; recettes: number; depenses: number }
type LigneHistorique = { annee: number; categorie: string | null; montant: number }

const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
const COULEURS = ['#3b82f6', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b']
const ANNEE_COURANTE = new Date().getFullYear()
const ANNEES = Array.from({ length: 5 }, (_, i) => ANNEE_COURANTE - i)

export default function StatistiquesPage() {
  const [annee, setAnnee] = useState(ANNEE_COURANTE)
  const [mois, setMois] = useState<Mois[]>([])
  const [categories, setCategories] = useState<{ nom: string; montant: number }[]>([])
  const [nonConnecte, setNonConnecte] = useState(false)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    let actif = true
    Promise.all([
      apiFetch(`/api/financial/mensuel?annee=${annee}`),
      apiFetch(`/api/depenses/historique?anneeDebut=${annee}&anneeFin=${annee}`),
    ])
      .then(async ([reponseMois, reponseHistorique]) => {
        if (!reponseMois.ok || !reponseHistorique.ok) throw new Error('HTTP')
        const { mois: donneesMois } = await reponseMois.json()
        const historique: LigneHistorique[] = await reponseHistorique.json()
        if (!actif) return

        const parCategorie = new Map<string, number>()
        for (const ligne of historique) {
          const nom = ligne.categorie ?? 'Sans catégorie'
          parCategorie.set(nom, (parCategorie.get(nom) ?? 0) + Number(ligne.montant))
        }
        setMois(donneesMois)
        setCategories(
          [...parCategorie.entries()]
            .map(([nom, montant]) => ({ nom, montant }))
            .filter((c) => c.montant > 0)
            .sort((a, b) => b.montant - a.montant),
        )
        setErreur('')
      })
      .catch((e: unknown) => {
        if (!actif) return
        if (e instanceof SessionExpireeError) setNonConnecte(true)
        else setErreur(messageErreur(e))
      })
    return () => {
      actif = false
    }
  }, [annee])

  // Cumul depuis le 1er janvier, jusqu'au mois en cours pour l'annee courante
  const dernierMois = annee === ANNEE_COURANTE ? new Date().getMonth() + 1 : 12
  const evolution = mois
    .filter((m) => m.mois <= dernierMois)
    .map((m, index, liste) => {
      const precedents = liste.slice(0, index + 1)
      return {
        nom: MOIS[m.mois - 1],
        revenus: precedents.reduce((s, x) => s + x.recettes, 0),
        depenses: precedents.reduce((s, x) => s + x.depenses, 0),
      }
    })
  const totalDepenses = categories.reduce((s, c) => s + c.montant, 0)

  return (
    <div className="flex min-h-screen bg-[#f5f7fb] font-sans text-slate-900">
      <MenuLateral />

      <main className="min-w-0 flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <header className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Statistiques</h1>
              <p className="mt-1 text-sm text-slate-500">Évolution des finances et répartition des dépenses de l’exercice.</p>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
              Exercice
              <select
                value={annee}
                onChange={(e) => setAnnee(Number(e.target.value))}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
              >
                {ANNEES.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </label>
          </header>

          {nonConnecte && <BanniereConnexion />}
          {erreur && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{erreur}</p>}

          <section className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Évolution financière</h2>
                  <p className="text-sm text-slate-500">Revenus et dépenses cumulés depuis le 1er janvier {annee}</p>
                </div>
                <div className="flex items-center gap-4 text-sm font-medium text-slate-600">
                  <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-emerald-500" /> Revenus</span>
                  <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-rose-500" /> Dépenses</span>
                </div>
              </div>

              <div className="min-h-[350px] flex-1">
                {evolution.every((m) => m.revenus === 0 && m.depenses === 0) ? (
                  <div className="flex h-[350px] items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-400">
                    Aucun mouvement en {annee}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={evolution} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="nom" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} width={60}
                        tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                      <Tooltip formatter={(v) => formatChf(Number(v), false)} />
                      <Line type="monotone" dataKey="revenus" name="Revenus" stroke="#10b981" strokeWidth={3} dot={false} />
                      <Line type="monotone" dataKey="depenses" name="Dépenses" stroke="#f43f5e" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-1 text-lg font-bold text-slate-900">Répartition des dépenses</h2>
              <p className="mb-4 text-sm text-slate-500">Total {annee} : {formatChf(totalDepenses, false)}</p>

              {categories.length === 0 ? (
                <p className="py-16 text-center text-sm text-slate-400">Aucune dépense en {annee}</p>
              ) : (
                <>
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={categories} dataKey="montant" nameKey="nom" innerRadius="55%" outerRadius="90%" paddingAngle={3} stroke="none">
                          {categories.map((c, i) => (
                            <Cell key={c.nom} fill={COULEURS[i % COULEURS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => formatChf(Number(v), false)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="mt-4 space-y-2.5">
                    {categories.map((c, i) => (
                      <li key={c.nom} className="flex items-center justify-between gap-2 text-sm">
                        <span className="flex min-w-0 items-center gap-2.5">
                          <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: COULEURS[i % COULEURS.length] }} />
                          <span className="truncate font-medium text-slate-700">{c.nom}</span>
                        </span>
                        <span className="font-bold tabular-nums text-slate-900">{Math.round((c.montant / totalDepenses) * 100)} %</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
