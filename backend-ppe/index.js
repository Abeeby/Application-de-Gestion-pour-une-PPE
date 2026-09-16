import express from 'express'
import { cors } from './middleware/cors.js'
import authRoutes from './routes/auth.routes.js'
import financialRoutes from './routes/financial.routes.js'
import historiqueRoutes from './routes/historique.routes.js'
import saisiesRoutes from './routes/saisies.routes.js'
import projetsRoutes from './routes/projets.routes.js'
import electriciteRoutes from './routes/electricite.routes.js'

const app = express()
const PORT = Number(process.env.PORT ?? 3001)

app.use(cors)
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'ppe-backend', time: new Date().toISOString() })
})

app.use('/api/auth', authRoutes)
app.use('/api/financial', financialRoutes)
app.use('/api/depenses', historiqueRoutes) // KAN-29
app.use('/api/saisies', saisiesRoutes) // KAN-19
app.use('/api/projets', projetsRoutes) // KAN-8 / KAN-37 / KAN-38
app.use('/api/electricite', electriciteRoutes)

app.listen(PORT, () => {
  console.log(`PPE backend running on http://localhost:${PORT}`)
})
