// Logique pure de l'historique (KAN-35) : quelles valeurs d'un projet ou
// d'une depense on garde en memoire, et quels champs ont change entre deux
// etats. Aucun acces base : testable unitairement (historique.changements.test.js).

// Champs saisis par l'utilisateur. Les champs calcules (depense, soldeRestant,
// depassement) sont exclus : ils changent sans que le projet soit modifie.
export const CHAMPS_PROJET = [
  'titre',
  'description',
  'responsable',
  'budgetTotal',
  'progression',
  'statut',
  'dateDebut',
  'dateFin',
  'etapes',
]

export const CHAMPS_DEPENSE = ['montant', 'date', 'categorie', 'appartement', 'projet', 'justificatif']

function garderChamps(objet, champs) {
  const photo = {}
  for (const champ of champs) {
    photo[champ] = objet?.[champ] ?? null
  }
  return photo
}

export const photoProjet = (projet) => garderChamps(projet, CHAMPS_PROJET)
export const photoDepense = (depense) => garderChamps(depense, CHAMPS_DEPENSE)

function sontEgales(a, b) {
  // JSON.stringify compare aussi les tableaux (etapes) champ par champ
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
}

/**
 * @param {object} avant photo avant modification
 * @param {object} apres photo apres modification
 * @returns {Record<string, {avant: unknown, apres: unknown}>} uniquement les champs modifies (vide si rien n'a change)
 */
export function calculerChangements(avant, apres) {
  const changements = {}
  const champs = new Set([...Object.keys(avant ?? {}), ...Object.keys(apres ?? {})])

  for (const champ of champs) {
    if (!sontEgales(avant?.[champ], apres?.[champ])) {
      changements[champ] = { avant: avant?.[champ] ?? null, apres: apres?.[champ] ?? null }
    }
  }

  return changements
}
