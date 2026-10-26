'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import styles from './rapports.module.css'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
const mois = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

type Categorie = {
  categorie: string
  budgetAnnuel: number | null
  revenusPeriode: number
  depensesPeriode: number
  depensesCumulees: number
  restantAnnuel: number | null
  tauxUtilisation: number | null
}

type Transaction = {
  id: number
  date: string
  type: string
  montant: number
  description: string
  categorie: string | null
  appartement: string | null
  projet: string | null
  facture: string | null
}

type Rapport = {
  ppe: { nom: string; adresse: string }
  periode: { libelle: string; dateDebut: string; dateFin: string }
  genereLe: string
  budget: { montant: number; statut: string } | null
  resume: { revenus: number; depenses: number; solde: number; depensesCumulees: number; totalLignesBudget: number; restantEnveloppe: number | null; nombreTransactions: number }
  categories: Categorie[]
  transactions: Transaction[]
}

function montantChf(montant: number | null) {
  return montant === null ? 'Non défini' : `${montant.toFixed(2)} CHF`
}

function dateFr(date: string) { return date.split('-').reverse().join('/') }

export default function RapportsPage() {
  const [type, setType] = useState('annuel')
  const [annee, setAnnee] = useState(String(new Date().getFullYear()))
  const [moisChoisi, setMoisChoisi] = useState(String(new Date().getMonth() + 1))
  const [trimestre, setTrimestre] = useState(String(Math.floor(new Date().getMonth() / 3) + 1))
  const [rapport, setRapport] = useState<Rapport | null>(null)
  const [parametresRapport, setParametresRapport] = useState('')
  const [erreur, setErreur] = useState('')
  const [messageExport, setMessageExport] = useState('')
  const [chargement, setChargement] = useState(false)
  const [exportEnCours, setExportEnCours] = useState(false)
  const [estAdmin, setEstAdmin] = useState(false)
  const [verification, setVerification] = useState(true)

  useEffect(() => {
    const controleur = new AbortController()
    async function verifier() {
      try {
        const token = localStorage.getItem('ppe_token')
        if (!token) { setErreur('Connecte-toi depuis le tableau de bord pour accéder aux rapports.'); return }
        const reponse = await fetch(`${API_URL}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` }, signal: controleur.signal })
        if (reponse.status === 401) { setErreur('Session expirée : reconnecte-toi.'); return }
        if (!reponse.ok) throw new Error('Impossible de vérifier la connexion')
        const data = await reponse.json()
        if (data.user.role !== 'admin') { setErreur('Les rapports sont réservés à l’administrateur.'); return }
        if (!controleur.signal.aborted) setEstAdmin(true)
      } catch (e) {
        if (!controleur.signal.aborted) setErreur(e instanceof Error ? e.message : 'Le backend est indisponible')
      } finally {
        if (!controleur.signal.aborted) setVerification(false)
      }
    }
    void verifier()
    return () => controleur.abort()
  }, [])

  function parametresSelection() {
    const parametres = new URLSearchParams({ type, annee })
    if (type === 'mensuel') parametres.set('valeur', moisChoisi)
    if (type === 'trimestriel') parametres.set('valeur', trimestre)
    return parametres.toString()
  }

  async function generer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setChargement(true)
    setErreur('')
    setMessageExport('')
    setRapport(null)
    const parametres = parametresSelection()
    try {
      const reponse = await fetch(`${API_URL}/api/rapports?${parametres}`, { headers: { Authorization: `Bearer ${localStorage.getItem('ppe_token')}` } })
      if (reponse.status === 404) throw new Error('Redémarre le backend pour charger les nouvelles routes de rapports.')
      const data = await reponse.json()
      if (!reponse.ok) throw new Error(data.error || 'Impossible de générer le rapport')
      setRapport(data)
      setParametresRapport(parametres)
    } catch (e) { setErreur(e instanceof Error ? e.message : 'Le backend est indisponible') }
    finally { setChargement(false) }
  }

  async function exporter(contenu: string) {
    setExportEnCours(true)
    setErreur('')
    setMessageExport('')
    try {
      // Le serveur relit la même période pour exporter toutes ses données.
      const reponse = await fetch(`${API_URL}/api/rapports/export?${parametresRapport}&contenu=${contenu}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('ppe_token')}` },
      })
      if (!reponse.ok) {
        const data = await reponse.json()
        throw new Error(data.error || 'Impossible d’exporter les données')
      }
      const fichier = await reponse.blob()
      const url = URL.createObjectURL(fichier)
      const lien = document.createElement('a')
      lien.href = url
      lien.download = `ppe-${contenu}-${rapport?.periode.dateDebut}-${rapport?.periode.dateFin}.csv`
      document.body.appendChild(lien)
      lien.click()
      lien.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      setMessageExport('Fichier CSV téléchargé. Il contient les données actuelles de la période du rapport.')
    } catch (e) { setErreur(e instanceof Error ? e.message : 'Le backend est indisponible') }
    finally { setExportEnCours(false) }
  }

  const selectionModifiee = rapport !== null && parametresSelection() !== parametresRapport

  return (
    <main className={styles.page}>
      <Link href="/" className={styles.sansImpression}>← Tableau de bord principal</Link>
      <h1 style={{ fontSize: 28, marginTop: 20 }}>Rapports de suivi budgétaire</h1>
      <p>Produire un rapport périodique et exporter les données pour la comptabilité.</p>
      {verification && <p role="status">Vérification de la connexion…</p>}
      {erreur && <p role="alert" className={styles.erreur}>{erreur}</p>}
      {estAdmin && <>
        <form onSubmit={generer} className={`${styles.bloc} ${styles.sansImpression}`}>
          <div className={styles.grille}>
            <label>Période<select className={styles.champ} value={type} onChange={e => setType(e.target.value)}><option value="annuel">Annuelle</option><option value="trimestriel">Trimestrielle</option><option value="mensuel">Mensuelle</option></select></label>
            <label>Année<input className={styles.champ} type="number" min="1900" max="9999" required value={annee} onChange={e => setAnnee(e.target.value)} /></label>
            {type === 'mensuel' && <label>Mois<select className={styles.champ} value={moisChoisi} onChange={e => setMoisChoisi(e.target.value)}>{mois.map((nom, i) => <option key={nom} value={i + 1}>{nom}</option>)}</select></label>}
            {type === 'trimestriel' && <label>Trimestre<select className={styles.champ} value={trimestre} onChange={e => setTrimestre(e.target.value)}>{[1, 2, 3, 4].map(t => <option key={t} value={t}>Trimestre {t}</option>)}</select></label>}
          </div>
          <button className={styles.bouton} style={{ marginTop: 16 }} disabled={chargement || exportEnCours}>{chargement ? 'Génération…' : 'Générer le rapport'}</button>
          {selectionModifiee && <p role="status" className={styles.attention}>La période a changé : génère un nouveau rapport. Le rapport affiché et ses exports concernent toujours la période précédente.</p>}
        </form>
        {rapport && <>
          <section className={styles.bloc}>
            <h2 style={{ fontSize: 22 }}>{rapport.ppe.nom} — {rapport.periode.libelle}</h2>
            <p>{rapport.ppe.adresse}</p>
            <p>Du {dateFr(rapport.periode.dateDebut)} au {dateFr(rapport.periode.dateFin)}</p>
            <p>Généré le {new Date(rapport.genereLe).toLocaleString('fr-CH')}</p>
            <div className={`${styles.actions} ${styles.sansImpression}`}>
              <button className={styles.bouton} disabled={exportEnCours || chargement} onClick={() => exporter('transactions')}>Exporter les transactions CSV</button>
              <button className={styles.bouton} disabled={exportEnCours || chargement} onClick={() => exporter('synthese')}>Exporter la synthèse CSV</button>
              <button className={styles.bouton} onClick={() => window.print()}>Imprimer le rapport</button>
            </div>
            {messageExport && <p role="status" className={styles.sansImpression}>{messageExport}</p>}
          </section>
          <section className={`${styles.bloc} ${styles.grille}`} aria-label="Résumé financier">
            <div><h2>Revenus de la période</h2><p className={styles.montant}>{montantChf(rapport.resume.revenus)}</p></div>
            <div><h2>Dépenses de la période</h2><p className={styles.montant}>{montantChf(rapport.resume.depenses)}</p></div>
            <div><h2>Solde de la période</h2><p className={styles.montant}>{montantChf(rapport.resume.solde)}</p></div>
          </section>
          <section className={styles.bloc}>
            <h2 style={{ fontSize: 20 }}>Suivi du budget annuel</h2>
            <p>Le budget reste annuel. Les dépenses cumulées vont du 1er janvier à la fin de la période choisie.</p>
            {rapport.budget ? <>
              <p>Enveloppe annuelle : <strong>{montantChf(rapport.budget.montant)}</strong> — statut : {rapport.budget.statut}</p>
              <p>Total ventilé par catégorie : {montantChf(rapport.resume.totalLignesBudget)}</p>
              <p>Dépenses cumulées : {montantChf(rapport.resume.depensesCumulees)} — restant sur l’enveloppe : {montantChf(rapport.resume.restantEnveloppe)}</p>
              {rapport.budget.statut !== 'approuve' && <p className={styles.attention}>Ce budget n’est pas approuvé.</p>}
              {rapport.resume.restantEnveloppe !== null && rapport.resume.restantEnveloppe < 0 && <p className={styles.attention}>Les dépenses cumulées dépassent l’enveloppe annuelle.</p>}
            </> : <p className={styles.attention}>Aucun budget enregistré pour cette année. Les transactions sont consultables, mais aucun restant budgétaire ne peut être calculé.</p>}
            {rapport.categories.length === 0 ? <p>Aucune catégorie à afficher.</p> : <div className={styles.defilement}>
              <table className={styles.tableau}>
                <thead><tr><th>Catégorie</th><th>Budget annuel CHF</th><th>Revenus période CHF</th><th>Dépenses période CHF</th><th>Cumul dépenses CHF</th><th>Restant annuel CHF</th><th>Utilisé</th></tr></thead>
                <tbody>{rapport.categories.map((ligne, i) => <tr key={i}>
                  <td>{ligne.categorie}</td><td className={styles.nombre}>{montantChf(ligne.budgetAnnuel)}</td><td className={styles.nombre}>{montantChf(ligne.revenusPeriode)}</td><td className={styles.nombre}>{montantChf(ligne.depensesPeriode)}</td><td className={styles.nombre}>{montantChf(ligne.depensesCumulees)}</td>
                  <td className={styles.nombre} style={{ color: ligne.restantAnnuel !== null && ligne.restantAnnuel < 0 ? '#b91c1c' : undefined }}>{montantChf(ligne.restantAnnuel)}</td><td>{ligne.tauxUtilisation === null ? '—' : `${ligne.tauxUtilisation}%`}</td>
                </tr>)}</tbody>
              </table>
            </div>}
          </section>
          <section className={styles.bloc}>
            <h2 style={{ fontSize: 20 }}>Transactions de la période ({rapport.resume.nombreTransactions})</h2>
            {rapport.transactions.length === 0 ? <p>Aucune transaction pour cette période.</p> : <div className={styles.defilement}>
              <table className={styles.tableau}>
                <thead><tr><th>Date</th><th>Type</th><th>Catégorie</th><th>Description</th><th>Appartement</th><th>Projet</th><th>Facture</th><th>Montant CHF</th></tr></thead>
                <tbody>{rapport.transactions.map(ligne => <tr key={ligne.id}><td>{dateFr(ligne.date)}</td><td>{ligne.type === 'depense' ? 'Dépense' : 'Revenu'}</td><td>{ligne.categorie || 'Sans catégorie'}</td><td>{ligne.description}</td><td>{ligne.appartement || '—'}</td><td>{ligne.projet || '—'}</td><td>{ligne.facture || '—'}</td><td className={styles.nombre}>{montantChf(ligne.montant)}</td></tr>)}</tbody>
              </table>
            </div>}
          </section>
        </>}
      </>}
    </main>
  )
}
