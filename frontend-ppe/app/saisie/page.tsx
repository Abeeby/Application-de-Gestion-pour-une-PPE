'use client'

import { useState, useEffect } from 'react'

type Saisie = {
  id: number
  montant: number
  date: string
  categorie: string
  appartement: string
  justificatif: string
}

export default function Saisie() {
  const [categories, setCategories] = useState<string[]>([])
  const [appartements, setAppartements] = useState<string[]>([])
  const [saisies, setSaisies] = useState<Saisie[]>([])

  // Les champs du formulaire
  const [montant, setMontant] = useState('')
  const [date, setDate] = useState('')
  const [categorie, setCategorie] = useState('')
  const [appartement, setAppartement] = useState('')
  const [justificatif, setJustificatif] = useState('')

  const [erreurs, setErreurs] = useState<string[]>([])
  const [message, setMessage] = useState('')

  // Au chargement : on recupere les listes et les depenses deja saisies
  useEffect(() => {
    fetch('http://localhost:3001/api/saisies/options')
      .then(res => res.json())
      .then(data => {
        setCategories(data.categories)
        setAppartements(data.appartements)
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

    const reponse = await fetch('http://localhost:3001/api/saisies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ montant, date, categorie, appartement, justificatif }),
    })

    const data = await reponse.json()

    if (!reponse.ok) {
      setErreurs(data.erreurs)
      return
    }

    // Tout s'est bien passe : on vide le formulaire et on recharge la liste
    setMessage('Dépense enregistrée')
    setMontant('')
    setDate('')
    setCategorie('')
    setAppartement('')
    setJustificatif('')
    chargerSaisies()
  }

  const styleChamp = {
    width: '100%',
    padding: '8px',
    marginTop: '4px',
    border: '1px solid #cbd5e1',
    borderRadius: '4px',
    color: '#1e293b',
  }

  const styleLabel = {
    display: 'block',
    marginBottom: '12px',
    color: '#1e293b',
    fontWeight: 'bold' as const,
  }

  return (
    <div style={{ padding: '30px', fontFamily: 'Arial, sans-serif', backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
      <h1 style={{ color: '#1e293b' }}>Saisie des dépenses</h1>
      <p style={{ color: '#64748b' }}>Enregistrer une nouvelle dépense de la PPE</p>

      {/* Formulaire */}
      <form
        onSubmit={envoyerFormulaire}
        style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', maxWidth: '450px', border: '1px solid #e2e8f0' }}
      >
        <label style={styleLabel}>
          Montant (CHF)
          <input
            type="number"
            value={montant}
            onChange={e => setMontant(e.target.value)}
            style={styleChamp}
            placeholder="1500"
          />
        </label>

        <label style={styleLabel}>
          Date
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={styleChamp}
          />
        </label>

        <label style={styleLabel}>
          Catégorie
          <select value={categorie} onChange={e => setCategorie(e.target.value)} style={styleChamp}>
            <option value="">-- Choisir --</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>

        <label style={styleLabel}>
          Appartement concerné
          <select value={appartement} onChange={e => setAppartement(e.target.value)} style={styleChamp}>
            <option value="">-- Choisir --</option>
            {appartements.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </label>

        <label style={styleLabel}>
          Justificatif (numéro de facture)
          <input
            type="text"
            value={justificatif}
            onChange={e => setJustificatif(e.target.value)}
            style={styleChamp}
            placeholder="FAC-2026-001"
          />
        </label>

        <button
          type="submit"
          style={{
            backgroundColor: '#1e293b',
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          Enregistrer
        </button>
      </form>

      {/* Messages */}
      {erreurs.length > 0 && (
        <div style={{ marginTop: '15px', padding: '12px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '4px', maxWidth: '450px' }}>
          {erreurs.map(err => (
            <div key={err}>• {err}</div>
          ))}
        </div>
      )}

      {message && (
        <div style={{ marginTop: '15px', padding: '12px', backgroundColor: '#dcfce7', color: '#16a34a', borderRadius: '4px', maxWidth: '450px' }}>
          {message}
        </div>
      )}

      {/* Liste des depenses saisies */}
      <h2 style={{ color: '#1e293b', marginTop: '40px' }}>Dépenses enregistrées ({saisies.length})</h2>

      {saisies.length === 0 ? (
        <p style={{ color: '#64748b' }}>Aucune dépense saisie pour le moment.</p>
      ) : (
        <table border={1} cellPadding={10} style={{ borderCollapse: 'collapse', width: '100%', backgroundColor: 'white', borderColor: '#e2e8f0' }}>
          <thead style={{ backgroundColor: '#1e293b', color: 'white' }}>
            <tr>
              <th>Date</th>
              <th>Catégorie</th>
              <th>Appartement</th>
              <th>Justificatif</th>
              <th>Montant</th>
            </tr>
          </thead>
          <tbody style={{ color: '#1e293b' }}>
            {saisies.map(s => (
              <tr key={s.id}>
                <td>{s.date}</td>
                <td>{s.categorie}</td>
                <td>{s.appartement}</td>
                <td>{s.justificatif || '-'}</td>
                <td style={{ textAlign: 'right' }}>{s.montant} CHF</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
