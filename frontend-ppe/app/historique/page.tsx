'use client'

import { useState, useEffect } from 'react'

const categories = ['Entretien', 'Assurances', 'Nettoyage', 'Eau & Electricite', 'Administration', 'Reparations']
const anneesPossibles = [2022, 2023, 2024, 2025]

export default function Historique() {
  const [depenses, setDepenses] = useState([])
  const [anneeDebut, setAnneeDebut] = useState(2022)
  const [anneeFin, setAnneeFin] = useState(2025)

  useEffect(() => {
    fetch(`http://localhost:3001/api/depenses/historique?anneeDebut=${anneeDebut}&anneeFin=${anneeFin}`)
      .then(res => res.json())
      .then(data => setDepenses(data))
  }, [anneeDebut, anneeFin])

  const annees = anneesPossibles.filter(a => a >= anneeDebut && a <= anneeFin)

  function getMontant(categorie, annee) {
    const ligne = depenses.find(d => d.categorie === categorie && d.annee === annee)
    return ligne ? ligne.montant : 0
  }

  function getTotal(annee) {
    let total = 0
    for (const cat of categories) {
      total += getMontant(cat, annee)
    }
    return total
  }

  function calculerEcart(montantAvant, montantApres) {
    if (montantAvant === 0) return 0
    return (((montantApres - montantAvant) / montantAvant) * 100).toFixed(1)
  }

  return (
    <div style={{ padding: '30px', fontFamily: 'Arial, sans-serif', backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
      <h1 style={{ color: '#1e293b' }}>Historique des dépenses par catégorie</h1>
      <p style={{ color: '#64748b' }}>Comparez les exercices annuels et repérez les écarts</p>

      {/* Filtres */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '20px', alignItems: 'center' }}>
        <div>
          <label style={{ color: '#1e293b', fontWeight: 'bold', marginRight: '6px' }}>Année début :</label>
          <select value={anneeDebut} onChange={e => setAnneeDebut(Number(e.target.value))} style={{ color: '#1e293b', padding: '4px 8px' }}>
            {anneesPossibles.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ color: '#1e293b', fontWeight: 'bold', marginRight: '6px' }}>Année fin :</label>
          <select value={anneeFin} onChange={e => setAnneeFin(Number(e.target.value))} style={{ color: '#1e293b', padding: '4px 8px' }}>
            {anneesPossibles.filter(a => a >= anneeDebut).map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tableau */}
      <table border={1} cellPadding={10} style={{ borderCollapse: 'collapse', width: '100%', backgroundColor: 'white', borderColor: '#e2e8f0' }}>
        <thead style={{ backgroundColor: '#1e293b', color: 'white' }}>
          <tr>
            <th>Catégorie</th>
            {annees.map((annee, i) => (
              <>
                <th key={annee}>{annee}</th>
                {i > 0 && <th key={'ecart-' + annee}>Écart {annees[i-1]}→{annee}</th>}
              </>
            ))}
          </tr>
        </thead>
        <tbody style={{ color: '#1e293b' }}>
          {categories.map(cat => (
            <tr key={cat}>
              <td>{cat}</td>
              {annees.map((annee, i) => {
                const montant = getMontant(cat, annee)
                const montantPrev = i > 0 ? getMontant(cat, annees[i - 1]) : null
                const ecart = montantPrev !== null ? calculerEcart(montantPrev, montant) : null
                return (
                  <>
                    <td key={annee} style={{ textAlign: 'right' }}>{montant} CHF</td>
                    {i > 0 && (
                      <td key={'ecart-' + annee} style={{ textAlign: 'right', color: ecart > 0 ? '#dc2626' : '#16a34a', fontWeight: 'bold' }}>
                        {ecart > 0 ? '+' : ''}{ecart}%
                      </td>
                    )}
                  </>
                )
              })}
            </tr>
          ))}

          {/* Total */}
          <tr style={{ fontWeight: 'bold', backgroundColor: '#e2e8f0', color: '#1e293b' }}>
            <td>Total</td>
            {annees.map((annee, i) => {
              const total = getTotal(annee)
              const totalPrev = i > 0 ? getTotal(annees[i - 1]) : null
              const ecart = totalPrev !== null ? calculerEcart(totalPrev, total) : null
              return (
                <>
                  <td key={annee} style={{ textAlign: 'right' }}>{total} CHF</td>
                  {i > 0 && (
                    <td key={'ecart-total-' + annee} style={{ textAlign: 'right', color: ecart > 0 ? '#dc2626' : '#16a34a' }}>
                      {ecart > 0 ? '+' : ''}{ecart}%
                    </td>
                  )}
                </>
              )
            })}
          </tr>
        </tbody>
      </table>
    </div>
  )
}
