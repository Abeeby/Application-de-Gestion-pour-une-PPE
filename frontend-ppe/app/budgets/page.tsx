'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  BarChart2,
  Calculator,
  Check,
  FileText,
  Folder,
  LayoutDashboard,
  PiggyBank,
  Plus,
  RefreshCw,
  Trash2,
  Users,
  X,
  Zap,
} from 'lucide-react'
import BanniereConnexion from '@/components/BanniereConnexion'
import { apiFetch, messageErreur, SessionExpireeError } from '@/lib/api'

// --- KAN-15 : création et approbation du budget annuel ---

const ANNEE_COURANTE = new Date().getFullYear()
const ANNEES = [ANNEE_COURANTE + 1, ANNEE_COURANTE, ANNEE_COURANTE - 1, ANNEE_COURANTE - 2]

type Statut = 'brouillon' | 'soumis' | 'approuve' | 'rejete'
type Action = 'soumettre' | 'approuver' | 'rejeter' | 'retravailler'

type LigneBudget = {
  categorie: string
  montant: number
  cle: 'quote_part' | 'egal'
  moyenneHistorique: number
}

type PartLot = {
  reference: string
  quote_part: number
  partAnnuelle: number
  acompteMensuel: number
}

type Budget = {
  annee: number
  statut: Statut
  libelleStatut: string
  enveloppe: number
  totalLignes: number
  ecart: number
  dateCreation: string
  dateApprobation: string | null
  anneesReference: number[]
  lignes: LigneBudget[]
  repartition: PartLot[]
  actions: Action[]
  modifiable: boolean
}

type LigneEdition = { categorie: string; montant: string }

type Chargement =
  | { type: 'budget'; budget: Budget }
  | { type: 'absent'; estAdmin: boolean }
  | { type: 'nonConnecte' }
  | { type: 'erreur'; message: string }

const LIBELLES_ACTION: Record<Action, string> = {
  soumettre: 'Soumettre à l’assemblée',
  approuver: 'Approuver (vote de l’AG)',
  rejeter: 'Rejeter',
  retravailler: 'Remettre en brouillon',
}

const ETAPES: { statut: Statut; libelle: string }[] = [
  { statut: 'brouillon', libelle: 'Brouillon' },
  { statut: 'soumis', libelle: 'Soumis' },
  { statut: 'approuve', libelle: 'Approuvé' },
]

const formatMontant = new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 })
const formatMontantPrecis = new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF', minimumFractionDigits: 2 })

/** Lit le budget de l'année (sans toucher à l'état React : testable et sans effet de bord). */
async function chargerBudget(annee: number): Promise<Chargement> {
  try {
    const reponse = await apiFetch(`/api/budgets/${annee}`)
    if (reponse.status === 404) {
      const moi = await apiFetch('/api/auth/me')
      const { user } = await moi.json()
      return { type: 'absent', estAdmin: user?.role === 'admin' }
    }
    if (!reponse.ok) return { type: 'erreur', message: 'Impossible de charger le budget' }
    return { type: 'budget', budget: await reponse.json() }
  } catch (erreur) {
    if (erreur instanceof SessionExpireeError) return { type: 'nonConnecte' }
    return { type: 'erreur', message: messageErreur(erreur) }
  }
}

function versEdition(budget: Budget): LigneEdition[] {
  return budget.lignes.map((ligne) => ({ categorie: ligne.categorie, montant: String(ligne.montant) }))
}

