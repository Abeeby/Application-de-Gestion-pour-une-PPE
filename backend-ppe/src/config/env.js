// Chargement et validation des variables d'environnement
// Toutes les valeurs sensibles (mot de passe DB, etc.) viennent de .env,
// jamais codees en dur dans le code source.
//
// Important : ce fichier ne leve PLUS d'erreur au simple import. Sinon, un
// test unitaire qui importe (meme indirectement) le pool MySQL plantait sur
// une machine sans .env, alors qu'il ne touche jamais a la base.
// La verification stricte est faite par verifierEnv(), appelee au demarrage
// du serveur (index.js) et du seed : ces deux-la ont vraiment besoin de la DB.

import 'dotenv/config'

// DB_HOST n'en fait pas partie : il vaut 'localhost' par defaut.
const VARIABLES_OBLIGATOIRES = ['DB_USER', 'DB_DATABASE']

export const env = {
  port: Number(process.env.PORT ?? 3001),
  isDev: process.env.NODE_ENV !== 'production',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? '',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_DATABASE ?? '',
  },
  auth: {
    // Duree de validite du token de session, en millisecondes (1h par defaut)
    tokenTtlMs: Number(process.env.TOKEN_TTL_MS ?? 60 * 60 * 1000),
  },
}

/**
 * Verifie que toutes les variables necessaires a la connexion DB existent.
 * A appeler une seule fois, au demarrage d'un programme qui utilise la base.
 * @throws {Error} liste des variables manquantes (voir .env.example)
 */
export function verifierEnv() {
  const manquantes = VARIABLES_OBLIGATOIRES.filter((nom) => !process.env[nom])

  if (manquantes.length > 0) {
    throw new Error(`Variable(s) d'environnement manquante(s) : ${manquantes.join(', ')} (voir .env.example)`)
  }
}
