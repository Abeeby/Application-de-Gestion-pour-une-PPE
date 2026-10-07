'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  BarChart2,
  Calculator,
  FileText,
  Folder,
  History,
  LayoutDashboard,
  LogOut,
  Settings,
  Wallet,
  Zap,
} from 'lucide-react'

// --- KAN-35 : journal des créations, modifications et suppressions ---
// de projets et de dépenses (lecture seule, admin et copropriétaire).

const API_URL = 'http://localhost:3001'

type Valeurs = Record<string, unknown>

type Entree = {
  id: number
  date: string
  utilisateur: { id: number; nom: string } | null
  typeElement: 'projet' | 'depense'
  idElement: number
  idProjet: number | null
  action: 'creation' | 'modification' | 'suppression'
  details: {
    apres?: Valeurs
    avant?: Valeurs
    changements?: Record<string, { avant: unknown; apres: unknown }>
  }
}

const LIBELLES_ACTION = {
  creation: { texte: 'Création', classe: 'bg-emerald-100 text-emerald-700' },
  modification: { texte: 'Modification', classe: 'bg-blue-100 text-blue-700' },
  suppression: { texte: 'Suppression', classe: 'bg-rose-100 text-rose-700' },
}

const LIBELLES_CHAMP: Record<string, string> = {
  titre: 'Titre',
  description: 'Description',
  responsable: 'Responsable',
  budgetTotal: 'Budget',
  progression: 'Progression',
  statut: 'Statut',
  dateDebut: 'Début',
  dateFin: 'Fin',
  etapes: 'Étapes',
  montant: 'Montant',
  date: 'Date',
  categorie: 'Catégorie',
  appartement: 'Appartement',
  projet: 'Projet',
  justificatif: 'Justificatif',
}

function formaterValeur(valeur: unknown) {
  if (valeur === null || valeur === undefined || valeur === '') return '—'
  if (Array.isArray(valeur)) return `${valeur.length} étape(s)`
  return String(valeur)
}

function formaterDate(date: string) {
  const [jour, heure] = date.split(' ')
  const [annee, mois, j] = jour.split('-')
  return `${j}.${mois}.${annee} ${heure?.slice(0, 5) ?? ''}`
}

function nomElement(entree: Entree) {
  const valeurs = entree.details.apres ?? entree.details.avant
  if (entree.typeElement === 'projet') {
    return valeurs?.titre ? `Projet « ${valeurs.titre} »` : `Projet n°${entree.idElement}`
  }
  return valeurs?.montant !== undefined
    ? `Dépense n°${entree.idElement} (${valeurs.montant} CHF)`
    : `Dépense n°${entree.idElement}`
}

function Details({ entree }: { entree: Entree }) {
  if (entree.details.changements) {
    return (
      <ul className="space-y-0.5">
        {Object.entries(entree.details.changements).map(([champ, { avant, apres }]) => (
          <li key={champ}>
            <span className="font-medium text-slate-700">{LIBELLES_CHAMP[champ] ?? champ}</span> :{' '}
            <span className="text-slate-400 line-through">{formaterValeur(avant)}</span> → {formaterValeur(apres)}
          </li>
        ))}
      </ul>
    )
  }

  const valeurs = entree.details.apres ?? entree.details.avant ?? {}
  return (
    <p>
      {Object.entries(valeurs)
        .filter(([, valeur]) => valeur !== null && valeur !== '')
        .map(([champ, valeur]) => `${LIBELLES_CHAMP[champ] ?? champ} : ${formaterValeur(valeur)}`)
        .join(' · ')}
    </p>
  )
}

export default function JournalModifications() {
  const [entrees, setEntrees] = useState<Entree[]>([])
  const [type, setType] = useState('')
  const [action, setAction] = useState('')
  const [du, setDu] = useState('')
  const [au, setAu] = useState('')
  const [erreur, setErreur] = useState('')
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    const charger = async () => {
      setChargement(true)
      setErreur('')
      const token = localStorage.getItem('ppe_token')
      if (!token) {
        setErreur('Connectez-vous depuis le tableau de bord pour consulter le journal.')
        setChargement(false)
        return
      }

      try {
        const filtres = new URLSearchParams({ type, action, du, au })
        const reponse = await fetch(`${API_URL}/api/historique?${filtres}`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (reponse.status === 401) {
          setErreur('Session expirée : reconnectez-vous depuis le tableau de bord.')
          return
        }
        if (!reponse.ok) {
          const data = await reponse.json().catch(() => ({}))
          setErreur(data.erreurs?.join(' ') ?? 'Impossible de charger le journal')
          return
        }

        setEntrees(await reponse.json())
      } catch {
        setErreur('Le backend est indisponible')
      } finally {
        setChargement(false)
      }
    }
    void charger()
  }, [type, action, du, au])

  const classeChamp =
    'rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-500'

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

        <nav className="flex-1 space-y-1 px-4">
          <Link href="/" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100">
            <LayoutDashboard className="h-5 w-5" /> Tableau de bord
          </Link>
          <Link href="/electricite" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100">
            <Zap className="h-5 w-5 fill-current" /> Électricité
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
          <Link href="/modifications" className="flex items-center gap-3 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-medium text-white shadow-sm transition">
            <History className="h-5 w-5" /> Journal
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
          <header className="mb-8">
            <h1 className="text-[2rem] font-bold tracking-[-0.04em] text-slate-900">Journal des modifications</h1>
            <p className="mt-1 text-sm text-slate-500">
              Créations, modifications et suppressions de projets et de dépenses, de la plus récente à la plus ancienne.
            </p>
          </header>

          <section className="mb-6 flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Élément
              <select value={type} onChange={(e) => setType(e.target.value)} className={classeChamp}>
                <option value="">Tous</option>
                <option value="projet">Projets</option>
                <option value="depense">Dépenses</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Action
              <select value={action} onChange={(e) => setAction(e.target.value)} className={classeChamp}>
                <option value="">Toutes</option>
                <option value="creation">Création</option>
                <option value="modification">Modification</option>
                <option value="suppression">Suppression</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Du
              <input type="date" value={du} onChange={(e) => setDu(e.target.value)} className={classeChamp} />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Au
              <input type="date" value={au} onChange={(e) => setAu(e.target.value)} className={classeChamp} />
            </label>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            {erreur ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{erreur}</div>
            ) : chargement ? (
              <p className="text-slate-500">Chargement…</p>
            ) : entrees.length === 0 ? (
              <p className="text-slate-500">Aucune opération ne correspond à ces filtres.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.12em] text-slate-500">
                    <tr>
                      <th className="px-3 py-3">Date</th>
                      <th className="px-3 py-3">Utilisateur</th>
                      <th className="px-3 py-3">Action</th>
                      <th className="px-3 py-3">Élément</th>
                      <th className="px-3 py-3">Détail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entrees.map((entree) => (
                      <tr key={entree.id} className="border-b border-slate-100 align-top">
                        <td className="whitespace-nowrap px-3 py-3 text-slate-600">{formaterDate(entree.date)}</td>
                        <td className="px-3 py-3 text-slate-700">{entree.utilisateur?.nom ?? 'Compte supprimé'}</td>
                        <td className="px-3 py-3">
                          <span className={`rounded px-2 py-0.5 text-xs font-medium ${LIBELLES_ACTION[entree.action].classe}`}>
                            {LIBELLES_ACTION[entree.action].texte}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-medium text-slate-900">{nomElement(entree)}</td>
                        <td className="px-3 py-3 text-slate-600">
                          <Details entree={entree} />
                        </td>
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
