import { Router } from 'express'
import { avecTransaction } from '../../db/pool.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { photoDepense } from '../historique/historique.changements.js'
import { enregistrerHistorique } from '../historique/historique.repository.js'
import { getCategoriesParType, getLotsReferences, getProjetsNoms } from '../reference/reference.repository.js'
import { ajouterDepense, getDepenseById, listerDepenses, supprimerDepense } from './depenses.repository.js'
import { validerDepense } from './depenses.validation.js'

export const depensesRouter = Router()

// --- KAN-19 : module de saisie des depenses ---
// KAN-35 : routes protegees (il faut savoir QUI agit pour l'historique),
// lecture admin + coproprietaire, ecriture admin seulement (meme regle que
// les projets). Creation et suppression sont inscrites dans l'Historique.

// Donne les listes a afficher dans le formulaire
depensesRouter.get('/options', requireAuth, requireRole('admin', 'owner'), async (req, res, next) => {
  try {
    const [categories, appartements, projets] = await Promise.all([
      getCategoriesParType('depense'),
      getLotsReferences(),
      getProjetsNoms(),
    ])
    res.json({ categories, appartements, projets })
  } catch (error) {
    next(error)
  }
})

// Liste les depenses deja saisies
depensesRouter.get('/', requireAuth, requireRole('admin', 'owner'), async (req, res, next) => {
  try {
    res.json(await listerDepenses())
  } catch (error) {
    next(error)
  }
})

// Enregistre une nouvelle depense
depensesRouter.post('/', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const depense = req.body ?? {}
    const erreurs = await validerDepense(depense)

    if (erreurs.length > 0) {
      return res.status(400).json({ erreurs })
    }

    const creee = await avecTransaction(async (db) => {
      const nouvelle = await ajouterDepense(depense, db)
      await enregistrerHistorique(db, {
        typeElement: 'depense',
        idElement: nouvelle.id,
        idProjet: nouvelle.idProjet,
        action: 'creation',
        idUtilisateur: req.user.id,
        details: { apres: photoDepense(nouvelle) },
      })
      return nouvelle
    })

    res.status(201).json(creee)
  } catch (error) {
    next(error)
  }
})

// Supprime une depense (l'historique en garde une copie)
depensesRouter.delete('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const existante = await getDepenseById(req.params.id)
    if (!existante) {
      return res.status(404).json({ error: 'Dépense introuvable' })
    }

    await avecTransaction(async (db) => {
      await supprimerDepense(existante.id, db)
      await enregistrerHistorique(db, {
        typeElement: 'depense',
        idElement: existante.id,
        idProjet: existante.idProjet,
        action: 'suppression',
        idUtilisateur: req.user.id,
        details: { avant: photoDepense(existante) },
      })
    })

    res.json({ message: 'Dépense supprimée avec succès', id: existante.id })
  } catch (error) {
    next(error)
  }
})
