'use client'

import { Fragment, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  BarChart2,
  Calculator,
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  LayoutDashboard,
  LogOut,
  Settings,
  Wallet,
  Zap,
} from 'lucide-react'

// --- KAN-22 : repartition des charges et rapprochement de comptes ---

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
const ANNEE_COURANTE = new Date().getFullYear()
const ANNEES = Array.from({ length: 5 }, (_, index) => ANNEE_COURANTE - index)

type DecompteLot = {
  reference: string
  quote_part: number
  charges: number
  acomptes: number
  solde: number
  parCategorie: Record<string, number>
}

type Decompte = {
  annee: number
  totalDepenses: number
  lots: DecompteLot[]
  avertissement: { nombre: number; montant: number; message: string } | null
}

type Statut = 'rapprochee' | 'ecart' | 'sans_justificatif'

type TransactionRapprochement = {
  id: number
  date: string
  description: string
  montant: number
  categorie: string | null
  cle: 'quote_part' | 'egal'
  lot: string | null
  montantFacture: number | null
  numeroFacture: string | null
  statut: Statut
}

type Rapprochement = {
  resume: Record<Statut, number>
  transactions: TransactionRapprochement[]
}

const STATUTS: Record<Statut, { libelle: string; classe: string }> = {
  rapprochee: { libelle: 'Rapprochée', classe: 'bg-emerald-100 text-emerald-700' },
  ecart: { libelle: 'Écart', classe: 'bg-orange-100 text-orange-700' },
  sans_justificatif: { libelle: 'Sans justificatif', classe: 'bg-rose-100 text-rose-700' },
}

const formatMontant = new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF' })

const formaterDate = (dateIso: string) => {
  const correspondance = dateIso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return correspondance ? `${correspondance[3]}/${correspondance[2]}/${correspondance[1]}` : dateIso
}

// Ce que voit l'admin dans la colonne « Répartition » : charge privative ou cle utilisee
const libelleRepartition = (transaction: TransactionRapprochement) => {
  if (transaction.lot && transaction.lot !== 'Parties communes') return `Lot ${transaction.lot} (100 %)`
  return transaction.cle === 'egal' ? 'Commune — parts égales' : 'Commune — quote-part'
}

