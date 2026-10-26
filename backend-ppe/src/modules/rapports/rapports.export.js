function celluleCsv(valeur) {
  let texte = typeof valeur === 'number' ? valeur.toFixed(2).replace('.', ',') : String(valeur ?? '')
  // Les descriptions saisies par un utilisateur ne doivent pas devenir
  // des formules lorsqu'un CSV est ouvert dans un tableur.
  if (typeof valeur !== 'number' && /^[\s]*[=+\-@]/.test(texte)) texte = `'${texte}`
  return `"${texte.replaceAll('"', '""')}"`
}

function creerCsv(lignes) {
  return '\uFEFF' + lignes.map(ligne => ligne.map(celluleCsv).join(';')).join('\r\n') + '\r\n'
}

export function exporterTransactionsCsv(rapport) {
  const lignes = [['ID', 'Date', 'Type', 'Catégorie', 'Description', 'Appartement', 'Projet', 'Facture', 'Débit CHF', 'Crédit CHF']]
  for (const transaction of rapport.transactions) {
    lignes.push([
      String(transaction.id), transaction.date, transaction.type, transaction.categorie, transaction.description,
      transaction.appartement, transaction.projet, transaction.facture,
      transaction.type === 'depense' ? transaction.montant : '',
      transaction.type === 'recette' ? transaction.montant : '',
    ])
  }
  return creerCsv(lignes)
}

export function exporterSyntheseCsv(rapport) {
  const lignes = [
    ['PPE', 'Début période', 'Fin période', 'Catégorie', 'Budget annuel CHF', 'Revenus période CHF', 'Dépenses période CHF', 'Dépenses cumulées depuis janvier CHF', 'Restant annuel CHF'],
  ]
  for (const categorie of rapport.categories) {
    lignes.push([
      rapport.ppe.nom, rapport.periode.dateDebut, rapport.periode.dateFin, categorie.categorie,
      categorie.budgetAnnuel, categorie.revenusPeriode, categorie.depensesPeriode,
      categorie.depensesCumulees, categorie.restantAnnuel,
    ])
  }
  return creerCsv(lignes)
}
