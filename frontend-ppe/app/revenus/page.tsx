'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import BanniereConnexion from '@/components/BanniereConnexion'
import { apiFetch, messageErreur, SessionExpireeError } from '@/lib/api'
import { LayoutDashboard, FileText, Zap, BarChart2, Folder, Wallet, Settings, LogOut, Bell, Upload, Plus, Activity, Calculator, ArrowUpRight } from 'lucide-react'


type Revenu = { id: number; montant: number; date: string; categorie: string; appartement: string }
type Options = { categories: string[]; appartements: string[] }

const convertirDateEnIso = (dateFrancaise: string) => {
  const correspondance = dateFrancaise.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!correspondance) return null

  const [, jour, mois, annee] = correspondance
  const date = new Date(Number(annee), Number(mois) - 1, Number(jour))
  if (date.getFullYear() !== Number(annee) || date.getMonth() !== Number(mois) - 1 || date.getDate() !== Number(jour)) {
    return null
  }

  return `${annee}-${mois}-${jour}`
}

const formaterDate = (dateIso: string) => {
  const correspondance = dateIso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return correspondance ? `${correspondance[3]}/${correspondance[2]}/${correspondance[1]}` : dateIso
}

export default function RevenusPage() {
  const [options, setOptions] = useState<Options>({ categories: [], appartements: [] })
  const [revenus, setRevenus] = useState<Revenu[]>([])
  const [montant, setMontant] = useState('')
  const [date, setDate] = useState('')
  const [categorie, setCategorie] = useState('')
  const [appartement, setAppartement] = useState('')
  const [erreurs, setErreurs] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [fichier, setFichier] = useState<File | null>(null)
  const [chargement, setChargement] = useState(false)
  const [nonConnecte, setNonConnecte] = useState(false)

  // KAN-12 : toute erreur 401 affiche le bandeau de connexion
  const gererErreur = (erreur: unknown) => {
    if (erreur instanceof SessionExpireeError) {
      setNonConnecte(true)
    } else {
      setErreurs([messageErreur(erreur)])
    }
  }

  const chargerRevenus = async () => {
    const response = await apiFetch('/api/revenus')
    if (response.ok) setRevenus(await response.json())
  }

  useEffect(() => {
    const charger = async () => {
      const [optionsResponse] = await Promise.all([
        apiFetch('/api/revenus/options'),
        chargerRevenus(),
      ])
      if (optionsResponse.ok) setOptions(await optionsResponse.json())
    }
    charger().catch(gererErreur)
  }, [])

  const envoyerFormulaire = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErreurs([])
    setMessage('')
    const montantNumerique = Number(montant.replace(',', '.'))
    if (!Number.isFinite(montantNumerique) || montantNumerique <= 0) {
      setErreurs(['Saisissez un montant supérieur à 0'])
      return
    }
    const dateIso = convertirDateEnIso(date)
    if (!dateIso) {
      setErreurs(['Saisissez une date valide au format JJ/MM/AAAA'])
      return
    }
    setChargement(true)
    try {
      const response = await apiFetch('/api/revenus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ montant: montantNumerique, date: dateIso, categorie, appartement }),
      })
      const data = await response.json()
      if (!response.ok) {
        setErreurs(data.erreurs ?? ['Impossible d’enregistrer le revenu'])
        return
      }
      setMontant('')
      setDate('')
      setCategorie('')
      setAppartement('')
      setMessage('Revenu enregistré')
      await chargerRevenus()
    } catch {
      setErreurs(['Le backend est indisponible'])
    } finally {
      setChargement(false)
    }
  }

  const importerFichier = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!fichier) {
      setErreurs(['Sélectionnez un fichier CSV ou Excel'])
      return
    }
    setErreurs([])
    setMessage('')
    setChargement(true)
    const donnees = new FormData()
    donnees.append('fichier', fichier)
    try {
      const response = await apiFetch('/api/revenus/import', { method: 'POST', body: donnees })
      const data = await response.json()
      if (!response.ok) {
        setErreurs(data.erreurs ?? ['Import impossible'])
        return
      }
      setFichier(null)
      setMessage(`${data.importes} revenu(s) importé(s)`)
      await chargerRevenus()
      event.currentTarget.reset()
    } catch {
      setErreurs(['Le backend est indisponible'])
    } finally {
      setChargement(false)
    }
  }

  const formatMontant = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'CHF' })

  return (
    <div className="flex min-h-screen bg-[#f5f7fb] font-sans text-slate-900">
      <aside className="hidden w-64 flex-shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
        <div className="flex items-center gap-3 p-6">
          <div className="rounded-lg bg-emerald-600 p-2 text-sm font-bold text-white">PPE</div>
          <div>
            <h2 className="text-sm font-bold leading-tight text-slate-900">PPE Gestion</h2>
            <p className="text-xs text-slate-500">Gestion de copropriété</p>
          </div>
        </div>

        <div className="px-4 pb-3">
          <button className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-sm font-medium text-slate-700 shadow-sm">
            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-600" /> Les Terrasses</span>
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
          <Link href="/statistiques" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100">
            <Activity className="h-5 w-5" /> Statistiques
          </Link>
          <Link href="/saisie" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100">
            <FileText className="h-5 w-5" /> Dépenses
          </Link>
          <Link href="/revenus" className="flex items-center gap-3 rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-medium text-white shadow-sm transition">
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
              <h1 className="text-[2rem] font-bold tracking-[-0.04em] text-slate-900">Saisie des revenus</h1>
              <p className="mt-1 text-sm text-slate-500">Enregistrez les revenus par montant, date, catégorie et appartement.</p>
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

          {nonConnecte && <BanniereConnexion />}

          <section className="mb-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Revenus du mois</span>
                <ArrowUpRight className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="mb-2 text-3xl font-bold text-slate-900">CHF 42'150</p>
              <div className="flex items-center gap-2 text-xs">
                <span className="rounded bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700">+12,1% vs mois dernier</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Trésorerie</span>
                <Wallet className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="mb-2 text-3xl font-bold text-slate-900">CHF 96'420</p>
              <div className="flex items-center gap-2 text-xs">
                <span className="rounded bg-sky-100 px-2 py-0.5 font-medium text-sky-700">Solde disponible</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Revenus enregistrés</span>
                <FileText className="h-4 w-4 text-slate-500" />
              </div>
              <p className="mb-2 text-3xl font-bold text-slate-900">{revenus.length}</p>
              <div className="flex items-center gap-2 text-xs">
                <span className="rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-700">Lignes validées</span>
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
            <form onSubmit={envoyerFormulaire} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Saisie manuelle</h2>
                  <p className="mt-1 text-sm text-slate-500">Renseignez les données du revenu à enregistrer.</p>
                </div>
                <button type="button" className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                  <Upload className="h-4 w-4" /> Import CSV
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  Montant (CHF)
                  <input
                    required
                    type="text"
                    inputMode="decimal"
                    pattern="\d+(?:[.,]\d{1,2})?"
                    value={montant}
                    onChange={(event) => { if (/^\d*[.,]?\d{0,2}$/.test(event.target.value)) setMontant(event.target.value) }}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition focus:border-emerald-500"
                    placeholder="1500"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Date
                  <input
                    required
                    type="text"
                    inputMode="numeric"
                    pattern="\d{2}/\d{2}/\d{4}"
                    placeholder="JJ/MM/AAAA"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition focus:border-emerald-500"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Catégorie
                  <select required value={categorie} onChange={(event) => setCategorie(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition focus:border-emerald-500">
                    <option value="">Choisir</option>
                    {options.categories.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Appartement concerné
                  <select required value={appartement} onChange={(event) => setAppartement(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition focus:border-emerald-500">
                    <option value="">Choisir</option>
                    {options.appartements.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>
              </div>

              <button
                type="submit"
                disabled={chargement}
                className="mt-6 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Enregistrer le revenu
              </button>
            </form>

            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Résumé</h2>
                <ul className="mt-4 space-y-3 text-sm text-slate-600">
                  <li className="flex items-center justify-between border-b border-slate-100 pb-2"><span>Dernière saisie</span><span className="font-medium text-slate-900">{revenus[0] ? formaterDate(revenus[0].date) : '—'}</span></li>
                  <li className="flex items-center justify-between border-b border-slate-100 pb-2"><span>Appartements</span><span className="font-medium text-slate-900">{options.appartements.length}</span></li>
                  <li className="flex items-center justify-between"><span>Catégories</span><span className="font-medium text-slate-900">{options.categories.length}</span></li>
                </ul>
              </div>

              <form onSubmit={importerFichier} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Import</h2>
                <p className="mt-2 text-sm text-slate-500">Colonnes attendues : montant, date, categorie, appartement.</p>
                <input
                  required
                  type="file"
                  accept=".csv,.xls,.xlsx"
                  onChange={(event) => setFichier(event.target.files?.[0] ?? null)}
                  className="mt-5 block w-full text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700"
                />
                <button
                  disabled={chargement}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-700 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Upload className="h-4 w-4" /> Importer les revenus
                </button>
              </form>
            </div>
          </section>

          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">Revenus enregistrés ({revenus.length})</h2>
            </div>

            {erreurs.length > 0 && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {erreurs.map((erreur) => <p key={erreur}>{erreur}</p>)}
              </div>
            )}

            {message && (
              <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                {message}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="px-3 py-3">Date</th>
                    <th className="px-3 py-3">Catégorie</th>
                    <th className="px-3 py-3">Appartement</th>
                    <th className="px-3 py-3 text-right">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {revenus.map((revenu) => (
                    <tr key={revenu.id} className="border-b border-slate-100">
                      <td className="px-3 py-3 text-slate-600">{formaterDate(revenu.date)}</td>
                      <td className="px-3 py-3 text-slate-700">{revenu.categorie}</td>
                      <td className="px-3 py-3 text-slate-700">{revenu.appartement}</td>
                      <td className="px-3 py-3 text-right font-semibold text-slate-900">{formatMontant.format(revenu.montant)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
