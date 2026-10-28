// Recree la base PPE depuis BD.sql, puis remet les donnees de demonstration.
//   npm run reset-db
//
// Une seule commande a la place de « mysql -u root -p < BD.sql » puis
// « npm run seed ». Avantages pour l'equipe :
// - marche aussi dans PowerShell, qui refuse le « < » de la commande mysql ;
// - pas besoin que le client mysql soit installe ni dans le PATH ;
// - utilise les identifiants deja mis dans backend-ppe/.env.
//
// ATTENTION : efface TOUTES les donnees de la base PPE (developpement seulement).

import { readFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import mysql from 'mysql2/promise'
import { env, verifierEnv } from '../config/env.js'

const CHEMIN_BD_SQL = fileURLToPath(new URL('../../BD.sql', import.meta.url))
const CHEMIN_SEED = fileURLToPath(new URL('./seed.js', import.meta.url))

/**
 * Nom de la base que BD.sql cree (ligne « CREATE DATABASE ... »).
 * @param {string} sql contenu de BD.sql
 * @returns {string | null}
 */
export function nomBaseCreeeParBdSql(sql) {
  const resultat = sql.match(/CREATE\s+DATABASE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?([A-Za-z0-9_]+)`?/i)
  return resultat ? resultat[1] : null
}

/**
 * Verifie que .env vise bien la base que BD.sql recree. Sinon le seed
 * remplirait une autre base que celle qui vient d'etre recreee.
 * @returns {string | null} message d'erreur, ou null si tout va bien
 */
export function controlerNomBase(sql, nomDansEnv) {
  const nomBdSql = nomBaseCreeeParBdSql(sql)
  if (!nomBdSql) return 'BD.sql ne contient pas de ligne CREATE DATABASE : fichier inattendu, rien n a ete fait.'
  if (nomBdSql.toLowerCase() !== String(nomDansEnv).toLowerCase()) {
    return `BD.sql cree la base "${nomBdSql}" mais .env indique DB_DATABASE=${nomDansEnv}. Mettez DB_DATABASE=${nomBdSql} dans .env, rien n a ete fait.`
  }
  return null
}

function lancerSeed() {
  return new Promise((resoudre) => {
    const enfant = spawn(process.execPath, [CHEMIN_SEED], { stdio: 'inherit' })
    enfant.on('close', (code) => resoudre(code ?? 1))
  })
}

async function reset() {
  verifierEnv()
  const sql = await readFile(CHEMIN_BD_SQL, 'utf8')
  const probleme = controlerNomBase(sql, env.db.database)
  if (probleme) throw new Error(probleme)

  console.log(`Base ${env.db.database} sur ${env.db.host}:${env.db.port} : suppression puis recreation avec BD.sql...`)
  // Pas d'option « database » : BD.sql supprime puis recree la base lui-meme.
  const connexion = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    charset: 'utf8mb4', // les ENUM contiennent des accents (ex. 'Terminé')
    multipleStatements: true, // BD.sql contient plusieurs requetes
  })
  try {
    await connexion.query(sql)
  } finally {
    await connexion.end()
  }
  console.log('Tables recreees. Ajout des donnees de demonstration...')

  const code = await lancerSeed()
  if (code !== 0) throw new Error('le seed a echoue (voir le message juste au-dessus).')
  console.log('')
  console.log('Base prete. Relancez le backend (npm start) s il tournait deja.')
}

// Lance reset() seulement si ce fichier est execute directement (pas quand
// un test l'importe pour verifier controlerNomBase).
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  reset().catch((error) => {
    console.error('')
    console.error(`La remise a zero de la base a echoue : ${error.message}`)
    if (error.code === 'ECONNREFUSED') console.error('MySQL/MariaDB ne repond pas : est-il demarre ?')
    if (error.code === 'ER_ACCESS_DENIED_ERROR') console.error('Identifiants refuses : verifiez DB_USER et DB_PASSWORD dans .env.')
    process.exit(1)
  })
}
