// --- KAN-8 : Gestion des projets specifiques ---
// KAN-37 : Gestion des droits (RBAC Administrateur vs Copropriétaire)
// KAN-38 : Validations et tests fonctionnels
import { Router } from 'express'
import {
  getProjets,
  getProjetById,
  ajouterProjet,
  modifierProjet,
  supprimerProjet,
  validerProjet,
  getDroitsUtilisateur,
  statutsProjet,
} from '../projets.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

// Retourne les options et les droits de l'utilisateur connecté sur les projets
// ⚠️ Doit rester AVANT '/:id', sinon "droits" serait pris pour un identifiant de projet
router.get('/droits', requireAuth, (req, res) => {
  const droits = getDroitsUtilisateur(req.user.role)
  res.json({ droits, statuts: statutsProjet })
})

// Liste de tous les projets - accessible aux administrateurs et copropriétaires
router.get('/', requireAuth, requireRole('admin', 'owner'), (req, res) => {
  const liste = getProjets()
  res.json(liste)
})

// Détail d'un projet par ID - accessible aux administrateurs et copropriétaires
router.get('/:id', requireAuth, requireRole('admin', 'owner'), (req, res) => {
  const projet = getProjetById(req.params.id)
  if (!projet) {
    return res.status(404).json({ error: 'Projet introuvable' })
  }
  res.json(projet)
})

// Création d'un projet - réservée aux administrateurs (KAN-37) avec validation (KAN-38)
router.post('/', requireAuth, requireRole('admin'), (req, res) => {
  const erreurs = validerProjet(req.body ?? {})
  if (erreurs.length > 0) {
    return res.status(400).json({ erreurs })
  }
  const nouveau = ajouterProjet(req.body)
  res.status(201).json(nouveau)
})

// Modification d'un projet - réservée aux administrateurs (KAN-37) avec validation (KAN-38)
router.put('/:id', requireAuth, requireRole('admin'), (req, res) => {
  const projet = getProjetById(req.params.id)
  if (!projet) {
    return res.status(404).json({ error: 'Projet introuvable' })
  }
  const erreurs = validerProjet(req.body ?? {}, { isUpdate: true })
  if (erreurs.length > 0) {
    return res.status(400).json({ erreurs })
  }
  const modifie = modifierProjet(req.params.id, req.body)
  res.json(modifie)
})

// Suppression d'un projet - réservée aux administrateurs (KAN-37)
router.delete('/:id', requireAuth, requireRole('admin'), (req, res) => {
  const projet = getProjetById(req.params.id)
  if (!projet) {
    return res.status(404).json({ error: 'Projet introuvable' })
  }
  supprimerProjet(req.params.id)
  res.json({ message: 'Projet supprimé avec succès', id: req.params.id })
})

export default router
