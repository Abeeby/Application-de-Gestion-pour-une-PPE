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

/**
 * Execute `travail(connexion)` dans une transaction SQL : tout est valide
 * ensemble, ou tout est annule si une requete echoue. Utilise par KAN-35 pour
 * qu'une operation ne soit jamais enregistree sans sa ligne d'historique.
 * @param {(connexion: import('mysql2/promise').PoolConnection) => Promise<T>} travail
 * @param {{getConnection: Function}} [source] pool a utiliser (remplace dans les tests)
 * @returns {Promise<T>}
 * @template T
 */
export async function avecTransaction(travail, source = pool) {
  const connexion = await source.getConnection()
  try {
    await connexion.beginTransaction()
    const resultat = await travail(connexion)
    await connexion.commit()
    return resultat
  } catch (error) {
    await connexion.rollback()
    throw error
  } finally {
    connexion.release()
  }
}
