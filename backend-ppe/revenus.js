// Module de saisie des revenus (KAN-18)
// Les revenus sont gardes en memoire, il n'y a pas encore de base de donnees

export const categoriesRevenus = [
  'Loyers',
  'Charges de copropriete',
  'Fonds de renovation',
  'Subventions',
  'Autres revenus',
]

export const appartementsRevenus = [
  'A1',
  'A2',
  'A3',
  'B1',
  'B2',
  'B3',
  'Parties communes',
]

export const revenus = []

export function normaliserDateImport(date) {
  if (date instanceof Date && !Number.isNaN(date.getTime())) {
    return date.toISOString().slice(0, 10)
  }

  const valeur = String(date ?? '').trim()
  const dateLocale = valeur.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/)

  if (dateLocale) {
    const [, jour, mois, annee] = dateLocale
    const anneeComplete = annee.length === 2 ? `20${annee}` : annee
    return `${anneeComplete}-${mois.padStart(2, '0')}-${jour.padStart(2, '0')}`
  }

  return valeur
}

export function validerRevenu(revenu) {
  const erreurs = []
  const montant = Number(revenu.montant)

  if (!Number.isFinite(montant) || montant <= 0) {
    erreurs.push('Le montant doit etre un nombre superieur a 0')
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(revenu.date ?? ''))) {
    erreurs.push('La date est obligatoire et doit etre au format AAAA-MM-JJ')
  }

  if (!categoriesRevenus.includes(revenu.categorie)) {
    erreurs.push('La categorie de revenu est invalide')
  }

  if (!appartementsRevenus.includes(revenu.appartement)) {
    erreurs.push("L'appartement est invalide")
  }

  return erreurs
}

export function viderRevenus() {
  revenus.length = 0
}

export function ajouterRevenu(revenu) {
  const nouveau = {
    id: revenus.length + 1,
    montant: Number(revenu.montant),
    date: revenu.date,
    categorie: revenu.categorie,
    appartement: revenu.appartement,
  }

  revenus.push(nouveau)
  return nouveau
}
