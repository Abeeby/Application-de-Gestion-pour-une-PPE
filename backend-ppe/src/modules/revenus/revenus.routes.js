import { Router } from 'express'
import multer from 'multer'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import * as XLSX from 'xlsx'
import { getCategoriesParType, getLotsReferences } from '../reference/reference.repository.js'
import { ajouterRevenu, listerRevenus } from './revenus.repository.js'
import { avecTransaction } from '../../db/pool.js'
import { normaliserDateImport, validerRevenu } from './revenus.validation.js'

export const revenusRouter = Router()
// KAN-12 : toutes ces routes exigent une session valide (401 sinon).
// Lecture : administrateur et coproprietaire.
// Ecriture (saisie, import) : administrateur seulement, comme les depenses.
// Raison : les revenus "Charges de copropriete" d'un lot sont comptes comme
// acomptes dans le decompte KAN-22. Un coproprietaire pouvait donc s'en
// ajouter lui-meme et faire baisser son propre solde de charges.
revenusRouter.use(requireAuth, requireRole('admin', 'owner'))

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  // Seuls les CSV et les classeurs Excel sont lus
  fileFilter: (req, fichier, accepter) => accepter(null, /\.(csv|xlsx|xls)$/i.test(fichier.originalname)),
})

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

revenusRouter.post('/', requireRole('admin'), async (req, res, next) => {
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

revenusRouter.post('/import', requireRole('admin'), upload.single('fichier'), async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ erreurs: ['Le fichier CSV ou Excel est obligatoire'] })
  }

  try {
    const classeur = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true })
    const feuille = classeur.Sheets[classeur.SheetNames[0]]
    // raw: true -> une cellule date reste un objet Date. Avec raw: false,
    // Excel la donnait au format americain "3/4/26" (4 mars) que l'on lisait
    // ensuite comme 3 avril : jour et mois etaient inverses.
    const lignes = XLSX.utils.sheet_to_json(feuille, { defval: '', raw: true })
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

    // Tout ou rien : si une ligne echoue, aucune n'est enregistree (avant,
    // les premieres lignes restaient en base malgre le message d'erreur)
    const nouveauxRevenus = await avecTransaction(async (db) => {
      const ajoutes = []
      for (const revenu of revenusImportes) {
        ajoutes.push(await ajouterRevenu(revenu, db))
      }
      return ajoutes
    })

    res.status(201).json({ importes: nouveauxRevenus.length, revenus: nouveauxRevenus })
  } catch (error) {
    // Erreur de base de donnees -> gestionnaire d'erreurs central (500)
    if (String(error?.code ?? '').startsWith('ER_')) return next(error)
    res.status(400).json({ erreurs: ['Le fichier est illisible. Utilisez un fichier CSV ou Excel valide.'] })
  }
})
