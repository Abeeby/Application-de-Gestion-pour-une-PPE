'use client'

// KAN-29 : historique pluriannuel des depenses par categorie.
//
// Corrections :
//   - les categories et les annees viennent des donnees (avant : listes
//     ecrites en dur, donc "Electricite", "Securite" ou 2026 etaient
//     ignorees et les totaux etaient faux) ;
//   - une reponse d'erreur (403, 500) ne fait plus planter la page ;
//   - meme menu et meme mise en page que le reste de l'application.

import { useState, useEffect, Fragment } from 'react'
import BanniereConnexion from '@/components/BanniereConnexion'
import MenuLateral from '@/components/MenuLateral'
import { apiFetch, messageErreur, SessionExpireeError } from '@/lib/api'

const PREMIERE_ANNEE = 2022
const ANNEE_COURANTE = new Date().getFullYear()
const anneesPossibles = Array.from({ length: ANNEE_COURANTE - PREMIERE_ANNEE + 1 }, (_, i) => PREMIERE_ANNEE + i)

type Depense = {
  annee: number
  categorie: string | null
  montant: number
}

const chf = new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 })

function calculerEcart(montantAvant: number, montantApres: number) {
  if (montantAvant === 0) return 0
  return Number((((montantApres - montantAvant) / montantAvant) * 100).toFixed(1))
}

function Ecart({ valeur }: { valeur: number }) {
  // Rouge = hausse des depenses, vert = baisse
  const couleur = valeur > 0 ? 'text-rose-600' : valeur < 0 ? 'text-emerald-600' : 'text-slate-400'
  return (
    <span className={`font-semibold ${couleur}`}>
      {valeur > 0 ? '+' : ''}
      {valeur.toFixed(1)} %
    </span>
  )
}

export default function Historique() {
  const [depenses, setDepenses] = useState<Depense[]>([])
  const [anneeDebut, setAnneeDebut] = useState(Math.max(PREMIERE_ANNEE, ANNEE_COURANTE - 3))
  const [anneeFin, setAnneeFin] = useState(ANNEE_COURANTE)
  const [nonConnecte, setNonConnecte] = useState(false)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    apiFetch(`/api/depenses/historique?anneeDebut=${anneeDebut}&anneeFin=${anneeFin}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data: Depense[]) => {
        setDepenses(Array.isArray(data) ? data.map((d) => ({ ...d, montant: Number(d.montant) })) : [])
        setErreur('')
      })
      .catch((e: unknown) => {
        // KAN-12 : 401 -> bandeau de connexion, sinon message d'erreur
        if (e instanceof SessionExpireeError) setNonConnecte(true)
        else setErreur(messageErreur(e))
      })
  }, [anneeDebut, anneeFin])

  const annees = anneesPossibles.filter((a) => a >= anneeDebut && a <= anneeFin)
  const categories = [...new Set(depenses.map((d) => d.categorie ?? 'Sans catégorie'))].sort((a, b) => a.localeCompare(b, 'fr'))

  function getMontant(categorie: string, annee: number) {
    return depenses
      .filter((d) => (d.categorie ?? 'Sans catégorie') === categorie && d.annee === annee)
      .reduce((somme, d) => somme + d.montant, 0)
  }

  function getTotal(annee: number) {
    return categories.reduce((somme, cat) => somme + getMontant(cat, annee), 0)
  }

  const selectClass = 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500'

  return (
    <div className="flex min-h-screen bg-[#f5f7fb] font-sans text-slate-900">
      <MenuLateral />

      <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Historique des dépenses</h1>
          <p className="mt-1 text-sm text-slate-500">Comparez les exercices par catégorie et repérez les écarts d’une année à l’autre.</p>
        </header>

        {nonConnecte && <BanniereConnexion />}
        {erreur && <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{erreur}</p>}

        <section className="mb-6 flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <label htmlFor="annee-debut" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Année de début
            </label>
            <select id="annee-debut" value={anneeDebut} onChange={(e) => setAnneeDebut(Number(e.target.value))} className={selectClass}>
              {anneesPossibles
                .filter((a) => a <= anneeFin)
                .map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
            </select>
          </div>
          <div>
            <label htmlFor="annee-fin" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Année de fin
            </label>
            <select id="annee-fin" value={anneeFin} onChange={(e) => setAnneeFin(Number(e.target.value))} className={selectClass}>
              {anneesPossibles
                .filter((a) => a >= anneeDebut)
                .map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
            </select>
          </div>
          <p className="text-xs text-slate-500">
            <span className="font-semibold text-rose-600">Rouge</span> = hausse, <span className="font-semibold text-emerald-600">vert</span> = baisse
          </p>
        </section>

        <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Catégorie</th>
                {annees.map((annee, i) => (
                  <Fragment key={annee}>
                    {i > 0 && <th className="px-4 py-3 text-right font-medium text-slate-400">Écart</th>}
                    <th className="px-4 py-3 text-right">{annee}</th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories.length === 0 && (
                <tr>
                  <td colSpan={annees.length * 2} className="px-4 py-8 text-center text-slate-400">
                    Aucune dépense sur cette période.
                  </td>
                </tr>
              )}
              {categories.map((cat) => (
                <tr key={cat} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-700">{cat}</td>
                  {annees.map((annee, i) => {
                    const montant = getMontant(cat, annee)
                    const montantPrev = i > 0 ? getMontant(cat, annees[i - 1]) : 0
                    return (
                      <Fragment key={annee}>
                        {i > 0 && (
                          <td className="px-4 py-3 text-right text-xs">
                            <Ecart valeur={calculerEcart(montantPrev, montant)} />
                          </td>
                        )}
                        <td className="px-4 py-3 text-right tabular-nums text-slate-700">{chf.format(montant)}</td>
                      </Fragment>
                    )
                  })}
                </tr>
              ))}
            </tbody>
            {categories.length > 0 && (
              <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                <tr>
                  <td className="px-4 py-3 text-slate-900">Total</td>
                  {annees.map((annee, i) => {
                    const total = getTotal(annee)
                    const totalPrev = i > 0 ? getTotal(annees[i - 1]) : 0
                    return (
                      <Fragment key={annee}>
                        {i > 0 && (
                          <td className="px-4 py-3 text-right text-xs">
                            <Ecart valeur={calculerEcart(totalPrev, total)} />
                          </td>
                        )}
                        <td className="px-4 py-3 text-right tabular-nums text-slate-900">{chf.format(total)}</td>
                      </Fragment>
                    )
                  })}
                </tr>
              </tfoot>
            )}
          </table>
        </section>
      </main>
    </div>
  )
}
