import { Router } from 'express'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { definirPeriode } from './rapports.calcul.js'
import { genererRapport } from './rapports.repository.js'
import { exporterSyntheseCsv, exporterTransactionsCsv } from './rapports.export.js'

export const rapportsRouter = Router()
rapportsRouter.use(requireAuth, requireRole('admin'))

rapportsRouter.get('/', async (req, res, next) => {
  let periode
  try { periode = definirPeriode(req.query) }
  catch (erreur) { return res.status(400).json({ error: erreur.message }) }
  try { res.json(await genererRapport(periode)) }
  catch (erreur) { next(erreur) }
})

rapportsRouter.get('/export', async (req, res, next) => {
  let periode
  try { periode = definirPeriode(req.query) }
  catch (erreur) { return res.status(400).json({ error: erreur.message }) }
  const contenu = req.query.contenu ?? 'transactions'
  if (!['transactions', 'synthese'].includes(contenu)) {
    return res.status(400).json({ error: 'Le contenu doit être transactions ou synthese' })
  }
  try {
    const rapport = await genererRapport(periode)
    const csv = contenu === 'synthese' ? exporterSyntheseCsv(rapport) : exporterTransactionsCsv(rapport)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="ppe-${contenu}-${periode.dateDebut}-${periode.dateFin}.csv"`)
    res.send(csv)
  } catch (erreur) { next(erreur) }
})
