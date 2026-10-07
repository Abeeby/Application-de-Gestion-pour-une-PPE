import { Router } from 'express'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { lireAnnee } from '../financial/financial.calcul.js'
import { getHistoriqueDepenses } from '../financial/financial.repository.js'
import { getLotsAvecQuotePart } from '../charges/charges.repository.js'
import { getCategoriesParType } from '../reference/reference.repository.js'
import {
  LIBELLES_STATUT,
  actionsPossibles,
  anneesDeReference,
  appliquerTransition,
  estModifiable,
  genererProposition,
  repartirBudgetParLot,
  validerLignes,
} from './budgets.calcul.js'
import { changerStatut, creerBrouillon, listerBudgets, mettreAJourBudget, trouverBudget } from './budgets.repository.js'

// --- KAN-15 : creation et approbation du budget annuel ---
//
// Lecture  : administrateur et coproprietaire (chacun voit sa part). Un
//            brouillon est du travail interne : le coproprietaire ne le voit
//            qu'une fois soumis a l'assemblee.
// Ecriture : administrateur uniquement (generer, modifier, changer le statut)
//
//   GET  /api/budgets                    liste des budgets
//   GET  /api/budgets/:annee             detail + repartition par lot
//   POST /api/budgets/:annee/generer     brouillon calcule depuis l'historique
//   PUT  /api/budgets/:annee             modifier lignes / enveloppe (brouillon)
//   POST /api/budgets/:annee/transition  { action: soumettre|approuver|rejeter|retravailler }

export const budgetsRouter = Router()

budgetsRouter.use(requireAuth, requireRole('admin', 'owner'))

const arrondir = (montant) => Math.round(montant * 100) / 100

async function propositionDepuisHistorique(annee) {
  const annees = anneesDeReference(annee)
  const historique = await getHistoriqueDepenses(annees[0], annees[annees.length - 1])
  return { annees, proposition: genererProposition({ historique, annees }) }
}

/** Reponse complete renvoyee au frontend pour un budget. */
async function construireDetail(budget, utilisateur) {
  const [lots, { annees, proposition }] = await Promise.all([
    getLotsAvecQuotePart(),
    propositionDepuisHistorique(budget.annee),
  ])
  const moyennes = new Map(proposition.map((ligne) => [ligne.categorie, ligne.moyenneHistorique]))
  const totalLignes = arrondir(budget.lignes.reduce((total, ligne) => total + ligne.montant, 0))
  const estAdmin = utilisateur.role === 'admin'

  return {
    annee: budget.annee,
    statut: budget.statut,
    libelleStatut: LIBELLES_STATUT[budget.statut],
    enveloppe: budget.enveloppe,
    totalLignes,
    // Ecart enveloppe votee / total ventile : information utile, pas une erreur
    ecart: arrondir(budget.enveloppe - totalLignes),
    dateCreation: budget.dateCreation,
    dateApprobation: budget.dateApprobation,
    anneesReference: annees,
    lignes: budget.lignes.map((ligne) => ({ ...ligne, moyenneHistorique: moyennes.get(ligne.categorie) ?? 0 })),
    repartition: repartirBudgetParLot(budget.lignes, lots),
    actions: estAdmin ? actionsPossibles(budget.statut) : [],
    modifiable: estAdmin && estModifiable(budget.statut),
  }
}

/** Middleware : lit et valide :annee, sinon 400 */
function avecAnnee(req, res, next) {
  const annee = lireAnnee(req.params.annee)
  if (annee === null) return res.status(400).json({ error: 'Année invalide' })
  req.annee = annee
  next()
}

const visiblePour = (utilisateur, statut) => utilisateur.role === 'admin' || statut !== 'brouillon'

budgetsRouter.get('/', async (req, res, next) => {
  try {
    const budgets = await listerBudgets()
    res.json({ budgets: budgets.filter((budget) => visiblePour(req.user, budget.statut)) })
  } catch (error) {
    next(error)
  }
})

