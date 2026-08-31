import express from 'express'

const app = express()

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  next()
})

app.use(express.json())

const depenses = [
  { annee: 2022, categorie: 'Entretien', montant: 12400 },
  { annee: 2022, categorie: 'Assurances', montant: 8700 },
  { annee: 2022, categorie: 'Nettoyage', montant: 5200 },
  { annee: 2022, categorie: 'Eau & Electricite', montant: 9800 },
  { annee: 2022, categorie: 'Administration', montant: 4100 },
  { annee: 2022, categorie: 'Reparations', montant: 6300 },

  { annee: 2023, categorie: 'Entretien', montant: 13100 },
  { annee: 2023, categorie: 'Assurances', montant: 9200 },
  { annee: 2023, categorie: 'Nettoyage', montant: 5400 },
  { annee: 2023, categorie: 'Eau & Electricite', montant: 10500 },
  { annee: 2023, categorie: 'Administration', montant: 4300 },
  { annee: 2023, categorie: 'Reparations', montant: 9800 },

  { annee: 2024, categorie: 'Entretien', montant: 14200 },
  { annee: 2024, categorie: 'Assurances', montant: 9200 },
  { annee: 2024, categorie: 'Nettoyage', montant: 5900 },
  { annee: 2024, categorie: 'Eau & Electricite', montant: 11300 },
  { annee: 2024, categorie: 'Administration', montant: 4600 },
  { annee: 2024, categorie: 'Reparations', montant: 7100 },

  { annee: 2025, categorie: 'Entretien', montant: 13800 },
  { annee: 2025, categorie: 'Assurances', montant: 9500 },
  { annee: 2025, categorie: 'Nettoyage', montant: 6100 },
  { annee: 2025, categorie: 'Eau & Electricite', montant: 10900 },
  { annee: 2025, categorie: 'Administration', montant: 4800 },
  { annee: 2025, categorie: 'Reparations', montant: 5400 },
]

app.get('/api/depenses/historique', (req, res) => {
  const anneeDebut = parseInt(req.query.anneeDebut) || 2022
  const anneeFin = parseInt(req.query.anneeFin) || 2025

  const resultat = depenses.filter(d => d.annee >= anneeDebut && d.annee <= anneeFin)

  res.json(resultat)
})

app.listen(3001, () => {
  console.log('Serveur démarré sur http://localhost:3001')
})
