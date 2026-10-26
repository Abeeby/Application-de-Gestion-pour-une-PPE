import { Router } from 'express'
import multer from 'multer'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import * as XLSX from 'xlsx'
import { getCategoriesParType, getLotsReferences } from '../reference/reference.repository.js'
import { ajouterRevenu, listerRevenus } from './revenus.repository.js'
import { normaliserDateImport, validerRevenu } from './revenus.validation.js'

export const revenusRouter = Router()
// KAN-12 : toutes ces routes exigent une session valide (401 sinon).
// Roles autorises : administrateur et coproprietaire, comme le demandent les
// user stories (meme regle que la saisie des depenses, KAN-36).
revenusRouter.use(requireAuth, requireRole('admin', 'owner'))

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })

// --- KAN-18 : module de saisie des revenus ---

revenusRouter.get('/options', async (req, res, next) => {
  try {
    const [categories, appartements] = await Promise.all([getCategoriesParType('recette'), getLotsReferences()])
    res.json({ categories, appartements })
  } catch (error) {
    next(error)
  }
})

revenusRouter.get('/', async (req, res, next) => {
  try {
    res.json(await listerRevenus())
  } catch (error) {
    next(error)
  }
})

revenusRouter.post('/', async (req, res, next) => {
  try {
    const revenu = req.body ?? {}
    const erreurs = await validerRevenu(revenu)

    if (erreurs.length > 0) {
      return res.status(400).json({ erreurs })
    }

    res.status(201).json(await ajouterRevenu(revenu))
  } catch (error) {
    next(error)
  }
})

const normaliserEntete = (entete) => String(entete ?? '')
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .trim()
  .toLowerCase()

const convertirLignesImport = (lignes) => lignes.map((ligne) => {
  const champs = Object.entries(ligne).reduce((resultat, [entete, valeur]) => {
    resultat[normaliserEntete(entete)] = typeof valeur === 'string' ? valeur.trim() : valeur
    return resultat
  }, {})

  return {
    montant: champs.montant,
    date: normaliserDateImport(champs.date),
    categorie: champs.categorie,
    appartement: champs.appartement,
  }
})

revenusRouter.post('/import', upload.single('fichier'), async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ erreurs: ['Le fichier CSV ou Excel est obligatoire'] })
  }

  try {
    const classeur = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true })
    const feuille = classeur.Sheets[classeur.SheetNames[0]]
    const lignes = XLSX.utils.sheet_to_json(feuille, { defval: '', raw: false })
    const revenusImportes = convertirLignesImport(lignes)
    const erreurs = []

    for (const [index, revenu] of revenusImportes.entries()) {
      const erreursLigne = await validerRevenu(revenu)
      erreursLigne.forEach((erreur) => erreurs.push(`Ligne ${index + 2} : ${erreur}`))
    }

    if (revenusImportes.length === 0) {
      erreurs.push('Le fichier ne contient aucun revenu')
    }

    if (erreurs.length > 0) {
      return res.status(400).json({ erreurs })
    }

    const nouveauxRevenus = []
    for (const revenu of revenusImportes) {
      nouveauxRevenus.push(await ajouterRevenu(revenu))
    }

    res.status(201).json({ importes: nouveauxRevenus.length, revenus: nouveauxRevenus })
  } catch (error) {
    res.status(400).json({ erreurs: ['Le fichier est illisible. Utilisez un fichier CSV ou Excel valide.'] })
  }
})
