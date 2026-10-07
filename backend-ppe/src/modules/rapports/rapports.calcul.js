const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

// Le même choix de période sert à l'écran et aux exports.
export function definirPeriode({ type = 'annuel', annee = String(new Date().getFullYear()), valeur } = {}) {
  if (typeof annee !== 'string' || !/^\d{4}$/.test(annee) || Number(annee) < 1900) {
    throw new Error('L’année doit être un nombre entre 1900 et 9999')
  }
  if (!['mensuel', 'trimestriel', 'annuel'].includes(type)) {
    throw new Error('La période doit être mensuelle, trimestrielle ou annuelle')
  }

  let premierMois = 1
  let dernierMois = 12
  let libelle = `Année ${annee}`
  if (type !== 'annuel') {
    const maximum = type === 'mensuel' ? 12 : 4
    if (typeof valeur !== 'string' || !/^\d{1,2}$/.test(valeur) || Number(valeur) < 1 || Number(valeur) > maximum) {
      throw new Error(type === 'mensuel' ? 'Le mois doit être compris entre 1 et 12' : 'Le trimestre doit être compris entre 1 et 4')
    }
    premierMois = type === 'mensuel' ? Number(valeur) : (Number(valeur) - 1) * 3 + 1
    dernierMois = type === 'mensuel' ? premierMois : premierMois + 2
    libelle = type === 'mensuel' ? `${MOIS[premierMois - 1]} ${annee}` : `Trimestre ${Number(valeur)} ${annee}`
  }
  const dernierJour = new Date(Date.UTC(Number(annee), dernierMois, 0)).getUTCDate()
  return {
    type, annee: Number(annee), libelle,
    dateDebut: `${annee}-${String(premierMois).padStart(2, '0')}-01`,
    dateFin: `${annee}-${String(dernierMois).padStart(2, '0')}-${dernierJour}`,
  }
}

// Les transactions fournies couvrent le début de l'année jusqu'à la fin de la période.
// Le budget annuel est conservé en entier : aucun prorata mensuel n'est inventé.
export function calculerRapport({ periode, ppe, budget, lignesBudget, transactions }) {
  const lignes = []
  for (const ligne of lignesBudget) {
    lignes.push({
      categorieId: ligne.categorieId, categorie: ligne.categorie,
      budgetAnnuel: Math.round(ligne.montant * 100), revenusPeriode: 0, depensesPeriode: 0, depensesCumulees: 0,
    })
  }

  const transactionsPeriode = []
  let revenus = 0
  let depenses = 0
  let depensesCumulees = 0
  for (const transaction of transactions) {
    if (transaction.date < `${periode.annee}-01-01` || transaction.date > periode.dateFin) continue
    const dansPeriode = transaction.date >= periode.dateDebut
    const montant = Math.round(transaction.montant * 100)
    if (dansPeriode) {
      transactionsPeriode.push(transaction)
      if (transaction.type === 'recette') revenus += montant
      else depenses += montant
    }
    if (transaction.type === 'depense') depensesCumulees += montant

    let ligne = lignes.find(l => l.categorieId === transaction.categorieId)
    if (!ligne) {
      ligne = { categorieId: transaction.categorieId, categorie: transaction.categorie || 'Sans catégorie', budgetAnnuel: null, revenusPeriode: 0, depensesPeriode: 0, depensesCumulees: 0 }
      lignes.push(ligne)
    }
    if (transaction.type === 'depense') {
      ligne.depensesCumulees += montant
      if (dansPeriode) ligne.depensesPeriode += montant
    } else if (dansPeriode) ligne.revenusPeriode += montant
  }

  let totalLignesBudget = 0
  for (const ligne of lignes) {
    if (ligne.budgetAnnuel !== null) totalLignesBudget += ligne.budgetAnnuel
    ligne.restantAnnuel = ligne.budgetAnnuel === null ? null : (ligne.budgetAnnuel - ligne.depensesCumulees) / 100
    ligne.tauxUtilisation = ligne.budgetAnnuel > 0 ? Math.round(ligne.depensesCumulees / ligne.budgetAnnuel * 100) : null
    if (ligne.budgetAnnuel !== null) ligne.budgetAnnuel /= 100
    ligne.revenusPeriode /= 100
    ligne.depensesPeriode /= 100
    ligne.depensesCumulees /= 100
  }
  lignes.sort((a, b) => a.categorie.localeCompare(b.categorie))
  const enveloppe = budget ? Math.round(budget.montant * 100) : null
  return {
    ppe, periode, genereLe: new Date().toISOString(),
    budget: budget ? { montant: enveloppe / 100, statut: budget.statut } : null,
    resume: {
      revenus: revenus / 100, depenses: depenses / 100, solde: (revenus - depenses) / 100,
      depensesCumulees: depensesCumulees / 100, totalLignesBudget: totalLignesBudget / 100,
      restantEnveloppe: enveloppe === null ? null : (enveloppe - depensesCumulees) / 100,
      nombreTransactions: transactionsPeriode.length,
    },
    categories: lignes, transactions: transactionsPeriode,
  }
}
