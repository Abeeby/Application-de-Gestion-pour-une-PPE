import { Router } from 'express'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { calculerDecomptes, statutRapprochement } from './charges.calcul.js'
import { getAcomptesAnnee, getDepensesAnnee, getLotsAvecQuotePart } from './charges.repository.js'

export const chargesRouter = Router()

// --- KAN-22 : repartition des charges et rapprochement de comptes ---
// Reserve a l'administrateur.
chargesRouter.use(requireAuth, requireRole('admin'))

/** Lit ?annee=, annee en cours par defaut. Renvoie null si invalide. */
function lireAnnee(req) {
  if (req.query.annee === undefined) return new Date().getFullYear()
  const annee = Number(req.query.annee)
  return Number.isInteger(annee) && annee >= 2000 && annee <= 2100 ? annee : null
}

// Decompte de charges par lot : charges ventilees, acomptes verses, solde
chargesRouter.get('/decompte', async (req, res, next) => {
  try {
    const annee = lireAnnee(req)
    if (annee === null) return res.status(400).json({ erreurs: ['Annee invalide'] })

    const [depenses, acomptes, lots] = await Promise.all([
      getDepensesAnnee(annee),
      getAcomptesAnnee(annee),
      getLotsAvecQuotePart(),
    ])
    res.json({ annee, ...calculerDecomptes({ depenses, acomptes, lots }) })
  } catch (error) {
    next(error)
  }
})

// Rapprochement transactions <-> factures, avec le nombre par statut
chargesRouter.get('/rapprochement', async (req, res, next) => {
  try {
    const annee = lireAnnee(req)
    if (annee === null) return res.status(400).json({ erreurs: ['Annee invalide'] })

    const depenses = await getDepensesAnnee(annee)
    const transactions = depenses.map((depense) => ({ ...depense, statut: statutRapprochement(depense) }))
    const resume = { rapprochee: 0, ecart: 0, sans_justificatif: 0 }
    for (const transaction of transactions) resume[transaction.statut] += 1

    res.json({ annee, resume, transactions })
  } catch (error) {
    next(error)
  }
})
