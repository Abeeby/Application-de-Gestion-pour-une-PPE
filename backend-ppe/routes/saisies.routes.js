// --- KAN-19 : module de saisie des depenses ---
import { Router } from 'express'
import { saisies, appartements, categories, validerDepense, ajouterSaisie } from '../saisies.js'

const router = Router()

// Donne les listes a afficher dans le formulaire
router.get('/options', (req, res) => {
  res.json({ categories, appartements })
})

// Liste les depenses deja saisies
router.get('/', (req, res) => {
  res.json(saisies)
})

// Enregistre une nouvelle depense
router.post('/', (req, res) => {
  const depense = req.body ?? {}
  const erreurs = validerDepense(depense)

  if (erreurs.length > 0) {
    return res.status(400).json({ erreurs })
  }

  const nouvelle = ajouterSaisie(depense)
  res.status(201).json(nouvelle)
})

export default router
