'use client'

// KAN-32 : evolution de la production photovoltaique de la PPE.
//
// Corrections :
//   - toutes les valeurs affichees viennent de l'API (avant : 4 cartes de
//     chiffres en dur, une "consommation" inventee a partir des charges et
//     une repartition par lot avec des proprietaires fictifs) ;
//   - choix de l'annee (avant : 2024 code en dur alors que le titre disait
//     "Annee en cours") ; a l'ouverture, la derniere annee avec des releves
//     est selectionnee automatiquement ;
//   - les erreurs de l'API sont affichees au lieu d'etre ignorees.

import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import BanniereConnexion from '@/components/BanniereConnexion'
import MenuLateral from '@/components/MenuLateral'
import { apiFetch, messageErreur, SessionExpireeError } from '@/lib/api'
import { formatChf } from '@/lib/format'

type ProductionData = {
  annee: number
  mois: number
  productionKwh: number
  revenuChf: number
  chargesChf: number
}

const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
const ANNEE_COURANTE = new Date().getFullYear()
const ANNEES = Array.from({ length: 5 }, (_, i) => ANNEE_COURANTE - i)
const kwh = new Intl.NumberFormat('fr-CH', { maximumFractionDigits: 0 })

async function chargerAnnee(annee: number): Promise<ProductionData[]> {
  const reponse = await apiFetch(`/api/electricite/evolution?annee=${annee}`)
  if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`)
  const donnees = await reponse.json()
  return Array.isArray(donnees) ? donnees : []
}

function Carte({ titre, valeur, detail, couleur = 'text-slate-900' }: { titre: string; valeur: string; detail: string; couleur?: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">{titre}</h3>
      <p className={`mb-2 text-2xl font-bold sm:text-3xl ${couleur}`}>{valeur}</p>
      <p className="text-xs text-slate-500">{detail}</p>
    </div>
  )
}

export default function ElectricitePage() {
  const [annee, setAnnee] = useState<number | null>(null)
  const [data, setData] = useState<ProductionData[]>([])
  const [precedente, setPrecedente] = useState<ProductionData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [nonConnecte, setNonConnecte] = useState(false)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    let actif = true

    async function charger() {
      try {
        // Premiere ouverture : on remonte jusqu'a trouver une annee avec des releves
        let anneeChoisie = annee
        let donnees: ProductionData[] = []
        if (anneeChoisie === null) {
          for (const candidate of ANNEES) {
            donnees = await chargerAnnee(candidate)
            anneeChoisie = candidate
            if (donnees.length > 0) break
          }
        } else {
          donnees = await chargerAnnee(anneeChoisie)
        }
        const donneesPrecedentes = await chargerAnnee((anneeChoisie ?? ANNEE_COURANTE) - 1)
        if (!actif) return
        setData(donnees)
        setPrecedente(donneesPrecedentes)
        if (annee === null) setAnnee(anneeChoisie)
        setErreur('')
      } catch (e: unknown) {
        if (!actif) return
        if (e instanceof SessionExpireeError) setNonConnecte(true)
        else setErreur(messageErreur(e))
      } finally {
        if (actif) setIsLoading(false)
      }
    }

    void charger()
    return () => {
      actif = false
    }
  }, [annee])

  const production = data.reduce((s, d) => s + d.productionKwh, 0)
  const productionPrecedente = precedente.reduce((s, d) => s + d.productionKwh, 0)
  const revente = data.reduce((s, d) => s + d.revenuChf, 0)
  const couts = data.reduce((s, d) => s + d.chargesChf, 0)
  const bilan = revente - couts
  const evolution = productionPrecedente > 0 ? ((production - productionPrecedente) / productionPrecedente) * 100 : null
  const meilleurMois = data.length > 0 ? data.reduce((max, d) => (d.productionKwh > max.productionKwh ? d : max)) : null
  const graphique = data.map((d) => ({ ...d, nomMois: MOIS[d.mois - 1] }))

  return (
    <div className="flex min-h-screen bg-[#f5f7fb] font-sans text-slate-900">
      <MenuLateral />

      <main className="min-w-0 flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <header className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Électricité</h1>
              <p className="mt-1 text-sm text-slate-500">Production des panneaux solaires de la PPE, revente au distributeur et coûts d’exploitation.</p>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
              Année
              <select
                value={annee ?? ''}
                onChange={(e) => {
                  setIsLoading(true)
                  setAnnee(Number(e.target.value))
                }}
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

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Carte
              titre="Production solaire"
              valeur={`${kwh.format(production)} kWh`}
              detail={evolution === null ? `${data.length} relevé(s) mensuel(s)` : `${evolution >= 0 ? '+' : ''}${evolution.toFixed(1)} % par rapport à ${(annee ?? ANNEE_COURANTE) - 1}`}
            />
            <Carte titre="Revente au distributeur" valeur={formatChf(revente)} detail="Électricité injectée dans le réseau" couleur="text-emerald-600" />
            <Carte titre="Coûts d’exploitation" valeur={formatChf(couts)} detail="Entretien et frais de l’installation" couleur="text-rose-600" />
            <Carte
              titre="Bilan net"
              valeur={formatChf(bilan)}
              detail={bilan >= 0 ? 'L’installation rapporte plus qu’elle ne coûte' : 'Les coûts dépassent la revente'}
              couleur={bilan >= 0 ? 'text-emerald-600' : 'text-rose-600'}
            />
          </section>

          <section className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">Production mensuelle</h2>
              <p className="mb-6 text-sm text-slate-500">kWh produits par les panneaux solaires, {annee ?? '…'}</p>
              <div className="min-h-[300px] flex-1">
                {isLoading ? (
                  <div className="flex h-full items-center justify-center text-slate-400">Chargement…</div>
                ) : graphique.length === 0 ? (
                  <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-400">
                    Aucun relevé pour {annee}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={graphique} margin={{ top: 10, right: 0, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="nomMois" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                      <Tooltip cursor={{ fill: '#f1f5f9' }} formatter={(v) => `${kwh.format(Number(v))} kWh`} />
                      <Legend />
                      <Bar dataKey="productionKwh" name="Production (kWh)" fill="#10b981" radius={[4, 4, 0, 0]} barSize={22} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">Bilan par mois</h2>
              <p className="mb-4 text-sm text-slate-500">Revente moins coûts</p>
              {meilleurMois && (
                <p className="mb-4 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                  Meilleur mois : <strong>{MOIS[meilleurMois.mois - 1]}</strong> ({kwh.format(meilleurMois.productionKwh)} kWh)
                </p>
              )}
              <ul className="divide-y divide-slate-100 text-sm">
                {graphique.map((d) => {
                  const net = d.revenuChf - d.chargesChf
                  return (
                    <li key={d.mois} className="flex items-center justify-between py-1.5">
                      <span className="text-slate-600">{d.nomMois}</span>
                      <span className={`font-semibold tabular-nums ${net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {net >= 0 ? '+' : ''}
                        {formatChf(net)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
