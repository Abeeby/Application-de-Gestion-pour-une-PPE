'use client'

import { useEffect, useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

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

  const chargerRevenus = async () => {
    const response = await fetch(`${API_URL}/api/revenus`)
    if (response.ok) setRevenus(await response.json())
  }

  useEffect(() => {
    const charger = async () => {
      const [optionsResponse] = await Promise.all([
        fetch(`${API_URL}/api/revenus/options`),
        chargerRevenus(),
      ])
      if (optionsResponse.ok) setOptions(await optionsResponse.json())
    }
    void charger()
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
      const response = await fetch(`${API_URL}/api/revenus`, {
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
      const response = await fetch(`${API_URL}/api/revenus/import`, { method: 'POST', body: donnees })
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
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 md:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-700">Gestion financière PPE</p>
          <h1 className="mt-2 text-3xl font-bold">Saisie des revenus</h1>
          <p className="mt-2 text-slate-600">Enregistrez les revenus par montant, date, catégorie et appartement.</p>
        </header>
        <div className="grid gap-6 lg:grid-cols-2">
          <form onSubmit={envoyerFormulaire} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold">Saisie manuelle</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium">Montant <span className="text-slate-500">(CHF)</span><input required type="text" inputMode="decimal" pattern="\\d+(?:[.,]\\d{1,2})?" value={montant} onChange={(event) => { if (/^\d*[.,]?\d{0,2}$/.test(event.target.value)) setMontant(event.target.value) }} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">Date <span className="text-slate-500">(JJ/MM/AAAA)</span><input required type="text" inputMode="numeric" pattern="\\d{2}/\\d{2}/\\d{4}" placeholder="JJ/MM/AAAA" value={date} onChange={(event) => setDate(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">Catégorie<select required value={categorie} onChange={(event) => setCategorie(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"><option value="">Choisir</option>{options.categories.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className="text-sm font-medium">Appartement concerné<select required value={appartement} onChange={(event) => setAppartement(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"><option value="">Choisir</option>{options.appartements.map((item) => <option key={item}>{item}</option>)}</select></label>
            </div>
            <button disabled={chargement} className="mt-6 rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">Enregistrer le revenu</button>
          </form>
          <form onSubmit={importerFichier} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold">Importer un fichier</h2>
            <p className="mt-2 text-sm text-slate-600">Colonnes attendues : montant, date, categorie, appartement.</p>
            <input required type="file" accept=".csv,.xls,.xlsx" onChange={(event) => setFichier(event.target.files?.[0] ?? null)} className="mt-5 block w-full text-sm" />
            <button disabled={chargement} className="mt-6 rounded-lg border border-emerald-700 px-4 py-2 font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50">Importer les revenus</button>
          </form>
        </div>
        {erreurs.length > 0 && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{erreurs.map((erreur) => <p key={erreur}>{erreur}</p>)}</div>}
        {message && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{message}</div>}
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-lg font-semibold">Revenus enregistrés ({revenus.length})</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase text-slate-500"><tr><th className="px-3 py-3">Date</th><th className="px-3 py-3">Catégorie</th><th className="px-3 py-3">Appartement</th><th className="px-3 py-3 text-right">Montant</th></tr></thead>
              <tbody>{revenus.map((revenu) => <tr key={revenu.id} className="border-b border-slate-100"><td className="px-3 py-3">{formaterDate(revenu.date)}</td><td className="px-3 py-3">{revenu.categorie}</td><td className="px-3 py-3">{revenu.appartement}</td><td className="px-3 py-3 text-right font-medium">{formatMontant.format(revenu.montant)}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}
