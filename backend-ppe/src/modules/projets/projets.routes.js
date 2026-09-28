import { Router } from 'express'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { ajouterProjet, getProjetById, getProjets, modifierProjet, supprimerProjet } from './projets.repository.js'
import { getDroitsUtilisateur, statutsProjet, validerProjet } from './projets.validation.js'

export const projetsRouter = Router()

// --- KAN-8 : Gestion des projets specifiques ---
// KAN-37 : Gestion des droits (RBAC Administrateur vs Copropriétaire)
// KAN-38 : Validations et tests fonctionnels

projetsRouter.get('/droits', requireAuth, (req, res) => {
  const droits = getDroitsUtilisateur(req.user.role)
  res.json({ droits, statuts: statutsProjet })
})

projetsRouter.get('/', requireAuth, requireRole('admin', 'owner'), async (req, res, next) => {
  try {
    res.json(await getProjets())
  } catch (error) {
    next(error)
  }
})

projetsRouter.get('/:id', requireAuth, requireRole('admin', 'owner'), async (req, res, next) => {
  try {
    const projet = await getProjetById(req.params.id)
    if (!projet) {
      return res.status(404).json({ error: 'Projet introuvable' })
    }
    res.json(projet)
  } catch (error) {
    next(error)
  }
})

projetsRouter.post('/', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const erreurs = validerProjet(req.body ?? {})
    if (erreurs.length > 0) {
      return res.status(400).json({ erreurs })
    }
    res.status(201).json(await ajouterProjet(req.body))
  } catch (error) {
    next(error)
  }
})

projetsRouter.put('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const existant = await getProjetById(req.params.id)
    if (!existant) {
      return res.status(404).json({ error: 'Projet introuvable' })
    }
    const erreurs = validerProjet(req.body ?? {}, { isUpdate: true })
    if (erreurs.length > 0) {
      return res.status(400).json({ erreurs })
    }
    res.json(await modifierProjet(req.params.id, req.body))
  } catch (error) {
    next(error)
  }
})

projetsRouter.delete('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const existant = await getProjetById(req.params.id)
    if (!existant) {
      return res.status(404).json({ error: 'Projet introuvable' })
    }
    await supprimerProjet(req.params.id)
    res.json({ message: 'Projet supprimé avec succès', id: req.params.id })
  } catch (error) {
    next(error)
  }
})
