// Pool de connexions MySQL/MariaDB partage par toute l'application.
// Un pool (plutot qu'une connexion unique) permet de gerer plusieurs
// requetes concurrentes sans se reconnecter a chaque fois.

import mysql from 'mysql2/promise'
import { env } from '../config/env.js'

export const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: true, // renvoie les DECIMAL SQL comme des number JS, pas des strings
  dateStrings: true, // renvoie les DATE SQL comme 'YYYY-MM-DD', pas des objets Date
})

/**
 * Verifie que la base est joignable. Utilise au demarrage et par /api/health.
 * @returns {Promise<boolean>}
 */
export async function verifierConnexionDb() {
  try {
    const connexion = await pool.getConnection()
    await connexion.ping()
    connexion.release()
    return true
  } catch (error) {
    console.error('Connexion a la base de donnees impossible :', error.message)
    return false
  }
}