export default function BudgetsPage() {
  const [annee, setAnnee] = useState(ANNEE_COURANTE + 1)
  const [etat, setEtat] = useState<Chargement | null>(null)
  const [lignesEdition, setLignesEdition] = useState<LigneEdition[]>([])
  const [enveloppeEdition, setEnveloppeEdition] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [erreurs, setErreurs] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [envoi, setEnvoi] = useState(false)

  const afficher = (resultat: Chargement) => {
    setEtat(resultat)
    if (resultat.type === 'budget') {
      setLignesEdition(versEdition(resultat.budget))
      setEnveloppeEdition(String(resultat.budget.enveloppe))
    }
  }

  useEffect(() => {
    let annule = false
    chargerBudget(annee).then((resultat) => {
      if (!annule) afficher(resultat)
    })
    return () => {
      annule = true
    }
  }, [annee])

  useEffect(() => {
    // Catégories de dépense proposées pour ajouter une ligne
    apiFetch('/api/saisies/options')
      .then((reponse) => reponse.json())
      .then((data) => setCategories(data.categories ?? []))
      .catch(() => setCategories([]))
  }, [])

  const changerAnnee = (nouvelleAnnee: number) => {
    setEtat(null)
    setErreurs([])
    setMessage('')
    setAnnee(nouvelleAnnee)
  }

  /** Envoie une requête d'écriture puis affiche le budget renvoyé par le serveur. */
  const envoyer = async (chemin: string, methode: 'POST' | 'PUT', corps: object | undefined, succes: string) => {
    setEnvoi(true)
    setErreurs([])
    setMessage('')
    try {
      const reponse = await apiFetch(chemin, {
        method: methode,
        headers: { 'Content-Type': 'application/json' },
        body: corps ? JSON.stringify(corps) : undefined,
      })
      const data = await reponse.json()
      if (!reponse.ok) {
        setErreurs(data.erreurs ?? [data.error ?? 'Action impossible'])
        return
      }
      afficher({ type: 'budget', budget: data })
      setMessage(succes)
    } catch (erreur) {
      if (erreur instanceof SessionExpireeError) setEtat({ type: 'nonConnecte' })
      else setErreurs([messageErreur(erreur)])
    } finally {
      setEnvoi(false)
    }
  }

  const generer = () => envoyer(`/api/budgets/${annee}/generer`, 'POST', undefined, `Proposition ${annee} générée depuis l’historique`)

  const enregistrer = () => {
    const lignes = lignesEdition.map((ligne) => ({
      categorie: ligne.categorie,
      montant: Number(ligne.montant.replace(',', '.')),
    }))
    const enveloppe = Number(enveloppeEdition.replace(',', '.'))
    void envoyer(`/api/budgets/${annee}`, 'PUT', { lignes, enveloppe }, 'Budget enregistré')
  }

  const lancerAction = (action: Action) => {
    if (action === 'approuver' && !confirm(`Confirmer l’approbation du budget ${annee} ? Il ne pourra plus être modifié.`)) {
      return
    }
    void envoyer(`/api/budgets/${annee}/transition`, 'POST', { action }, `Budget ${annee} : ${LIBELLES_ACTION[action].toLowerCase()} ✓`)
  }

  const modifierLigne = (index: number, champ: keyof LigneEdition, valeur: string) => {
    setLignesEdition((lignes) => lignes.map((ligne, i) => (i === index ? { ...ligne, [champ]: valeur } : ligne)))
  }

  const budget = etat?.type === 'budget' ? etat.budget : null
  const categoriesLibres = categories.filter((categorie) => !lignesEdition.some((ligne) => ligne.categorie === categorie))
  const totalRepartition = budget?.repartition.reduce((total, lot) => total + lot.partAnnuelle, 0) ?? 0

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
        <nav className="flex-1 space-y-1 px-4 py-2">
          <Link href="/" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100">
            <LayoutDashboard className="h-5 w-5" /> Tableau de bord
          </Link>
          <Link href="/electricite" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100">
            <Zap className="h-5 w-5" /> Électricité
          </Link>
          <Link href="/saisie" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100">
            <FileText className="h-5 w-5" /> Dépenses
          </Link>
          <Link href="/revenus" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100">
            <Users className="h-5 w-5" /> Revenus
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
          <Link href="/budgets" className="flex items-center gap-3 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-medium text-white shadow-sm">
            <PiggyBank className="h-5 w-5" /> Budgets
          </Link>
        </nav>
      </aside>

      <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-6xl">
          <header className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h1 className="text-2xl font-bold tracking-[-0.04em] text-slate-900 sm:text-[2.2rem]">Budget annuel</h1>
              <p className="mt-1 text-sm text-slate-500">Proposition depuis l’historique, répartition par lot et validation en assemblée</p>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              Exercice
              <select
                value={annee}
                onChange={(event) => changerAnnee(Number(event.target.value))}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm"
              >
                {ANNEES.map((valeur) => (
                  <option key={valeur} value={valeur}>
                    {valeur}
                  </option>
                ))}
              </select>
            </label>
          </header>

          {etat?.type === 'nonConnecte' && <BanniereConnexion />}

          {erreurs.length > 0 && (
            <div role="alert" className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              {erreurs.map((erreur) => (
                <p key={erreur}>{erreur}</p>
              ))}
            </div>
          )}
          {message && (
            <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">{message}</div>
          )}

          {etat === null && <p className="text-sm text-slate-500">Chargement…</p>}
          {etat?.type === 'erreur' && <p className="text-sm text-rose-600">{etat.message}</p>}

          {etat?.type === 'absent' && (
            <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
              <PiggyBank className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <h2 className="text-lg font-semibold text-slate-900">Aucun budget pour {annee}</h2>
              {etat.estAdmin ? (
                <>
                  <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                    L’application peut proposer un budget à partir de la moyenne des dépenses des 3 dernières années complètes (+2 %).
                  </p>
                  <button
                    type="button"
                    onClick={generer}
                    disabled={envoi}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
                  >
                    <RefreshCw className="h-4 w-4" /> Générer depuis l’historique
                  </button>
                </>
              ) : (
                <p className="mt-2 text-sm text-slate-500">L’administrateur n’a pas encore préparé ce budget.</p>
              )}
            </section>
          )}

          {budget && (
            <>
              {/* Étapes du cycle de vie */}
              <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center gap-3">
                  {ETAPES.map((etape, index) => {
                    const indexCourant = ETAPES.findIndex((e) => e.statut === budget.statut)
                    const fait = budget.statut !== 'rejete' && index <= indexCourant
                    return (
                      <div key={etape.statut} className="flex items-center gap-3">
                        <span
                          className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${
                            fait ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {fait ? <Check className="h-4 w-4" /> : <span className="h-4 w-4 text-center text-xs">{index + 1}</span>}
                          {etape.libelle}
                        </span>
                        {index < ETAPES.length - 1 && <span className="h-px w-8 bg-slate-300" />}
                      </div>
                    )
                  })}
                  {budget.statut === 'rejete' && (
                    <span className="flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1.5 text-sm font-semibold text-rose-700">
                      <X className="h-4 w-4" /> Rejeté par l’assemblée
                    </span>
                  )}
                </div>

                {budget.actions.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                    {budget.actions.map((action) => (
                      <button
                        key={action}
                        type="button"
                        disabled={envoi}
                        onClick={() => lancerAction(action)}
                        className={`rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${
                          action === 'rejeter'
                            ? 'border border-rose-200 bg-white text-rose-700 hover:bg-rose-50'
                            : action === 'approuver'
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                              : 'bg-blue-700 text-white hover:bg-blue-800'
                        }`}
                      >
                        {LIBELLES_ACTION[action]}
                      </button>
                    ))}
                  </div>
                )}
                {!budget.modifiable && budget.statut !== 'brouillon' && (
                  <p className="mt-3 text-xs text-slate-500">
                    Ce budget est figé : seul un brouillon peut être modifié.
                    {budget.dateApprobation ? ` Approuvé le ${new Date(budget.dateApprobation).toLocaleDateString('fr-CH')}.` : ''}
                  </p>
                )}
              </section>

              {/* Chiffres clés */}
              <section className="mb-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Enveloppe votée</span>
                  {budget.modifiable ? (
                    <input
                      aria-label="Enveloppe votée"
                      inputMode="decimal"
                      value={enveloppeEdition}
                      onChange={(event) => setEnveloppeEdition(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-2xl font-bold text-slate-900"
                    />
                  ) : (
                    <p className="mt-2 text-3xl font-bold text-slate-900">{formatMontant.format(budget.enveloppe)}</p>
                  )}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Total ventilé</span>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{formatMontant.format(budget.totalLignes)}</p>
                  <p className="mt-1 text-xs text-slate-500">{budget.lignes.length} catégories</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Écart</span>
                  <p className={`mt-2 text-3xl font-bold ${budget.ecart < 0 ? 'text-rose-600' : 'text-slate-900'}`}>{formatMontant.format(budget.ecart)}</p>
                  <p className="mt-1 text-xs text-slate-500">{budget.ecart < 0 ? 'Les lignes dépassent l’enveloppe' : 'Enveloppe − lignes'}</p>
                </div>
              </section>

              {/* Lignes du budget */}
              <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Budget par catégorie</h2>
                    <p className="text-sm text-slate-500">
                      Comparé à la moyenne {budget.anneesReference[0]}–{budget.anneesReference[budget.anneesReference.length - 1]}
                    </p>
                  </div>
                  {budget.modifiable && (
                    <button
                      type="button"
                      onClick={generer}
                      disabled={envoi}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                    >
                      <RefreshCw className="h-4 w-4" /> Regénérer
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] text-left text-sm">
                    <thead className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="py-3">Catégorie</th>
                        <th className="py-3">Répartition</th>
                        <th className="py-3 text-right">Moyenne 3 ans</th>
                        <th className="py-3 text-right">Budget</th>
                        {budget.modifiable && <th className="w-10 py-3" />}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {budget.modifiable
                        ? lignesEdition.map((ligne, index) => {
                            const reference = budget.lignes.find((l) => l.categorie === ligne.categorie)
                            return (
                              <tr key={ligne.categorie}>
                                <td className="py-2.5 font-medium text-slate-900">{ligne.categorie}</td>
                                <td className="py-2.5 text-slate-500">{reference?.cle === 'egal' ? 'Parts égales' : 'Quote-part'}</td>
                                <td className="py-2.5 text-right text-slate-500">
                                  {reference ? formatMontant.format(reference.moyenneHistorique) : '—'}
                                </td>
                                <td className="py-2.5 text-right">
                                  <input
                                    aria-label={`Budget ${ligne.categorie}`}
                                    inputMode="decimal"
                                    value={ligne.montant}
                                    onChange={(event) => modifierLigne(index, 'montant', event.target.value)}
                                    className="w-32 rounded-lg border border-slate-300 bg-slate-50 px-2 py-1.5 text-right text-slate-900"
                                  />
                                </td>
                                <td className="py-2.5 text-right">
                                  <button
                                    type="button"
                                    aria-label={`Retirer ${ligne.categorie}`}
                                    onClick={() => setLignesEdition((lignes) => lignes.filter((_, i) => i !== index))}
                                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </td>
                              </tr>
                            )
                          })
                        : budget.lignes.map((ligne) => (
                            <tr key={ligne.categorie}>
                              <td className="py-2.5 font-medium text-slate-900">{ligne.categorie}</td>
                              <td className="py-2.5 text-slate-500">{ligne.cle === 'egal' ? 'Parts égales' : 'Quote-part'}</td>
                              <td className="py-2.5 text-right text-slate-500">{formatMontant.format(ligne.moyenneHistorique)}</td>
                              <td className="py-2.5 text-right font-semibold text-slate-900">{formatMontant.format(ligne.montant)}</td>
                            </tr>
                          ))}
                    </tbody>
                  </table>
                </div>

                {budget.modifiable && (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                    {categoriesLibres.length > 0 ? (
                      <label className="flex items-center gap-2 text-sm text-slate-600">
                        <Plus className="h-4 w-4" />
                        <select
                          value=""
                          onChange={(event) =>
                            event.target.value &&
                            setLignesEdition((lignes) => [...lignes, { categorie: event.target.value, montant: '' }])
                          }
                          className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-slate-900"
                        >
                          <option value="">Ajouter une catégorie…</option>
                          {categoriesLibres.map((categorie) => (
                            <option key={categorie} value={categorie}>
                              {categorie}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <span />
                    )}
                    <button
                      type="button"
                      onClick={enregistrer}
                      disabled={envoi}
                      className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
                    >
                      Enregistrer le brouillon
                    </button>
                  </div>
                )}
              </section>

              {/* Répartition par lot */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-xl font-semibold text-slate-900">Répartition entre les lots</h2>
                <p className="mb-4 text-sm text-slate-500">
                  Même règle que le décompte de charges : quote-part, ou parts égales pour l’eau et l’électricité.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="py-3">Lot</th>
                        <th className="py-3 text-right">Quote-part</th>
                        <th className="py-3 text-right">Part annuelle</th>
                        <th className="py-3 text-right">Acompte mensuel</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {budget.repartition.map((lot) => (
                        <tr key={lot.reference}>
                          <td className="py-2.5 font-medium text-slate-900">{lot.reference}</td>
                          <td className="py-2.5 text-right text-slate-600">{lot.quote_part.toFixed(2)} %</td>
                          <td className="py-2.5 text-right text-slate-900">{formatMontantPrecis.format(lot.partAnnuelle)}</td>
                          <td className="py-2.5 text-right font-semibold text-blue-700">{formatMontantPrecis.format(lot.acompteMensuel)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t border-slate-200 font-semibold text-slate-900">
                      <tr>
                        <td className="py-3">Total</td>
                        <td />
                        <td className="py-3 text-right">{formatMontantPrecis.format(totalRepartition)}</td>
                        <td />
                      </tr>
                    </tfoot>
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
