import { estDateValide, estMontantValide } from '../../validation/communes.js'

// Regles metier et RBAC du module projets (KAN-8 / KAN-37 / KAN-38).
// Code inchange par rapport a l'ancien projets.js "en memoire" : la
// validation ne depend pas du stockage.

export const ROLES = {
  ADMIN: 'admin',
  OWNER: 'owner',
}

export const PERMISSIONS = {
  READ: 'read',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
}

// Matrice de controle d'acces par role (RBAC - KAN-37)
export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [PERMISSIONS.READ, PERMISSIONS.CREATE, PERMISSIONS.UPDATE, PERMISSIONS.DELETE],
  [ROLES.OWNER]: [PERMISSIONS.READ],
}

export function verifierDroitProjet(role, permission) {
  if (!role || !ROLE_PERMISSIONS[role]) {
    return false
  }
  return ROLE_PERMISSIONS[role].includes(permission)
}

export function getDroitsUtilisateur(role) {
  const isAdmin = role === ROLES.ADMIN
  const isOwner = role === ROLES.OWNER

  return {
    role: role ?? 'anonymous',
    canRead: verifierDroitProjet(role, PERMISSIONS.READ),
    canCreate: verifierDroitProjet(role, PERMISSIONS.CREATE),
    canEdit: verifierDroitProjet(role, PERMISSIONS.UPDATE),
    canDelete: verifierDroitProjet(role, PERMISSIONS.DELETE),
    roleLabel: isAdmin ? 'Administrateur' : isOwner ? 'Copropriétaire' : 'Visiteur',
    estAdmin: isAdmin,
    estCoproprietaire: isOwner,
  }
}

export const statutsProjet = ['Planifié', 'En cours', 'Terminé', 'En attente', 'Suspendu']

// Date reelle du calendrier : new Date('2026-02-31') etait acceptee (elle
// devient le 3 mars) puis MySQL renvoyait une erreur 500.
export { estDateValide }

export const statutsEtape = ['Terminé', 'En cours', 'En attente']

/**
 * Validation metier d'un projet specifique (KAN-38)
 * @param {object} projet
 * @param {object} options - { isUpdate }
 * @returns {string[]}
 */
export function validerProjet(projet = {}, { isUpdate = false } = {}) {
  const erreurs = []

  if (!isUpdate || projet.titre !== undefined) {
    if (typeof projet.titre !== 'string' || projet.titre.trim().length === 0) {
      erreurs.push('Le titre du projet est obligatoire')
    } else if (projet.titre.trim().length < 3) {
      erreurs.push('Le titre du projet doit comporter au moins 3 caractères')
    } else if (projet.titre.trim().length > 80) {
      // Meme limite que la colonne Projets.nom VARCHAR(80)
      erreurs.push('Le titre du projet ne peut pas dépasser 80 caractères')
    }
  }

  if (!isUpdate || projet.budgetTotal !== undefined) {
    const budget = Number(projet.budgetTotal)
    if (projet.budgetTotal === undefined || projet.budgetTotal === null || projet.budgetTotal === '') {
      erreurs.push('Le budget total est obligatoire')
    } else if (Number.isNaN(budget) || budget <= 0 || !estMontantValide(budget)) {
      erreurs.push('Le budget total doit être un nombre supérieur à 0')
    }
  }

  if (projet.depense !== undefined && projet.depense !== null && projet.depense !== '') {
    const dep = Number(projet.depense)
    if (Number.isNaN(dep) || dep < 0) {
      erreurs.push('Le montant dépensé doit être un nombre positif ou nul')
    }
  }

  if (projet.progression !== undefined && projet.progression !== null && projet.progression !== '') {
    const prog = Number(projet.progression)
    if (Number.isNaN(prog) || prog < 0 || prog > 100) {
      erreurs.push('La progression doit être un pourcentage compris entre 0 et 100')
    }
  }

  if (!isUpdate || projet.statut !== undefined) {
    if (!projet.statut) {
      erreurs.push('Le statut est obligatoire')
    } else if (!statutsProjet.includes(projet.statut)) {
      erreurs.push(`Le statut doit être l'un des suivants : ${statutsProjet.join(', ')}`)
    }
  }

  if (!isUpdate || projet.dateDebut !== undefined) {
    if (!projet.dateDebut) {
      erreurs.push('La date de début est obligatoire')
    } else if (!estDateValide(projet.dateDebut)) {
      erreurs.push('La date de début doit être au format AAAA-MM-JJ (ex: 2026-09-01)')
    }
  }

  if (projet.dateFin) {
    if (!estDateValide(projet.dateFin)) {
      erreurs.push('La date de fin doit être au format AAAA-MM-JJ (ex: 2026-12-31)')
    } else if (projet.dateDebut && estDateValide(projet.dateDebut)) {
      if (projet.dateFin < projet.dateDebut) {
        erreurs.push('La date de fin ne peut pas être antérieure à la date de début')
      }
    }
  }

  if (!isUpdate || projet.responsable !== undefined) {
    if (typeof projet.responsable !== 'string' || projet.responsable.trim().length === 0) {
      erreurs.push('Le responsable du projet est obligatoire')
    } else if (projet.responsable.trim().length < 2) {
      erreurs.push('Le responsable doit comporter au moins 2 caractères')
    }
  }

  // Etapes du projet : chaque etape doit pouvoir etre enregistree en base
  if (projet.etapes !== undefined) {
    if (!Array.isArray(projet.etapes)) {
      erreurs.push('Les étapes doivent être une liste')
    } else {
      projet.etapes.forEach((etape, index) => {
        const numero = index + 1
        if (typeof etape?.titre !== 'string' || !etape.titre.trim() || etape.titre.length > 150) {
          erreurs.push(`Étape ${numero} : le titre est obligatoire (150 caractères maximum)`)
        }
        if (!estDateValide(etape?.date)) {
          erreurs.push(`Étape ${numero} : la date doit être au format AAAA-MM-JJ`)
        }
        if (etape?.statut !== undefined && !statutsEtape.includes(etape.statut)) {
          erreurs.push(`Étape ${numero} : le statut doit être ${statutsEtape.join(', ')}`)
        }
      })
    }
  }

  return erreurs
}
