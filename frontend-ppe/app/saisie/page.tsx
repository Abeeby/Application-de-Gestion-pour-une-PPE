'use client'

import { useState, useEffect } from 'react'
import BanniereConnexion from '@/components/BanniereConnexion'
import { apiFetch, messageErreur, SessionExpireeError } from '@/lib/api'
import { FileText, Wallet, ArrowDownRight, Trash2 } from 'lucide-react'
import MenuLateral from '@/components/MenuLateral'
import BandeauConsultation from '@/components/BandeauConsultation'
import { useUtilisateur } from '@/lib/useRole'
import { dateDuJour, formatChf, formatDate } from '@/lib/format'

type Saisie = {
  id: number
  montant: number
  date: string
  categorie: string | null
  appartement: string | null
  projet: string | null
  justificatif: string
}

function Messages({ erreurs, message }: { erreurs: string[]; message: string }) {
  return (
    <>
      {erreurs.length > 0 && (
        <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {erreurs.map(err => (
            <p key={err}>• {err}</p>
          ))}
        </div>
      )}
      {message && (
        <div role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          {message}
        </div>
      )}
    </>
  )
}

export default function Saisie() {
  // Saisie reservee a l'administrateur : le coproprietaire voit un bandeau
  const utilisateur = useUtilisateur()
  const estAdmin = utilisateur?.role === 'admin'
  const [categories, setCategories] = useState<string[]>([])
  const [appartements, setAppartements] = useState<string[]>([])
  const [projets, setProjets] = useState<string[]>([])
  const [saisies, setSaisies] = useState<Saisie[]>([])
  const [filtres, setFiltres] = useState({
    appartement: '',
    projet: '',
    dateDebut: '',
    dateFin: '',
  })

  const [montant, setMontant] = useState('')
  const [date, setDate] = useState('')
  const [categorie, setCategorie] = useState('')
  const [appartement, setAppartement] = useState('')
  const [projet, setProjet] = useState('')
  const [justificatif, setJustificatif] = useState('')

  const [erreurs, setErreurs] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [nonConnecte, setNonConnecte] = useState(false)
  // Ou afficher le message : sous le formulaire (saisie) ou au-dessus du
  // tableau (suppression). Avant, il etait toujours au-dessus du tableau,
  // hors de l'ecran apres un clic sur "Enregistrer la depense".
  const [zoneMessage, setZoneMessage] = useState<'formulaire' | 'liste'>('formulaire')

  // Cartes du haut : calculees sur les vraies depenses (avant : chiffres en dur)
  const anneeCourante = new Date().getFullYear()
  const depensesAnnee = saisies.filter(s => s.date?.startsWith(String(anneeCourante)))
  const totalAnnee = depensesAnnee.reduce((somme, s) => somme + Number(s.montant), 0)
  const derniere = [...saisies].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)[0]

  // KAN-12 : toute erreur 401 affiche le bandeau de connexion
  function gererErreur(erreur: unknown) {
    if (erreur instanceof SessionExpireeError) {
      setNonConnecte(true)
    } else {
      setErreurs([messageErreur(erreur)])
    }
  }

  // Message d'erreur commun aux réponses 401 / 403 / autres
  async function lireErreurs(reponse: Response) {
    if (reponse.status === 401) return ['Connectez-vous depuis le tableau de bord pour gérer les dépenses.']
    if (reponse.status === 403) return ['Action réservée à l’administrateur.']
    const data = await reponse.json().catch(() => ({}))
    return data.erreurs ?? [data.error ?? 'Erreur inattendue']
  }

  useEffect(() => {
    apiFetch('/api/saisies/options')
      .then(async res => {
        if (!res.ok) {
          setErreurs(await lireErreurs(res))
          return
        }
        const data = await res.json()
        setCategories(data.categories)
        setAppartements(data.appartements)
        setProjets(data.projets)
      })
      .catch(gererErreur)
  }, [])

  // KAN-34 : la liste est rechargée à chaque changement de filtre
  // (y compris au premier affichage)
  useEffect(() => {
    chargerSaisies(filtres)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rechargement uniquement quand les filtres changent
  }, [filtres])

  function chargerSaisies(filtresActifs = filtres) {
    const params = new URLSearchParams()
    if (filtresActifs.appartement) params.set('appartement', filtresActifs.appartement)
    if (filtresActifs.projet) params.set('projet', filtresActifs.projet)
    if (filtresActifs.dateDebut) params.set('dateDebut', filtresActifs.dateDebut)
    if (filtresActifs.dateFin) params.set('dateFin', filtresActifs.dateFin)

    const chemin = params.size > 0 ? `/api/saisies?${params.toString()}` : '/api/saisies'

    apiFetch(chemin)
      .then(async res => {
        if (!res.ok) {
          // ex. période inversée : le message s'affiche au-dessus du tableau
          setZoneMessage('liste')
          setErreurs(await lireErreurs(res))
          setSaisies([])
          return
        }
        setSaisies(await res.json())
      })
      .catch(gererErreur)
  }

  async function supprimerSaisie(s: Saisie) {
    if (!window.confirm(`Supprimer la dépense de ${formatChf(s.montant)} du ${formatDate(s.date)} ?`)) return
    setZoneMessage('liste')
    setErreurs([])
    setMessage('')

    let reponse: Response
    try {
      reponse = await apiFetch(`/api/saisies/${s.id}`, { method: 'DELETE' })
    } catch (erreur) {
      gererErreur(erreur)
      return
    }
    if (!reponse.ok) {
      setErreurs(await lireErreurs(reponse))
      return
    }

    setMessage('Dépense supprimée (conservée dans le journal des modifications)')
    chargerSaisies()
  }

  async function envoyerFormulaire(e: React.FormEvent) {
    e.preventDefault()
    setZoneMessage('formulaire')
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

    let reponse: Response
    try {
      reponse = await apiFetch('/api/saisies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ montant: montant.replace(',', '.'), date: `${annee}-${mois}-${jour}`, categorie, appartement, projet, justificatif }),
      })
    } catch (erreur) {
      gererErreur(erreur)
      return
    }

    if (!reponse.ok) {
      setErreurs(await lireErreurs(reponse))
      return
    }

    setMessage('Dépense enregistrée')
    setMontant('')
    setDate('')
    setCategorie('')
    setAppartement('')
    setProjet('')
    setJustificatif('')
    chargerSaisies(filtres)
  }

  return (
    <div className="flex min-h-screen bg-[#f5f7fb] font-sans text-slate-900">
      <MenuLateral />

      <main className="flex-1 overflow-auto p-8">
        <div className="mx-auto max-w-7xl">
          <header className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h1 className="text-[2rem] font-bold tracking-[-0.04em] text-slate-900">Saisie des dépenses</h1>
              <p className="mt-1 text-sm text-slate-500">Enregistrer une nouvelle dépense de la PPE</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium capitalize text-slate-700 shadow-sm">
                {dateDuJour()}
              </div>
            </div>
          </header>

          {nonConnecte && <BanniereConnexion />}

          <section className="mb-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Dépenses {anneeCourante}</span>
                <ArrowDownRight className="h-4 w-4 text-rose-500" />
              </div>
              <p className="mb-2 text-3xl font-bold text-slate-900">{formatChf(totalAnnee, false)}</p>
              <div className="flex items-center gap-2 text-xs">
                <span className="rounded bg-rose-100 px-2 py-0.5 font-medium text-rose-700">{depensesAnnee.length} dépense(s) cette année</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Dernière dépense</span>
                <Wallet className="h-4 w-4 text-blue-500" />
              </div>
              <p className="mb-2 text-3xl font-bold text-slate-900">{derniere ? formatChf(derniere.montant, false) : '—'}</p>
              <div className="flex items-center gap-2 text-xs">
                <span className="rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-700">{derniere ? `${formatDate(derniere.date)} · ${derniere.categorie ?? 'Sans catégorie'}` : 'Aucune dépense'}</span>
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

          {estAdmin ? (
          <section className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
            <form onSubmit={envoyerFormulaire} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Saisie manuelle</h2>
                  <p className="mt-1 text-sm text-slate-500">Renseignez les informations pour ajouter une dépense.</p>
                </div>
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

              {zoneMessage === 'formulaire' && (
                <div className="mt-4">
                  <Messages erreurs={erreurs} message={message} />
                </div>
              )}
            </form>

            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Résumé</h2>
                <ul className="mt-4 space-y-3 text-sm text-slate-600">
                  <li className="flex items-center justify-between border-b border-slate-100 pb-2"><span>Dernière saisie</span><span className="font-medium text-slate-900">{derniere ? formatDate(derniere.date) : '—'}</span></li>
                  <li className="flex items-center justify-between border-b border-slate-100 pb-2"><span>Appartements</span><span className="font-medium text-slate-900">{appartements.length}</span></li>
                  <li className="flex items-center justify-between"><span>Catégories</span><span className="font-medium text-slate-900">{categories.length}</span></li>
                </ul>
              </div>

            </div>
          </section>
          ) : utilisateur ? (
            <BandeauConsultation quoi="les dépenses enregistrées" />
          ) : null}

          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-slate-900">Dépenses enregistrées ({saisies.length})</h2>
            </div>

            <div className="mb-5 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-5">
              <label className="text-sm font-medium text-slate-700">
                Appartement
                <select
                  value={filtres.appartement}
                  onChange={e => setFiltres(prev => ({ ...prev, appartement: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-blue-500"
                >
                  <option value="">Tous</option>
                  {appartements.map(appartement => (
                    <option key={appartement} value={appartement}>{appartement}</option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium text-slate-700">
                Projet
                <select
                  value={filtres.projet}
                  onChange={e => setFiltres(prev => ({ ...prev, projet: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-blue-500"
                >
                  <option value="">Tous</option>
                  {projets.map(projet => (
                    <option key={projet} value={projet}>{projet}</option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium text-slate-700">
                Du
                <input
                  type="date"
                  value={filtres.dateDebut}
                  onChange={e => setFiltres(prev => ({ ...prev, dateDebut: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-blue-500"
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Au
                <input
                  type="date"
                  value={filtres.dateFin}
                  onChange={e => setFiltres(prev => ({ ...prev, dateFin: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-blue-500"
                />
              </label>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => setFiltres({ appartement: '', projet: '', dateDebut: '', dateFin: '' })}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  Réinitialiser
                </button>
              </div>
            </div>

            {zoneMessage === 'liste' && <Messages erreurs={erreurs} message={message} />}

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
                      <th className="px-3 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {saisies.map(s => (
                      <tr key={s.id} className="border-b border-slate-100">
                        <td className="px-3 py-3 text-slate-600">{formatDate(s.date)}</td>
                        <td className="px-3 py-3 text-slate-700">{s.categorie ?? '—'}</td>
                        <td className="px-3 py-3 text-slate-700">{s.appartement ?? '—'}</td>
                        <td className="px-3 py-3 text-slate-700">{s.projet ?? '—'}</td>
                        <td className="px-3 py-3 text-slate-700">{s.justificatif || '-'}</td>
                        <td className="px-3 py-3 text-right font-semibold tabular-nums text-slate-900">{formatChf(s.montant)}</td>
                        <td className="px-3 py-3 text-right">
                          {estAdmin && <button
                            type="button"
                            onClick={() => supprimerSaisie(s)}
                            aria-label="Supprimer la dépense"
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>}
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
