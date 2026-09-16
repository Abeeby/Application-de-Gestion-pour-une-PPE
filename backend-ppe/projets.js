// Module de gestion des projets specifiques (KAN-8)
// KAN-37 : Gestion des droits (RBAC Administrateur vs Copropriétaire)
// KAN-38 : Validations metier et gestion des donnees

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

/**
 * Verifie si un role dispose d'une permission donnee
 * @param {string} role
 * @param {string} permission
 * @returns {boolean}
 */
export function verifierDroitProjet(role, permission) {
  if (!role || !ROLE_PERMISSIONS[role]) {
    return false
  }
  return ROLE_PERMISSIONS[role].includes(permission)
}

/**
 * Retourne le profil des droits pour un role (utilise par le frontend et l'API)
 * @param {string} role
 * @returns {object}
 */
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

// Donnees initiales des projets basees sur les maquettes Figma
const projetsInitiaux = [
  {
    id: 'proj-1',
    titre: 'Rénovation du toit',
    description: "Remplacement complet de l'isolation du toit principal et étanchéité.",
    budgetTotal: 85000,
    depense: 74800,
    progression: 88,
    statut: 'En cours',
    dateDebut: '2026-01-15',
    dateFin: '2026-11-30',
    responsable: 'Régie Naef SA',
    etapes: [
      { titre: 'Étude et planification', date: '2026-01-15', statut: 'Terminé' },
      { titre: 'Appels d offres', date: '2026-03-02', statut: 'Terminé' },
      { titre: 'Choix du prestataire', date: '2026-04-24', statut: 'Terminé' },
      { titre: 'Travaux', date: '2026-08-01', statut: 'En cours' },
      { titre: 'Réception des travaux', date: '2026-10-15', statut: 'En attente' },
      { titre: 'Clôture du projet', date: '2026-11-30', statut: 'En attente' },
    ],
  },
  {
    id: 'proj-2',
    titre: 'Rénovation de la façade',
    description: 'Nettoyage haute pression, réparation du crépi et peinture extérieure.',
    budgetTotal: 60000,
    depense: 0,
    progression: 0,
    statut: 'Planifié',
    dateDebut: '2026-09-01',
    dateFin: '2027-03-31',
    responsable: 'Façades Romandes Sàrl',
    etapes: [
      { titre: 'Étude préliminaire', date: '2026-09-01', statut: 'En cours' },
      { titre: 'Devis & validation copropriétaires', date: '2026-11-15', statut: 'En attente' },
      { titre: 'Début des travaux extérieurs', date: '2027-02-01', statut: 'En attente' },
    ],
  },
  {
    id: 'proj-3',
    titre: 'Panneaux solaires',
    description: 'Installation de 42 panneaux photovoltaïques sur le toit orienté sud.',
    budgetTotal: 35000,
    depense: 34900,
    progression: 100,
    statut: 'Terminé',
    dateDebut: '2025-06-01',
    dateFin: '2025-12-15',
    responsable: 'VoltEnergie SA',
    etapes: [
      { titre: 'Étude faisabilité et subventions', date: '2025-06-01', statut: 'Terminé' },
      { titre: 'Pose des panneaux', date: '2025-09-10', statut: 'Terminé' },
      { titre: 'Raccordement réseau Romande Énergie', date: '2025-12-01', statut: 'Terminé' },
    ],
  },
]

export let projets = JSON.parse(JSON.stringify(projetsInitiaux))

/**
 * Reinitialise la liste des projets a l'etat par defaut (utile pour les tests)
 */
export function reinitialiserProjets() {
  projets = JSON.parse(JSON.stringify(projetsInitiaux))
}

/**
 * Verifie si une chaine correspond a une date valide au format YYYY-MM-DD
 * @param {string} dateStr
 * @returns {boolean}
 */
export function estDateValide(dateStr) {
  if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false
  }
  const d = new Date(dateStr)
  return !Number.isNaN(d.getTime())
}

/**
 * Validation metier d'un projet specifique (KAN-38)
 * @param {object} projet - Les donnees du projet a valider
 * @param {object} options - Options de validation { isUpdate }
 * @returns {string[]} - Liste des erreurs trouvees (vide si valide)
 */
