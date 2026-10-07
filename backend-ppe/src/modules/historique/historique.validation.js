// Validation des filtres de consultation de l'historique (KAN-35).
// Fonction pure, testable sans base (historique.validation.test.js).

export const TYPES_ELEMENT = ['projet', 'depense']
export const ACTIONS = ['creation', 'modification', 'suppression']

const FORMAT_DATE = /^\d{4}-\d{2}-\d{2}$/

function estIdValide(valeur) {
  return /^\d+$/.test(String(valeur)) && Number(valeur) > 0
}

/**
 * @param {object} query parametres de l'URL (?type=&action=&idElement=&idProjet=&du=&au=)
 * @returns {{erreurs: string[], filtres: object}}
 */
export function validerFiltresHistorique(query = {}) {
  const erreurs = []
  const filtres = {}

  if (query.type !== undefined && query.type !== '') {
    if (TYPES_ELEMENT.includes(query.type)) {
      filtres.type = query.type
    } else {
      erreurs.push(`Le type doit etre l'un de : ${TYPES_ELEMENT.join(', ')}`)
    }
  }

  if (query.action !== undefined && query.action !== '') {
    if (ACTIONS.includes(query.action)) {
      filtres.action = query.action
    } else {
      erreurs.push(`L action doit etre l'une de : ${ACTIONS.join(', ')}`)
    }
  }

  for (const champ of ['idElement', 'idProjet']) {
    if (query[champ] !== undefined && query[champ] !== '') {
      if (estIdValide(query[champ])) {
        filtres[champ] = Number(query[champ])
      } else {
        erreurs.push(`${champ} doit etre un identifiant positif`)
      }
    }
  }

  for (const champ of ['du', 'au']) {
    if (query[champ] !== undefined && query[champ] !== '') {
      if (FORMAT_DATE.test(query[champ]) && !Number.isNaN(Date.parse(query[champ]))) {
        filtres[champ] = query[champ]
      } else {
        erreurs.push(`La date "${champ}" doit etre au format AAAA-MM-JJ`)
      }
    }
  }

  if (filtres.du && filtres.au && filtres.du > filtres.au) {
    erreurs.push('La date de debut doit etre anterieure a la date de fin')
  }

  return { erreurs, filtres }
}
