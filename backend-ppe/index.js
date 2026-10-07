import express from 'express'
import { env } from './src/config/env.js'
import { verifierConnexionDb } from './src/db/pool.js'
import { authRouter } from './src/modules/auth/auth.routes.js'
import { projetsRouter } from './src/modules/projets/projets.routes.js'
import { depensesRouter } from './src/modules/depenses/depenses.routes.js'
import { revenusRouter } from './src/modules/revenus/revenus.routes.js'
import { electriciteRouter } from './src/modules/electricite/electricite.routes.js'
import { depensesHistoriqueRouter, financialRouter } from './src/modules/financial/financial.routes.js'
import { chargesRouter } from './src/modules/charges/charges.routes.js'
import { historiqueRouter } from './src/modules/historique/historique.routes.js'

const app = express()

const allowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000']

app.use((req, res, next) => {
  const origin = req.headers.origin

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204)
  }

  next()
})

app.use(express.json())

app.get('/api/health', async (req, res) => {
  const dbOk = await verifierConnexionDb()
  res.status(dbOk ? 200 : 503).json({
    status: dbOk ? 'ok' : 'degraded',
    app: 'ppe-backend',
    database: dbOk ? 'connected' : 'unreachable',
    time: new Date().toISOString(),
  })
})

app.use('/api/auth', authRouter)
app.use('/api/projets', projetsRouter)
app.use('/api/saisies', depensesRouter)
app.use('/api/revenus', revenusRouter)
app.use('/api/electricite', electriciteRouter)
app.use('/api/financial', financialRouter)
app.use('/api/depenses', depensesHistoriqueRouter)
app.use('/api/charges', chargesRouter)
app.use('/api/historique', historiqueRouter)

// Gestionnaire d'erreurs centralise : toute erreur inattendue (SQL, etc.)
// remonte ici via next(error) plutot que de faire planter le process.
app.use((error, req, res, next) => {
  console.error(error)
  console.log("test")
 
  res.status(500).json({
    error: 'Erreur interne du serveur',
    ...(env.isDev && {
      detail: {
        message: error.message,
        code: error.code, // ex: ER_NO_SUCH_TABLE, ER_BAD_FIELD_ERROR (mysql2)
        sqlMessage: error.sqlMessage,
        stack: error.stack,
      },
    }),
  })
})
 

app.listen(env.port, async () => {
  console.log(`PPE backend running on http://localhost:${env.port}`)
  const dbOk = await verifierConnexionDb()
  if (!dbOk) {
    console.warn('Attention : la base de donnees est injoignable. Verifiez votre fichier .env et que MySQL/MariaDB tourne.')
  } else {
    console.log('Connexion a la base de donnees OK.')
  }
})