export function validerProjet(projet = {}, { isUpdate = false } = {}) {
  const erreurs = []

  // Titre
  if (!isUpdate || projet.titre !== undefined) {
    if (typeof projet.titre !== 'string' || projet.titre.trim().length === 0) {
      erreurs.push('Le titre du projet est obligatoire')
    } else if (projet.titre.trim().length < 3) {
      erreurs.push('Le titre du projet doit comporter au moins 3 caractères')
    } else if (projet.titre.trim().length > 100) {
      erreurs.push('Le titre du projet ne peut pas dépasser 100 caractères')
    }
  }

  // Budget total
  if (!isUpdate || projet.budgetTotal !== undefined) {
    const budget = Number(projet.budgetTotal)
    if (projet.budgetTotal === undefined || projet.budgetTotal === null || projet.budgetTotal === '') {
      erreurs.push('Le budget total est obligatoire')
    } else if (Number.isNaN(budget) || budget <= 0) {
      erreurs.push('Le budget total doit être un nombre supérieur à 0')
    }
  }

  // Depense
  if (projet.depense !== undefined && projet.depense !== null && projet.depense !== '') {
    const dep = Number(projet.depense)
    if (Number.isNaN(dep) || dep < 0) {
      erreurs.push('Le montant dépensé doit être un nombre positif ou nul')
    }
  }

  // Progression
  if (projet.progression !== undefined && projet.progression !== null && projet.progression !== '') {
    const prog = Number(projet.progression)
    if (Number.isNaN(prog) || prog < 0 || prog > 100) {
      erreurs.push('La progression doit être un pourcentage compris entre 0 et 100')
    }
  }

  // Statut
  if (!isUpdate || projet.statut !== undefined) {
    if (!projet.statut) {
      erreurs.push('Le statut est obligatoire')
    } else if (!statutsProjet.includes(projet.statut)) {
      erreurs.push(`Le statut doit être l'un des suivants : ${statutsProjet.join(', ')}`)
    }
  }

  // Date de debut
  if (!isUpdate || projet.dateDebut !== undefined) {
    if (!projet.dateDebut) {
      erreurs.push('La date de début est obligatoire')
    } else if (!estDateValide(projet.dateDebut)) {
      erreurs.push('La date de début doit être au format AAAA-MM-JJ (ex: 2026-09-01)')
    }
  }

  // Date de fin
  if (projet.dateFin) {
    if (!estDateValide(projet.dateFin)) {
      erreurs.push('La date de fin doit être au format AAAA-MM-JJ (ex: 2026-12-31)')
    } else if (projet.dateDebut && estDateValide(projet.dateDebut)) {
      if (projet.dateFin < projet.dateDebut) {
        erreurs.push('La date de fin ne peut pas être antérieure à la date de début')
      }
    }
  }

  // Responsable
  if (!isUpdate || projet.responsable !== undefined) {
    if (typeof projet.responsable !== 'string' || projet.responsable.trim().length === 0) {
      erreurs.push('Le responsable du projet est obligatoire')
    } else if (projet.responsable.trim().length < 2) {
      erreurs.push('Le responsable doit comporter au moins 2 caractères')
    }
  }

  return erreurs
}

/**
 * Recupere la liste complete des projets avec calculs derives (solde restant)
 * @returns {Array}
 */
export function getProjets() {
  return projets.map((p) => ({
    ...p,
    soldeRestant: Math.max(0, p.budgetTotal - p.depense),
    depassement: p.depense > p.budgetTotal ? p.depense - p.budgetTotal : 0,
  }))
}

/**
 * Recupere un projet par son identifiant
 * @param {string} id
 * @returns {object|null}
 */
export function getProjetById(id) {
  const p = projets.find((item) => item.id === id)
  if (!p) return null
  return {
    ...p,
    soldeRestant: Math.max(0, p.budgetTotal - p.depense),
    depassement: p.depense > p.budgetTotal ? p.depense - p.budgetTotal : 0,
  }
}

/**
 * Ajoute un nouveau projet specifique (reserve a l'administrateur)
 * @param {object} data
 * @returns {object}
 */
export function ajouterProjet(data) {
  const budgetTotal = Number(data.budgetTotal)
  const depense = data.depense !== undefined ? Number(data.depense) : 0
  const progression =
    data.progression !== undefined
      ? Math.round(Number(data.progression))
      : budgetTotal > 0
        ? Math.min(100, Math.round((depense / budgetTotal) * 100))
        : 0

  const nouveau = {
    id: `proj-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    titre: data.titre.trim(),
    description: data.description ? String(data.description).trim() : '',
    budgetTotal,
    depense,
    progression,
    statut: data.statut || 'Planifié',
    dateDebut: data.dateDebut,
    dateFin: data.dateFin || '',
    responsable: data.responsable.trim(),
    etapes: Array.isArray(data.etapes) ? data.etapes : [],
  }

  projets.unshift(nouveau)
  return getProjetById(nouveau.id)
}

/**
 * Modifie un projet existant (reserve a l'administrateur)
 * @param {string} id
 * @param {object} data
 * @returns {object|null}
 */
export function modifierProjet(id, data) {
  const index = projets.findIndex((p) => p.id === id)
  if (index === -1) {
    return null
  }

  const existant = projets[index]
  const budgetTotal = data.budgetTotal !== undefined ? Number(data.budgetTotal) : existant.budgetTotal
  const depense = data.depense !== undefined ? Number(data.depense) : existant.depense
  const progression =
    data.progression !== undefined
      ? Math.round(Number(data.progression))
      : budgetTotal > 0
        ? Math.min(100, Math.round((depense / budgetTotal) * 100))
        : existant.progression

  const maj = {
    ...existant,
    titre: data.titre !== undefined ? data.titre.trim() : existant.titre,
    description: data.description !== undefined ? String(data.description).trim() : existant.description,
    budgetTotal,
    depense,
    progression,
    statut: data.statut !== undefined ? data.statut : existant.statut,
    dateDebut: data.dateDebut !== undefined ? data.dateDebut : existant.dateDebut,
    dateFin: data.dateFin !== undefined ? data.dateFin : existant.dateFin,
    responsable: data.responsable !== undefined ? data.responsable.trim() : existant.responsable,
    etapes: Array.isArray(data.etapes) ? data.etapes : existant.etapes,
  }

  projets[index] = maj
  return getProjetById(id)
}

/**
 * Supprime un projet (reserve a l'administrateur)
 * @param {string} id
 * @returns {boolean}
 */
export function supprimerProjet(id) {
  const index = projets.findIndex((p) => p.id === id)
  if (index === -1) {
    return false
  }
  projets.splice(index, 1)
  return true
}
