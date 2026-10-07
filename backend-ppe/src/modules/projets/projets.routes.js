import { Router } from 'express'
import { avecTransaction } from '../../db/pool.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { calculerChangements, photoProjet } from '../historique/historique.changements.js'
import { enregistrerHistorique } from '../historique/historique.repository.js'
import { ajouterProjet, getProjetById, getProjets, modifierProjet, supprimerProjet } from './projets.repository.js'
import { getDroitsUtilisateur, statutsProjet, validerProjet } from './projets.validation.js'

export const projetsRouter = Router()

// --- KAN-8 : Gestion des projets specifiques ---
// KAN-37 : Gestion des droits (RBAC Administrateur vs Copropriétaire)
// KAN-38 : Validations et tests fonctionnels
// KAN-35 : chaque creation / modification / suppression est inscrite dans
// l'Historique, dans la meme transaction que l'operation elle-meme.

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
    const projet = await avecTransaction(async (db) => {
      const cree = await ajouterProjet(req.body, db)
      await enregistrerHistorique(db, {
        typeElement: 'projet',
        idElement: cree.id,
        idProjet: cree.id,
        action: 'creation',
        idUtilisateur: req.user.id,
        details: { apres: photoProjet(cree) },
      })
      return cree
    })
    res.status(201).json(projet)
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
    const projet = await avecTransaction(async (db) => {
      const modifie = await modifierProjet(req.params.id, req.body, db)
      const changements = calculerChangements(photoProjet(existant), photoProjet(modifie))
      // Enregistrer sans rien changer ne laisse pas de trace (TV-04)
      if (Object.keys(changements).length > 0) {
        await enregistrerHistorique(db, {
          typeElement: 'projet',
          idElement: modifie.id,
          idProjet: modifie.id,
          action: 'modification',
          idUtilisateur: req.user.id,
          details: { changements },
        })
      }
      return modifie
    })
    res.json(projet)
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
    await avecTransaction(async (db) => {
      await supprimerProjet(req.params.id, db)
      await enregistrerHistorique(db, {
        typeElement: 'projet',
        idElement: existant.id,
        idProjet: existant.id,
        action: 'suppression',
        idUtilisateur: req.user.id,
        details: { avant: photoProjet(existant) },
      })
    })
    res.json({ message: 'Projet supprimé avec succès', id: req.params.id })
  } catch (error) {
    next(error)
  }
})
