// Module de saisie des depenses (KAN-19)
// Les depenses saisies sont gardees en memoire, il n'y a pas encore de base de donnees

export const categories = ['Entretien', 'Assurances', 'Nettoyage', 'Eau & Electricite', 'Administration', 'Reparations']

export const appartements = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'Parties communes']

export const saisies = []

// Verifie qu'une depense est correcte
// Renvoie la liste des erreurs (vide si tout va bien)
export function validerDepense(depense) {
  const erreurs = []
  const montant = Number(depense.montant)

  if (!montant || montant <= 0) {
    erreurs.push('Le montant doit etre un nombre superieur a 0')
  }

  if (!depense.date) {
    erreurs.push('La date est obligatoire')
  }

  if (!categories.includes(depense.categorie)) {
    erreurs.push('La categorie est invalide')
  }

  if (!appartements.includes(depense.appartement)) {
    erreurs.push('L appartement est invalide')
  }

  return erreurs
}

// Enregistre une depense et lui donne un numero
export function ajouterSaisie(depense) {
  const nouvelle = {
    id: saisies.length + 1,
    montant: Number(depense.montant),
    date: depense.date,
    categorie: depense.categorie,
    appartement: depense.appartement,
    justificatif: depense.justificatif || '',
  }

  saisies.push(nouvelle)
  return nouvelle
}