export default function ChargesPage() {
  const [annee, setAnnee] = useState(ANNEE_COURANTE)
  const [decompte, setDecompte] = useState<Decompte | null>(null)
  const [rapprochement, setRapprochement] = useState<Rapprochement | null>(null)
  const [lotOuvert, setLotOuvert] = useState<string | null>(null)
  const [erreur, setErreur] = useState('')
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    const charger = async () => {
      setChargement(true)
      setErreur('')
      const token = localStorage.getItem('ppe_token')
      if (!token) {
        setErreur('Connectez-vous depuis le tableau de bord pour accéder aux charges.')
        setChargement(false)
        return
      }

      try {
        const headers = { Authorization: `Bearer ${token}` }
        const [reponseDecompte, reponseRapprochement] = await Promise.all([
          fetch(`${API_URL}/api/charges/decompte?annee=${annee}`, { headers }),
          fetch(`${API_URL}/api/charges/rapprochement?annee=${annee}`, { headers }),
        ])

        if (reponseDecompte.status === 401) {
          setErreur('Session expirée : reconnectez-vous depuis le tableau de bord.')
          return
        }
        if (reponseDecompte.status === 403) {
          setErreur('Accès réservé à l’administrateur.')
          return
        }
        if (!reponseDecompte.ok || !reponseRapprochement.ok) {
          setErreur('Impossible de charger les charges')
          return
        }

        setDecompte(await reponseDecompte.json())
        setRapprochement(await reponseRapprochement.json())
      } catch {
        setErreur('Le backend est indisponible')
      } finally {
        setChargement(false)
      }
    }
    void charger()
  }, [annee])

  const totalAcomptes = decompte?.lots.reduce((total, lot) => total + lot.acomptes, 0) ?? 0
  const soldeGlobal = decompte?.lots.reduce((total, lot) => total + lot.solde, 0) ?? 0

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
          <Link href="/charges" className="flex items-center gap-3 rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-medium text-white shadow-sm transition">
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
              <h1 className="text-[2rem] font-bold tracking-[-0.04em] text-slate-900">Décompte des charges</h1>
              <p className="mt-1 text-sm text-slate-500">
                Ventilation automatique des dépenses entre les lots et rapprochement avec les factures.
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              Exercice
              <select
                value={annee}
                onChange={(event) => setAnnee(Number(event.target.value))}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none focus:border-emerald-500"
              >
                {ANNEES.map((valeur) => (
                  <option key={valeur} value={valeur}>{valeur}</option>
                ))}
              </select>
            </label>
          </header>

          {erreur && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {erreur} {erreur.includes('tableau de bord') && <Link href="/" className="font-semibold underline">Aller au tableau de bord</Link>}
            </div>
          )}

          {chargement && !erreur && <p className="text-sm text-slate-500">Chargement…</p>}

          {decompte && rapprochement && !erreur && (
            <>
              {decompte.avertissement && (
                <div className="mb-6 flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">
                  <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                  <span>
                    {decompte.avertissement.message} Montant concerné : <strong>{formatMontant.format(decompte.avertissement.montant)}</strong>.
                  </span>
                </div>
              )}

              <section className="mb-8 grid gap-4 md:grid-cols-4">
                {[
                  { titre: 'Dépenses de l’exercice', valeur: formatMontant.format(decompte.totalDepenses) },
                  { titre: 'Acomptes versés', valeur: formatMontant.format(totalAcomptes) },
                  { titre: 'Solde global à payer', valeur: formatMontant.format(soldeGlobal) },
                  {
                    titre: 'Rapprochement',
                    valeur: `${rapprochement.resume.rapprochee} / ${rapprochement.transactions.length}`,
                  },
                ].map((carte) => (
                  <div key={carte.titre} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">{carte.titre}</span>
                    <p className="mt-3 text-2xl font-bold text-slate-900">{carte.valeur}</p>
                  </div>
                ))}
              </section>

              <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-900">Décompte par lot</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Solde = charges − acomptes. Positif : le copropriétaire doit payer ; négatif : la PPE lui rembourse. Cliquez sur un lot pour le détail.
                </p>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[650px] text-left text-sm">
                    <thead className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="py-3">Lot</th>
                        <th className="py-3 text-right">Quote-part</th>
                        <th className="py-3 text-right">Charges</th>
                        <th className="py-3 text-right">Acomptes</th>
                        <th className="py-3 text-right">Solde</th>
                      </tr>
                    </thead>
                    <tbody>
                      {decompte.lots.map((lot) => (
                        <Fragment key={lot.reference}>
                          <tr
                            onClick={() => setLotOuvert(lotOuvert === lot.reference ? null : lot.reference)}
                            className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                          >
                            <td className="flex items-center gap-2 py-3 font-medium text-slate-900">
                              {lotOuvert === lot.reference ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              {lot.reference}
                            </td>
                            <td className="py-3 text-right text-slate-600">{lot.quote_part.toFixed(2)} %</td>
                            <td className="py-3 text-right text-slate-900">{formatMontant.format(lot.charges)}</td>
                            <td className="py-3 text-right text-slate-600">{formatMontant.format(lot.acomptes)}</td>
                            <td className={`py-3 text-right font-semibold ${lot.solde > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                              {formatMontant.format(lot.solde)}
                            </td>
                          </tr>
                          {lotOuvert === lot.reference && (
                            <tr className="border-b border-slate-100 bg-slate-50">
                              <td colSpan={5} className="px-8 py-3">
                                <ul className="space-y-1">
                                  {Object.entries(lot.parCategorie).map(([categorie, montant]) => (
                                    <li key={categorie} className="flex justify-between text-slate-600">
                                      <span>{categorie}</span>
                                      <span className="font-medium text-slate-900">{formatMontant.format(montant)}</span>
                                    </li>
                                  ))}
                                </ul>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold text-slate-900">Rapprochement transactions ↔ factures</h2>
                  <div className="flex gap-2 text-xs font-medium">
                    {(Object.keys(STATUTS) as Statut[]).map((statut) => (
                      <span key={statut} className={`rounded px-2 py-1 ${STATUTS[statut].classe}`}>
                        {STATUTS[statut].libelle} : {rapprochement.resume[statut]}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="py-3">Date</th>
                        <th className="py-3">Description</th>
                        <th className="py-3">Catégorie</th>
                        <th className="py-3">Répartition</th>
                        <th className="py-3 text-right">Payé</th>
                        <th className="py-3 text-right">Facture</th>
                        <th className="py-3 pl-4">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rapprochement.transactions.map((transaction) => (
                        <tr key={transaction.id} className="border-b border-slate-100">
                          <td className="py-3 text-slate-600">{formaterDate(transaction.date)}</td>
                          <td className="py-3 text-slate-900">{transaction.description}</td>
                          <td className="py-3 text-slate-600">{transaction.categorie ?? '—'}</td>
                          <td className="py-3 text-slate-600">{libelleRepartition(transaction)}</td>
                          <td className="py-3 text-right text-slate-900">{formatMontant.format(transaction.montant)}</td>
                          <td className="py-3 text-right text-slate-600">
                            {transaction.montantFacture === null
                              ? '—'
                              : `${transaction.numeroFacture ?? ''} · ${formatMontant.format(transaction.montantFacture)}`}
                          </td>
                          <td className="py-3 pl-4">
                            <span className={`rounded px-2 py-1 text-xs font-medium ${STATUTS[transaction.statut].classe}`}>
                              {STATUTS[transaction.statut].libelle}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {rapprochement.transactions.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-slate-500">Aucune dépense pour cet exercice.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
