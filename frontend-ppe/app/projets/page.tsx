'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

type Role = 'admin' | 'owner'

type Etape = {
  titre: string
  date?: string
  statut: 'Terminé' | 'En cours' | 'En attente' | 'Prévu'
}

type Projet = {
  id: string
  titre: string
  description: string
  budgetTotal: number
  depense: number
  soldeRestant: number
  depassement: number
  progression: number
  statut: 'Planifié' | 'En cours' | 'Terminé' | 'En attente' | 'Suspendu'
  dateDebut: string
  dateFin?: string
  responsable: string
  etapes?: Etape[]
}

type Droits = {
  role: string
  canRead: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  roleLabel: string
  estAdmin: boolean
  estCoproprietaire: boolean
}

export default function ProjetsPage() {
  const [role, setRole] = useState<Role>('admin')
  const [token, setToken] = useState<string>('')
  const [droits, setDroits] = useState<Droits | null>(null)
  const [statuts, setStatuts] = useState<string[]>([])
  const [projets, setProjets] = useState<Projet[]>([])
  const [projetSelectionne, setProjetSelectionne] = useState<Projet | null>(null)

  // Modale de création / édition
  const [modalOuverte, setModalOuverte] = useState(false)
  const [projetEnEdition, setProjetEnEdition] = useState<Projet | null>(null)

  // Champs du formulaire
  const [formTitre, setFormTitre] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formBudget, setFormBudget] = useState('')
  const [formDepense, setFormDepense] = useState('0')
  const [formProgression, setFormProgression] = useState('0')
  const [formStatut, setFormStatut] = useState('Planifié')
  const [formDateDebut, setFormDateDebut] = useState('')
  const [formDateFin, setFormDateFin] = useState('')
  const [formResponsable, setFormResponsable] = useState('')

  const [erreurs, setErreurs] = useState<string[]>([])
  const [messageSucces, setMessageSucces] = useState('')
  const [chargement, setChargement] = useState(false)

  const currency = new Intl.NumberFormat('fr-CH', {
    style: 'currency',
    currency: 'CHF',
    maximumFractionDigits: 0,
  })

  // Connexion automatique selon le rôle sélectionné
  const seConnecter = async (roleVoulu: Role) => {
    setChargement(true)
    setErreurs([])
    try {
      const email = roleVoulu === 'admin' ? 'admin@ppe.fr' : 'coproprietaire@ppe.fr'
      const resAuth = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role: roleVoulu }),
      })
      if (!resAuth.ok) {
        throw new Error('Impossible de se connecter')
      }
      const dataAuth = await resAuth.json()
      setToken(dataAuth.token)
      setRole(roleVoulu)
      await chargerDonnees(dataAuth.token)
    } catch (err: any) {
      setErreurs([err.message || 'Erreur lors de la connexion'])
    } finally {
      setChargement(false)
    }
  }

  // Chargement des projets et vérification des droits RBAC
  const chargerDonnees = async (authToken: string) => {
    try {
      const [resDroits, resProjets] = await Promise.all([
        fetch(`${API_URL}/api/projets/droits`, {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
        fetch(`${API_URL}/api/projets`, {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
      ])

      if (resDroits.ok) {
        const dataDroits = await resDroits.json()
        setDroits(dataDroits.droits)
        setStatuts(dataDroits.statuts || [])
      }

      if (resProjets.ok) {
        const dataProjets = await resProjets.json()
        setProjets(dataProjets)
        if (dataProjets.length > 0 && !projetSelectionne) {
          setProjetSelectionne(dataProjets[0])
        }
      }
    } catch (error) {
      console.error('Erreur chargement données', error)
    }
  }

  useEffect(() => {
    void seConnecter('admin')
  }, [])

  // Ouvrir la modale pour créer un projet
  const ouvrirCreation = () => {
    if (!droits?.canCreate) {
      alert('Action interdite : seuls les administrateurs peuvent créer un projet (KAN-37)')
      return
    }
    setProjetEnEdition(null)
    setFormTitre('')
    setFormDescription('')
    setFormBudget('')
    setFormDepense('0')
    setFormProgression('0')
    setFormStatut('Planifié')
    setFormDateDebut(new Date().toISOString().slice(0, 10))
    setFormDateFin('')
    setFormResponsable('')
    setErreurs([])
    setModalOuverte(true)
  }

  // Ouvrir la modale pour modifier un projet
  const ouvrirEdition = (p: Projet) => {
    if (!droits?.canEdit) {
      alert('Action interdite : seuls les administrateurs peuvent modifier un projet (KAN-37)')
      return
    }
    setProjetEnEdition(p)
    setFormTitre(p.titre)
    setFormDescription(p.description)
    setFormBudget(String(p.budgetTotal))
    setFormDepense(String(p.depense))
    setFormProgression(String(p.progression))
    setFormStatut(p.statut)
    setFormDateDebut(p.dateDebut)
    setFormDateFin(p.dateFin || '')
    setFormResponsable(p.responsable)
    setErreurs([])
    setModalOuverte(true)
  }

  // Soumission du formulaire (Création ou Modification)
  const soumettreFormulaire = async (e: React.FormEvent) => {
    e.preventDefault()
    setErreurs([])
    setMessageSucces('')

    const payload = {
      titre: formTitre,
      description: formDescription,
      budgetTotal: Number(formBudget),
      depense: Number(formDepense),
      progression: Number(formProgression),
      statut: formStatut,
      dateDebut: formDateDebut,
      dateFin: formDateFin || undefined,
      responsable: formResponsable,
    }

    try {
      const url = projetEnEdition
        ? `${API_URL}/api/projets/${projetEnEdition.id}`
        : `${API_URL}/api/projets`
      const method = projetEnEdition ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.erreurs && Array.isArray(data.erreurs)) {
          setErreurs(data.erreurs)
        } else if (data.error) {
          setErreurs([data.error])
        } else {
          setErreurs(['Une erreur est survenue lors de l enregistrement'])
        }
        return
      }

      setModalOuverte(false)
      setMessageSucces(
        projetEnEdition
          ? `Le projet "${payload.titre}" a été mis à jour avec succès.`
          : `Le projet "${payload.titre}" a été créé avec succès.`
      )
      await chargerDonnees(token)

      if (projetEnEdition) {
        setProjetSelectionne(data)
      }
    } catch (err: any) {
      setErreurs([err.message || 'Erreur réseau lors de la sauvegarde'])
    }
  }

  // Supprimer un projet
  const handleSupprimer = async (p: Projet) => {
    if (!droits?.canDelete) {
      alert('Action interdite : seuls les administrateurs peuvent supprimer un projet (KAN-37)')
      return
    }

    if (!confirm(`Confirmez-vous la suppression du projet "${p.titre}" ?`)) {
      return
    }

    try {
      const res = await fetch(`${API_URL}/api/projets/${p.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Erreur lors de la suppression')
      }
      setMessageSucces(`Le projet "${p.titre}" a été supprimé.`)
      if (projetSelectionne?.id === p.id) {
        setProjetSelectionne(null)
      }
      await chargerDonnees(token)
    } catch (err: any) {
      alert(err.message)
    }
  }

  const badgeStatut = (statut: string) => {
    switch (statut) {
      case 'En cours':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'Planifié':
        return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'Terminé':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      case 'Suspendu':
        return 'bg-rose-100 text-rose-800 border-rose-200'
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200'
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Barre de navigation supérieure */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              ← Tableau de bord
            </Link>
            <Link
              href="/saisie"
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              Saisie dépenses
            </Link>
            <Link
              href="/historique"
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              Historique
            </Link>
          </div>

          {/* Testeur de rôles (KAN-37 RBAC switcher) */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-slate-500">Tester le rôle :</span>
            <button
              type="button"
              onClick={() => seConnecter('admin')}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                role === 'admin'
                  ? 'bg-blue-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              👨‍💼 Administrateur
            </button>
            <button
              type="button"
              onClick={() => seConnecter('owner')}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                role === 'owner'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              🏠 Copropriétaire
            </button>
          </div>
        </div>

        {/* En-tête principal */}
        <header className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">PPE Les Terrasses</span>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-slate-500">KAN-8 Projets Spécifiques</span>
            </div>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">Projets PPE</h1>
            <p className="mt-1 text-sm text-slate-600">
              Suivi des travaux extraordinaires, budgets et planification
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {/* Badge Rôle KAN-37 */}
            <div
              className={`inline-flex items-center rounded-full px-3.5 py-1 text-xs font-semibold ring-1 ring-inset ${
                droits?.estAdmin
                  ? 'bg-blue-50 text-blue-700 ring-blue-600/20'
                  : 'bg-amber-50 text-amber-700 ring-amber-600/20'
              }`}
            >
              {droits?.estAdmin ? '✓ Administrateur (Droits complets)' : '👁 Copropriétaire (Lecture seule)'}
            </div>

            {/* Bouton Nouveau projet KAN-37 (conditionnel selon rôle) */}
            {droits?.canCreate ? (
              <button
                type="button"
                onClick={ouvrirCreation}
                className="inline-flex items-center rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
              >
                + Nouveau projet
              </button>
            ) : (
              <button
                type="button"
                disabled
                title="Action réservée aux administrateurs"
                className="inline-flex cursor-not-allowed items-center rounded-xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-400"
              >
                🔒 Nouveau projet (Admin)
              </button>
            )}
          </div>
        </header>

        {/* Message informatif de droits RBAC (KAN-37) */}
        {droits?.estCoproprietaire && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900 shadow-sm">
            <div className="flex items-center space-x-2">
              <span className="text-lg">ℹ️</span>
              <p>
                <strong>Mode consultation (Copropriétaire) :</strong> Vous pouvez consulter la liste et l avancement
                détaillé des projets extraordinaires. La création, modification et suppression de projets sont réservées
                à l administrateur de la PPE (règles de gestion des droits KAN-37).
              </p>
            </div>
          </div>
        )}

        {messageSucces && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-sm">
            ✓ {messageSucces}
          </div>
        )}

        {/* Grille des projets (Maquette Figma Page 6) */}
        <section className="grid gap-6 md:grid-cols-3">
          {projets.map((p) => {
            const estSelectionne = projetSelectionne?.id === p.id
            return (
              <div
                key={p.id}
                onClick={() => setProjetSelectionne(p)}
                className={`cursor-pointer rounded-2xl bg-white p-5 shadow-sm ring-1 transition hover:shadow-md ${
                  estSelectionne ? 'ring-2 ring-blue-600' : 'ring-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-slate-900">{p.titre}</h3>
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badgeStatut(p.statut)}`}>
                    {p.statut}
                  </span>
                </div>

                <p className="mt-2 line-clamp-2 text-xs text-slate-600">{p.description || 'Aucune description'}</p>

                {/* Barre de progression */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs font-medium text-slate-600">
                    <span>Progression</span>
                    <span>{p.progression}%</span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, p.progression))}%` }}
                    />
                  </div>
                </div>

                {/* Budgets */}
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                  <div>
                    <p className="text-slate-400">Budget total</p>
                    <p className="font-semibold text-slate-800">{currency.format(p.budgetTotal)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-400">Dépensé</p>
                    <p className="font-semibold text-slate-800">{currency.format(p.depense)}</p>
                  </div>
                </div>

                {/* Actions RBAC (KAN-37) */}
                <div className="mt-4 flex items-center justify-end space-x-2 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setProjetSelectionne(p)
                    }}
                    className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Détails
                  </button>

                  {droits?.canEdit && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        ouvrirEdition(p)
                      }}
                      className="rounded-lg px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                    >
                      Modifier
                    </button>
                  )}

                  {droits?.canDelete && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSupprimer(p)
                      }}
                      className="rounded-lg px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
                    >
                      Supprimer
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </section>

        {/* Détail du projet sélectionné (Maquette Figma Page 7) */}
        {projetSelectionne && (
          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs text-slate-500">Projets • PPE Les Terrasses, Lausanne</p>
                <div className="mt-1 flex items-center space-x-3">
                  <h2 className="text-2xl font-bold text-slate-900">{projetSelectionne.titre}</h2>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badgeStatut(
                      projetSelectionne.statut
                    )}`}
                  >
                    {projetSelectionne.statut}
                  </span>
                </div>
              </div>

              {/* Actions d'administration KAN-37 */}
              {droits?.estAdmin && (
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handleSupprimer(projetSelectionne)}
                    className="rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                  >
                    Supprimer
                  </button>
                  <button
                    type="button"
                    onClick={() => ouvrirEdition(projetSelectionne)}
                    className="rounded-xl bg-blue-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-800"
                  >
                    Modifier le projet
                  </button>
                </div>
              )}
            </div>

            {/* Description & Infos Générales */}
            <div className="mt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Informations générales</h4>
              <p className="mt-1 text-sm text-slate-700">
                {projetSelectionne.description || 'Aucune information générale enregistrée.'}
              </p>
            </div>

            {/* KPIs du projet */}
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Budget Total</p>
                <p className="mt-1 text-lg font-bold text-slate-900">
                  {currency.format(projetSelectionne.budgetTotal)}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Déjà Dépensé</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{currency.format(projetSelectionne.depense)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Solde Restant</p>
                <p className="mt-1 text-lg font-bold text-emerald-600">
                  {currency.format(projetSelectionne.soldeRestant)}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Progression globale</p>
                <p className="mt-1 text-lg font-bold text-blue-600">{projetSelectionne.progression}%</p>
              </div>
            </div>

            {/* Méta-données : Dates et Responsable */}
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3 text-xs text-slate-600 border-t border-slate-100 pt-4">
              <div>
                <span className="font-semibold text-slate-800">Date de début :</span> {projetSelectionne.dateDebut}
              </div>
              <div>
                <span className="font-semibold text-slate-800">Fin estimée :</span>{' '}
                {projetSelectionne.dateFin || 'Non définie'}
              </div>
              <div>
                <span className="font-semibold text-slate-800">Responsable :</span> {projetSelectionne.responsable}
              </div>
            </div>

            {/* Avancement du projet / Étapes */}
            <div className="mt-8">
              <h4 className="text-sm font-bold text-slate-900">Avancement du projet</h4>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {projetSelectionne.etapes && projetSelectionne.etapes.length > 0 ? (
                  projetSelectionne.etapes.map((etape, idx) => (
                    <div key={idx} className="rounded-xl border border-slate-200 p-3 bg-slate-50/50">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-800">{etape.titre}</span>
                        <span className={`text-[10px] font-bold uppercase ${badgeStatut(etape.statut)}`}>
                          {etape.statut}
                        </span>
                      </div>
                      {etape.date && <p className="mt-1 text-[11px] text-slate-500">{etape.date}</p>}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 col-span-3">Aucune étape spécifique détaillée.</p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Modale de Création / Modification de projet (KAN-37 & KAN-38) */}
        {modalOuverte && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-lg font-bold text-slate-900">
                  {projetEnEdition ? 'Modifier le projet' : 'Créer un nouveau projet'}
                </h3>
                <button
                  type="button"
                  onClick={() => setModalOuverte(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              {/* Erreurs de validation (KAN-38) */}
              {erreurs.length > 0 && (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                  <p className="font-semibold">Erreurs de validation :</p>
                  <ul className="mt-1 list-inside list-disc space-y-0.5">
                    {erreurs.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <form onSubmit={soumettreFormulaire} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Titre du projet *</label>
                  <input
                    type="text"
                    required
                    value={formTitre}
                    onChange={(e) => setFormTitre(e.target.value)}
                    placeholder="Ex: Rénovation de la façade"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Description générale</label>
                  <textarea
                    rows={3}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Ex: Nettoyage haute pression, isolation et peinture..."
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Budget total (CHF) *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={formBudget}
                      onChange={(e) => setFormBudget(e.target.value)}
                      placeholder="85000"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Montant dépensé (CHF)</label>
                    <input
                      type="number"
                      min={0}
                      value={formDepense}
                      onChange={(e) => setFormDepense(e.target.value)}
                      placeholder="0"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Progression (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={formProgression}
                      onChange={(e) => setFormProgression(e.target.value)}
                      placeholder="0"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Statut *</label>
                    <select
                      value={formStatut}
                      onChange={(e) => setFormStatut(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                    >
                      {statuts.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Date de début *</label>
                    <input
                      type="date"
                      required
                      value={formDateDebut}
                      onChange={(e) => setFormDateDebut(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Fin estimée</label>
                    <input
                      type="date"
                      value={formDateFin}
                      onChange={(e) => setFormDateFin(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Responsable / Régie *</label>
                  <input
                    type="text"
                    required
                    value={formResponsable}
                    onChange={(e) => setFormResponsable(e.target.value)}
                    placeholder="Ex: Régie Naef Lausanne SA"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center justify-end space-x-3 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setModalOuverte(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-800"
                  >
                    {projetEnEdition ? 'Enregistrer les modifications' : 'Créer le projet'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
