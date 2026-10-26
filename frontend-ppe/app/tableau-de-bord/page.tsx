'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { calculerTotaux, depensesParCategorie, evolutionMensuelle, filtrerTransactions } from './calculs'
import type { Transaction, Filtres } from './calculs'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
const filtresVides: Filtres = { annee: '', categorie: '', appartement: '', projet: '' }
const bloc = { padding: 20, borderRadius: 12, backgroundColor: 'white', border: '1px solid #e2e8f0' }
const grille = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }
const champ = { display: 'block', width: '100%', padding: 8, marginTop: 6, border: '1px solid #cbd5e1', borderRadius: 6 }

function montantChf(montant: number) {
  return `${montant.toFixed(2)} CHF`
}

export default function TableauDeBord() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [appartements, setAppartements] = useState<string[]>([])
  const [projets, setProjets] = useState<string[]>([])
  const [filtres, setFiltres] = useState<Filtres>(filtresVides)
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  const [connexionRequise, setConnexionRequise] = useState(false)
  const [actualisation, setActualisation] = useState(0)

  useEffect(() => {
    const controleur = new AbortController()
    async function charger() {
      setChargement(true)
      setErreur('')
      setConnexionRequise(false)
      try {
        const token = localStorage.getItem('ppe_token')
        if (!token) {
          setConnexionRequise(true)
          return
        }
        const session = await fetch(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }, signal: controleur.signal,
        })
        if (session.status === 401 || session.status === 403) {
          setConnexionRequise(true)
          return
        }
        if (!session.ok) throw new Error('Impossible de vérifier la connexion. Vérifie le backend et la base de données.')

        const urls = ['/api/saisies', '/api/revenus', '/api/saisies/options', '/api/revenus/options']
        const reponses = await Promise.all(urls.map(url => fetch(`${API_URL}${url}`, {
          headers: { Authorization: `Bearer ${token}` }, signal: controleur.signal,
        })))
        if (reponses.some(reponse => !reponse.ok)) {
          throw new Error('Impossible de charger les données. Vérifie le backend et la connexion à MySQL.')
        }
        const [depenses, revenus, optionsDepenses, optionsRevenus] = await Promise.all(reponses.map(reponse => reponse.json()))
        const lignes: Transaction[] = []
        for (const depense of depenses) lignes.push({ ...depense, type: 'depense' })
        for (const revenu of revenus) lignes.push({ ...revenu, type: 'revenu' })
        lignes.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
        const toutesCategories: string[] = [...optionsDepenses.categories, ...optionsRevenus.categories]
        const tousAppartements: string[] = [...optionsDepenses.appartements, ...optionsRevenus.appartements]
        const tousProjets: string[] = [...optionsDepenses.projets]
        for (const ligne of lignes) {
          if (ligne.categorie) toutesCategories.push(ligne.categorie)
          if (ligne.appartement) tousAppartements.push(ligne.appartement)
          if (ligne.projet) tousProjets.push(ligne.projet)
        }
        if (controleur.signal.aborted) return
        setTransactions(lignes)
        setCategories([...new Set(toutesCategories)].sort())
        setAppartements([...new Set(tousAppartements)].sort())
        setProjets([...new Set(tousProjets)].sort())
      } catch (e) {
        if (!controleur.signal.aborted) setErreur(e instanceof Error ? e.message : 'Erreur de chargement')
      } finally {
        if (!controleur.signal.aborted) setChargement(false)
      }
    }
    void charger()
    return () => controleur.abort()
  }, [actualisation])

  const annees = [...new Set(transactions.map(transaction => transaction.date.slice(0, 4)))].sort().reverse()
  const lignes = filtrerTransactions(transactions, filtres)
  const totaux = calculerTotaux(lignes)
  const parCategorie = depensesParCategorie(lignes)
  const parMois = evolutionMensuelle(lignes)

  return (
    <main style={{ padding: 24, maxWidth: 1400, margin: 'auto' }}>
      <Link href="/">← Tableau de bord principal</Link>
      <h1 style={{ fontSize: 28, marginTop: 20 }}>Explorer les finances de la PPE</h1>
      <p style={{ marginBottom: 24 }}>Combine les filtres pour consulter les revenus et les dépenses qui t’intéressent.</p>

      {chargement ? <p role="status">Chargement des données…</p> : connexionRequise ? (
        <section style={bloc}><p>Connecte-toi pour consulter le tableau de bord.</p><Link href="/">Se connecter</Link></section>
      ) : erreur ? (
        <section style={bloc}><p role="alert" style={{ color: '#b91c1c' }}>{erreur}</p><button onClick={() => setActualisation(actualisation + 1)}>Réessayer</button></section>
      ) : (
        <>
          <section style={bloc} aria-label="Filtres financiers">
            <div style={grille}>
              <label>Année<select style={champ} value={filtres.annee} onChange={e => setFiltres({ ...filtres, annee: e.target.value })}><option value="">Toutes les années</option>{annees.map(annee => <option key={annee}>{annee}</option>)}</select></label>
              <label>Catégorie<select style={champ} value={filtres.categorie} onChange={e => setFiltres({ ...filtres, categorie: e.target.value })}><option value="">Toutes les catégories</option>{categories.map(categorie => <option key={categorie}>{categorie}</option>)}</select></label>
              <label>Appartement<select style={champ} value={filtres.appartement} onChange={e => setFiltres({ ...filtres, appartement: e.target.value })}><option value="">Tous les appartements</option>{appartements.map(appartement => <option key={appartement}>{appartement}</option>)}</select></label>
              <label>Projet<select style={champ} value={filtres.projet} onChange={e => setFiltres({ ...filtres, projet: e.target.value })}><option value="">Tous les projets</option>{projets.map(projet => <option key={projet}>{projet}</option>)}</select></label>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 16 }}>
              <button onClick={() => setFiltres(filtresVides)}>Réinitialiser les filtres</button>
              <button onClick={() => setActualisation(actualisation + 1)}>Actualiser les données</button>
            </div>
            {filtres.projet && <p style={{ marginTop: 12 }}>Seules les dépenses rattachées à ce projet sont affichées. Les revenus ne sont pas rattachés à un projet.</p>}
          </section>

          <section style={{ ...grille, marginTop: 20 }} aria-label="Chiffres clés">
            <div style={bloc}><h2>Total des revenus</h2><p style={{ fontSize: 24, color: '#15803d' }}>{montantChf(totaux.revenus)}</p></div>
            <div style={bloc}><h2>Total des dépenses</h2><p style={{ fontSize: 24, color: '#b91c1c' }}>{montantChf(totaux.depenses)}</p></div>
            <div style={bloc}><h2>Solde des lignes filtrées</h2><p style={{ fontSize: 24 }}>{montantChf(totaux.solde)}</p></div>
          </section>

          <p role="status" style={{ margin: '20px 0' }}>{lignes.length} transaction(s) correspondent aux filtres.</p>
          {lignes.length === 0 ? <section style={bloc}>Aucune transaction ne correspond à cette combinaison. Essaie d’autres filtres.</section> : (
            <>
              <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: 20 }}>
                <div style={bloc}>
                  <h2>Dépenses par catégorie (CHF)</h2>
                  {parCategorie.length === 0 ? <p>Aucune dépense pour ces filtres.</p> : (
                    <div style={{ height: 320, marginTop: 16 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={parCategorie} margin={{ bottom: 45 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="categorie" interval={0} angle={-25} textAnchor="end" height={70} tick={{ fontSize: 11 }} /><YAxis /><Tooltip /><Bar dataKey="montant" name="Dépenses (CHF)" fill="#2563eb" /></BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
                <div style={bloc}>
                  <h2>Évolution mensuelle (CHF)</h2>
                  <div style={{ height: 320, marginTop: 16 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={parMois}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="mois" /><YAxis /><Tooltip /><Legend /><Bar dataKey="revenus" name="Revenus (CHF)" fill="#16a34a" /><Bar dataKey="depenses" name="Dépenses (CHF)" fill="#dc2626" /></BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </section>
              <section style={{ ...bloc, marginTop: 20 }}>
                <h2>Transactions filtrées</h2>
                <div style={{ overflowX: 'auto', marginTop: 16 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 700 }}>
                    <caption style={{ textAlign: 'left', marginBottom: 12 }}>Les montants et graphiques ci-dessus sont calculés à partir de ces lignes.</caption>
                    <thead><tr>{['Date', 'Type', 'Catégorie', 'Appartement', 'Projet', 'Montant (CHF)'].map(titre => <th key={titre} style={{ padding: 10, borderBottom: '2px solid #cbd5e1' }}>{titre}</th>)}</tr></thead>
                    <tbody>{lignes.map(ligne => <tr key={`${ligne.type}-${ligne.id}`}>
                      <td style={{ padding: 10 }}>{ligne.date.split('-').reverse().join('/')}</td>
                      <td>{ligne.type === 'depense' ? 'Dépense' : 'Revenu'}</td>
                      <td>{ligne.categorie || 'Sans catégorie'}</td><td>{ligne.appartement || 'Non rattaché'}</td><td>{ligne.projet || 'Non rattaché'}</td>
                      <td style={{ textAlign: 'right', padding: 10 }}>{montantChf(ligne.montant)}</td>
                    </tr>)}</tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </>
      )}
    </main>
  )
}
