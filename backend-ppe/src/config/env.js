// Chargement et validation des variables d'environnement
// Toutes les valeurs sensibles (mot de passe DB, etc.) viennent de .env,
// jamais codees en dur dans le code source.

import 'dotenv/config'

function requireEnv(name, fallback) {
  const value = process.env[name] ?? fallback
  if (value === undefined || value === '') {
    throw new Error(`Variable d'environnement manquante : ${name} (voir .env.example)`)
  }
  return value
}

export const env = {
  port: Number(process.env.PORT ?? 3001),
  db: {
    host: requireEnv('DB_HOST', 'localhost'),
    port: Number(process.env.DB_PORT ?? 3306),
    user: requireEnv('DB_USER'),
    password: process.env.DB_PASSWORD ?? '',
    database: requireEnv('DB_DATABASE'),
  },
  auth: {
    // Duree de validite du token de session, en millisecondes (1h par defaut)
    tokenTtlMs: Number(process.env.TOKEN_TTL_MS ?? 60 * 60 * 1000),
  },
}