budgetsRouter.get('/:annee', avecAnnee, async (req, res, next) => {
  try {
    const budget = await trouverBudget(req.annee)
    if (!budget || !visiblePour(req.user, budget.statut)) {
      return res.status(404).json({ error: `Aucun budget pour ${req.annee}` })
    }
    res.json(await construireDetail(budget, req.user))
  } catch (error) {
    next(error)
  }
})

budgetsRouter.post('/:annee/generer', requireRole('admin'), avecAnnee, async (req, res, next) => {
  try {
    const existant = await trouverBudget(req.annee)
    if (existant && !estModifiable(existant.statut)) {
      return res.status(409).json({ error: `Le budget ${req.annee} est déjà ${LIBELLES_STATUT[existant.statut].toLowerCase()}` })
    }

    const { annees, proposition } = await propositionDepuisHistorique(req.annee)
    if (proposition.length === 0) {
      return res.status(422).json({
        error: `Aucune dépense entre ${annees[0]} et ${annees[annees.length - 1]} : impossible de générer une proposition`,
      })
    }

    const lignes = proposition.map(({ categorie, montant }) => ({ categorie, montant }))
    if (existant) {
      // Regenerer un brouillon : on remplace ses lignes, l'enveloppe ne bouge pas
      await mettreAJourBudget(existant.id, { lignes })
    } else {
      await creerBrouillon(req.annee, lignes)
    }

    res.status(existant ? 200 : 201).json(await construireDetail(await trouverBudget(req.annee), req.user))
  } catch (error) {
    next(error)
  }
})

budgetsRouter.put('/:annee', requireRole('admin'), avecAnnee, async (req, res, next) => {
  try {
    const budget = await trouverBudget(req.annee)
    if (!budget) return res.status(404).json({ error: `Aucun budget pour ${req.annee}` })
    if (!estModifiable(budget.statut)) {
      return res.status(409).json({ error: `Le budget ${req.annee} est ${LIBELLES_STATUT[budget.statut].toLowerCase()} : seul un brouillon est modifiable` })
    }

    const { lignes, enveloppe } = req.body ?? {}
    const erreurs = []

    if (lignes !== undefined) {
      erreurs.push(...validerLignes(lignes, await getCategoriesParType('depense')))
    }
    if (enveloppe !== undefined && (typeof enveloppe !== 'number' || !Number.isFinite(enveloppe) || enveloppe <= 0)) {
      erreurs.push('L’enveloppe doit être un nombre supérieur à 0')
    }
    if (lignes === undefined && enveloppe === undefined) {
      erreurs.push('Rien à modifier : envoyez « lignes » et/ou « enveloppe »')
    }
    if (erreurs.length > 0) return res.status(400).json({ erreurs })

    await mettreAJourBudget(budget.id, {
      lignes: lignes?.map((ligne) => ({ categorie: ligne.categorie.trim(), montant: ligne.montant })),
      enveloppe,
    })
    res.json(await construireDetail(await trouverBudget(req.annee), req.user))
  } catch (error) {
    next(error)
  }
})

budgetsRouter.post('/:annee/transition', requireRole('admin'), avecAnnee, async (req, res, next) => {
  try {
    const budget = await trouverBudget(req.annee)
    if (!budget) return res.status(404).json({ error: `Aucun budget pour ${req.annee}` })

    const action = req.body?.action
    const nouveauStatut = appliquerTransition(budget.statut, action)
    if (!nouveauStatut) {
      return res.status(409).json({
        error: `Action « ${action} » impossible depuis le statut « ${LIBELLES_STATUT[budget.statut]} »`,
        actionsPossibles: actionsPossibles(budget.statut),
      })
    }
    if (action === 'soumettre' && budget.lignes.length === 0) {
      return res.status(409).json({ error: 'Impossible de soumettre un budget sans ligne' })
    }

    await changerStatut(budget.id, nouveauStatut)
    res.json(await construireDetail(await trouverBudget(req.annee), req.user))
  } catch (error) {
    next(error)
  }
})
