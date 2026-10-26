export type Transaction = {
  id: number
  type: 'depense' | 'revenu'
  montant: number
  date: string
  categorie: string | null
  appartement: string | null
  projet?: string | null
}

export type Filtres = {
  annee: string
  categorie: string
  appartement: string
  projet: string
}

export function filtrerTransactions(transactions: Transaction[], filtres: Filtres) {
  return transactions.filter(transaction => {
    if (filtres.annee && transaction.date.slice(0, 4) !== filtres.annee) return false
    if (filtres.categorie && transaction.categorie !== filtres.categorie) return false
    if (filtres.appartement && transaction.appartement !== filtres.appartement) return false
    if (filtres.projet && transaction.projet !== filtres.projet) return false
    return true
  })
}

// Les montants sont additionnés en centimes pour éviter les erreurs d'arrondi.
export function calculerTotaux(transactions: Transaction[]) {
  let depenses = 0
  let revenus = 0
  for (const transaction of transactions) {
    const centimes = Math.round(transaction.montant * 100)
    if (transaction.type === 'depense') depenses += centimes
    else revenus += centimes
  }
  return { depenses: depenses / 100, revenus: revenus / 100, solde: (revenus - depenses) / 100 }
}

export function depensesParCategorie(transactions: Transaction[]) {
  const categories: { categorie: string; montant: number }[] = []
  for (const transaction of transactions) {
    if (transaction.type !== 'depense') continue
    const nom = transaction.categorie || 'Sans catégorie'
    let ligne = categories.find(categorie => categorie.categorie === nom)
    if (!ligne) {
      ligne = { categorie: nom, montant: 0 }
      categories.push(ligne)
    }
    ligne.montant += Math.round(transaction.montant * 100)
  }
  for (const ligne of categories) ligne.montant /= 100
  return categories.sort((a, b) => b.montant - a.montant)
}

export function evolutionMensuelle(transactions: Transaction[]) {
  const mois: { mois: string; depenses: number; revenus: number }[] = []
  for (const transaction of transactions) {
    const date = transaction.date.slice(0, 7)
    let ligne = mois.find(m => m.mois === date)
    if (!ligne) {
      ligne = { mois: date, depenses: 0, revenus: 0 }
      mois.push(ligne)
    }
    const centimes = Math.round(transaction.montant * 100)
    if (transaction.type === 'depense') ligne.depenses += centimes
    else ligne.revenus += centimes
  }
  for (const ligne of mois) {
    ligne.depenses /= 100
    ligne.revenus /= 100
  }
  return mois.sort((a, b) => a.mois.localeCompare(b.mois))
}
