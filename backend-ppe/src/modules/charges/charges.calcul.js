// --- KAN-22 : repartition des charges et rapprochement ---
// Fonctions de calcul PURES (aucun acces base) : faciles a tester et a
// relire. Le repository fournit les donnees, les routes les assemblent.
//
// Tous les calculs se font en CENTIMES entiers pour eviter les erreurs
// d'arrondi des nombres a virgule (0.1 + 0.2 !== 0.3 en JavaScript).

/** Cles de repartition possibles (colonne Categories.cle_repartition). */
export const CLES_REPARTITION = ['quote_part', 'egal']

const versCentimes = (montant) => Math.round(Number(montant) * 100)
const versFrancs = (centimes) => centimes / 100

/** Un lot « habitable » a une quote-part > 0 (exclut le lot technique « Parties communes »). */
const estHabitable = (lot) => Number(lot.quote_part) > 0

/**
 * Repartit des centimes proportionnellement a des poids entiers, sans perdre
 * ni creer de centime (methode du plus fort reste) : chaque lot recoit la
 * partie entiere de sa part, puis les centimes restants vont aux lots qui
 * avaient les plus grandes parties decimales.
 * @param {number} totalCentimes
 * @param {number[]} poids entiers >= 0, au moins un > 0
 * @returns {number[]} centimes par poids, meme ordre
 */
function repartirCentimes(totalCentimes, poids) {
  const sommePoids = poids.reduce((total, p) => total + p, 0)
  const parts = poids.map((p) => Math.floor((totalCentimes * p) / sommePoids))
  const restes = poids.map((p, index) => ({ index, reste: (totalCentimes * p) % sommePoids }))

  let centimesRestants = totalCentimes - parts.reduce((total, part) => total + part, 0)
  restes.sort((a, b) => b.reste - a.reste || a.index - b.index)
  for (const { index } of restes) {
    if (centimesRestants === 0) break
    parts[index] += 1
    centimesRestants -= 1
  }
  return parts
}

/**
 * Poids de chaque lot selon la cle. La quote-part est convertie en entier
 * (16.67 -> 1667) : on divise ensuite par la SOMME des poids, donc peu importe
 * que les quote-parts soient en %, en milliemes, ou totalisent 99.99.
 */
function poidsSelonCle(lots, cle) {
  if (cle === 'egal') {
    return lots.map((lot) => (estHabitable(lot) ? 1 : 0))
  }
  return lots.map((lot) => Math.round(Number(lot.quote_part) * 100))
}

/**
 * Ventile une depense entre les lots.
 * - rattachee a un lot habitable -> 100% sur ce lot (charge privative)
 * - sans lot, ou sur « Parties communes » -> charge commune, repartie selon la cle
 * @param {{ montant: number, lot: string|null, cle: string }} depense
 * @param {{ reference: string, quote_part: number }[]} lots
 * @returns {Record<string, number>} part en CHF par reference de lot
 */
export function ventilerDepense(depense, lots) {
  const totalCentimes = versCentimes(depense.montant)
  const lotPrive = lots.find((lot) => lot.reference === depense.lot && estHabitable(lot))

  let centimes
  if (lotPrive) {
    centimes = lots.map((lot) => (lot === lotPrive ? totalCentimes : 0))
  } else {
    const poids = poidsSelonCle(lots, CLES_REPARTITION.includes(depense.cle) ? depense.cle : 'quote_part')
    if (!poids.some((p) => p > 0)) {
      throw new Error('Aucun lot avec une quote-part : impossible de ventiler la depense')
    }
    centimes = repartirCentimes(totalCentimes, poids)
  }

  return Object.fromEntries(lots.map((lot, index) => [lot.reference, versFrancs(centimes[index])]))
}

/**
 * Rapprochement transaction (paiement) <-> facture (justificatif).
 * @param {{ montant: number, montantFacture: number|null|undefined }} transaction
 * @returns {'rapprochee'|'ecart'|'sans_justificatif'}
 */
export function statutRapprochement({ montant, montantFacture }) {
  if (montantFacture === null || montantFacture === undefined) return 'sans_justificatif'
  return versCentimes(montant) === versCentimes(montantFacture) ? 'rapprochee' : 'ecart'
}

/**
 * Decompte de charges par lot habitable pour un ensemble de depenses.
 * solde = charges - acomptes : positif = le coproprietaire doit payer,
 * negatif = la PPE doit lui rembourser.
 * @param {{
 *   depenses: { montant: number, categorie: string|null, lot: string|null, cle: string, montantFacture: number|null }[],
 *   acomptes: { lot: string, montant: number }[],
 *   lots: { reference: string, quote_part: number }[],
 * }} donnees
 */
export function calculerDecomptes({ depenses, acomptes, lots }) {
  const lotsHabitables = lots.filter(estHabitable)
  const cumul = new Map(
    lotsHabitables.map((lot) => [lot.reference, { chargesCentimes: 0, acomptesCentimes: 0, parCategorie: {} }]),
  )

  let totalCentimes = 0
  let nonRapprochees = 0
  let nonRapprocheesCentimes = 0

  for (const depense of depenses) {
    totalCentimes += versCentimes(depense.montant)
    if (statutRapprochement(depense) !== 'rapprochee') {
      nonRapprochees += 1
      nonRapprocheesCentimes += versCentimes(depense.montant)
    }

    const categorie = depense.categorie ?? 'Sans catégorie'
    const parts = ventilerDepense(depense, lotsHabitables)
    for (const [reference, part] of Object.entries(parts)) {
      const lot = cumul.get(reference)
      const partCentimes = versCentimes(part)
      if (partCentimes === 0) continue
      lot.chargesCentimes += partCentimes
      lot.parCategorie[categorie] = (lot.parCategorie[categorie] ?? 0) + partCentimes
    }
  }

  for (const acompte of acomptes) {
    const lot = cumul.get(acompte.lot)
    if (lot) lot.acomptesCentimes += versCentimes(acompte.montant)
  }

  return {
    totalDepenses: versFrancs(totalCentimes),
    lots: lotsHabitables.map((lot) => {
      const { chargesCentimes, acomptesCentimes, parCategorie } = cumul.get(lot.reference)
      return {
        reference: lot.reference,
        quote_part: Number(lot.quote_part),
        charges: versFrancs(chargesCentimes),
        acomptes: versFrancs(acomptesCentimes),
        solde: versFrancs(chargesCentimes - acomptesCentimes),
        parCategorie: Object.fromEntries(
          Object.entries(parCategorie).map(([categorie, centimes]) => [categorie, versFrancs(centimes)]),
        ),
      }
    }),
    avertissement:
      nonRapprochees === 0
        ? null
        : {
            nombre: nonRapprochees,
            montant: versFrancs(nonRapprocheesCentimes),
            message: `${nonRapprochees} dépense(s) non rapprochée(s) avec une facture : le décompte peut être incomplet ou inexact.`,
          },
  }
}
