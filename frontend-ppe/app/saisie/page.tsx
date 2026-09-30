'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { LayoutDashboard, FileText, Zap, BarChart2, Folder, Settings, LogOut, Bell, Upload, Plus, Wallet, ArrowDownRight } from 'lucide-react'

type Saisie = {
  id: number
  montant: number
  date: string
  categorie: string
  appartement: string
  projet: string
  justificatif: string
}

export default function Saisie() {
  const [categories, setCategories] = useState<string[]>([])
  const [appartements, setAppartements] = useState<string[]>([])
  const [projets, setProjets] = useState<string[]>([])
  const [saisies, setSaisies] = useState<Saisie[]>([])

  const [montant, setMontant] = useState('')
  const [date, setDate] = useState('')
  const [categorie, setCategorie] = useState('')
  const [appartement, setAppartement] = useState('')
  const [projet, setProjet] = useState('')
  const [justificatif, setJustificatif] = useState('')

  const [erreurs, setErreurs] = useState<string[]>([])
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('http://localhost:3001/api/saisies/options')
      .then(res => res.json())
      .then(data => {
        setCategories(data.categories)
        setAppartements(data.appartements)
        setProjets(data.projets)
      })

    chargerSaisies()
  }, [])

  function chargerSaisies() {
    fetch('http://localhost:3001/api/saisies')
      .then(res => res.json())
      .then(data => setSaisies(data))
  }

  async function envoyerFormulaire(e: React.FormEvent) {
    e.preventDefault()
    setErreurs([])
    setMessage('')

    const dateParts = date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (!dateParts) {
      setErreurs(['La date doit être au format JJ/MM/AAAA'])
      return
    }

    const [, jour, mois, annee] = dateParts
    const dateVerifiee = new Date(Number(annee), Number(mois) - 1, Number(jour))
    if (
      dateVerifiee.getFullYear() !== Number(annee) ||
      dateVerifiee.getMonth() !== Number(mois) - 1 ||
      dateVerifiee.getDate() !== Number(jour)
    ) {
      setErreurs(['La date saisie est invalide'])
      return
    }

    const reponse = await fetch('http://localhost:3001/api/saisies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ montant: montant.replace(',', '.'), date: `${annee}-${mois}-${jour}`, categorie, appartement, projet, justificatif }),
    })

    const data = await reponse.json()

    if (!reponse.ok) {
      setErreurs(data.erreurs)
      return
    }

    setMessage('Dépense enregistrée')
    setMontant('')
    setDate('')
    setCategorie('')
    setAppartement('')
    setProjet('')
    setJustificatif('')
    chargerSaisies()
  }

  return (
    <div className="flex min-h-screen bg-[#f5f7fb] font-sans text-slate-900">
      <aside className="hidden w-64 flex-shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
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
            <span className="text-lg leading-none">＋</span> Nouvelle PPE
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-4">
          <Link href="/" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100">
            <LayoutDashboard className="h-5 w-5" /> Tableau de bord
          </Link>
          <Link href="/electricite" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100">
            <Zap className="h-5 w-5 fill-current" /> Électricité
          </Link>
          <Link href="/saisie" className="flex items-center gap-3 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-medium text-white shadow-sm transition">
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

        <div className="space-y-1 border-t border-slate-200 p-4">
          <a href="#" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100">
            <Settings className="h-5 w-5" /> Paramètres
          </a>
          <Link href="/" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50">
            <LogOut className="h-5 w-5" /> Déconnexion
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-8">
        <div className="mx-auto max-w-7xl">
          <header className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h1 className="text-[2rem] font-bold tracking-[-0.04em] text-slate-900">Saisie des dépenses</h1>
              <p className="mt-1 text-sm text-slate-500">Enregistrer une nouvelle dépense de la PPE</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
                Mardi, 25 août 2026
              </div>
              <button className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition hover:bg-slate-50">
                <Bell className="h-5 w-5" />
              </button>
            </div>
          </header>

          <section className="mb-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Dépenses du mois</span>
                <ArrowDownRight className="h-4 w-4 text-rose-500" />
              </div>
              <p className="mb-2 text-3xl font-bold text-slate-900">CHF 24'680</p>
              <div className="flex items-center gap-2 text-xs">
                <span className="rounded bg-rose-100 px-2 py-0.5 font-medium text-rose-700">+8,4% vs mois dernier</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Budget restant</span>
                <Wallet className="h-4 w-4 text-blue-500" />
              </div>
              <p className="mb-2 text-3xl font-bold text-slate-900">CHF 15'330</p>
              <div className="flex items-center gap-2 text-xs">
                <span className="rounded bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700">Dans la cible</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Déclarations</span>
                <FileText className="h-4 w-4 text-slate-500" />
              </div>
              <p className="mb-2 text-3xl font-bold text-slate-900">{saisies.length}</p>
              <div className="flex items-center gap-2 text-xs">
                <span className="rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-700">Dépenses enregistrées</span>
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
            <form onSubmit={envoyerFormulaire} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Saisie manuelle</h2>
                  <p className="mt-1 text-sm text-slate-500">Renseignez les informations pour ajouter une dépense.</p>
                </div>
                <button type="button" className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                  <Upload className="h-4 w-4" /> Import CSV
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  Montant (CHF)
                  <input
                    type="text"
                    inputMode="decimal"
                    value={montant}
                    onChange={e => {
                      if (/^\d*(?:[.,]\d{0,2})?$/.test(e.target.value)) {
                        setMontant(e.target.value)
                      }
                    }}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition focus:border-blue-500"
                    placeholder="1500"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Date
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={10}
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition focus:border-blue-500"
                    placeholder="JJ/MM/AAAA"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Catégorie
                  <select value={categorie} onChange={e => setCategorie(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition focus:border-blue-500">
                    <option value="">-- Choisir --</option>
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Appartement concerné
                  <select value={appartement} onChange={e => setAppartement(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition focus:border-blue-500">
                    <option value="">-- Choisir --</option>
                    {appartements.map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                  Projet concerné
                  <select value={projet} onChange={e => setProjet(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition focus:border-blue-500">
                    <option value="">-- Choisir --</option>
                    {projets.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                  Justificatif (numéro de facture)
                  <input
                    type="text"
                    value={justificatif}
                    onChange={e => setJustificatif(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition focus:border-blue-500"
                    placeholder="FAC-2026-001"
                  />
                </label>
              </div>

              <button
                type="submit"
                className="mt-6 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
              >
                Enregistrer la dépense
              </button>
            </form>

            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Résumé</h2>
                <ul className="mt-4 space-y-3 text-sm text-slate-600">
                  <li className="flex items-center justify-between border-b border-slate-100 pb-2"><span>Dernière saisie</span><span className="font-medium text-slate-900">12 août 2026</span></li>
                  <li className="flex items-center justify-between border-b border-slate-100 pb-2"><span>Appartements</span><span className="font-medium text-slate-900">{appartements.length}</span></li>
                  <li className="flex items-center justify-between"><span>Catégories</span><span className="font-medium text-slate-900">{categories.length}</span></li>
                </ul>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Import</h2>
                <p className="mt-2 text-sm text-slate-500">Chargez un CSV ou Excel pour ajouter plusieurs dépenses.</p>
                <button className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
                  <Upload className="h-4 w-4" /> Sélectionner un fichier
                </button>
              </div>
            </div>
          </section>

          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">Dépenses enregistrées ({saisies.length})</h2>
            </div>

            {erreurs.length > 0 && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {erreurs.map(err => (
                  <p key={err}>• {err}</p>
                ))}
              </div>
            )}

            {message && (
              <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                {message}
              </div>
            )}

            {saisies.length === 0 ? (
              <p className="text-slate-500">Aucune dépense saisie pour le moment.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.12em] text-slate-500">
                    <tr>
                      <th className="px-3 py-3">Date</th>
                      <th className="px-3 py-3">Catégorie</th>
                      <th className="px-3 py-3">Appartement</th>
                      <th className="px-3 py-3">Projet</th>
                      <th className="px-3 py-3">Justificatif</th>
                      <th className="px-3 py-3 text-right">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {saisies.map(s => (
                      <tr key={s.id} className="border-b border-slate-100">
                        <td className="px-3 py-3 text-slate-600">{s.date}</td>
                        <td className="px-3 py-3 text-slate-700">{s.categorie}</td>
                        <td className="px-3 py-3 text-slate-700">{s.appartement}</td>
                        <td className="px-3 py-3 text-slate-700">{s.projet}</td>
                        <td className="px-3 py-3 text-slate-700">{s.justificatif || '-'}</td>
                        <td className="px-3 py-3 text-right font-semibold text-slate-900">{s.montant} CHF</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
