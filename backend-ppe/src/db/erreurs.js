// Traduit les erreurs MySQL/MariaDB connues en reponses HTTP claires.
//
// Sans ce fichier, toute erreur SQL donnait "Erreur interne du serveur" (500),
// meme quand la cause est connue et que l'utilisateur peut agir.
// Les codes viennent de mysql2 (error.code).

// Donnee refusee par la base (trop longue, hors limites, mal formee) : c'est
// la requete qui est en cause, pas le serveur -> 400. La validation des
// modules devrait les arreter avant ; ceci est un filet de securite.
const DONNEES_INVALIDES = new Set([
  'ER_DATA_TOO_LONG',
  'ER_WARN_DATA_OUT_OF_RANGE',
  'ER_TRUNCATED_WRONG_VALUE',
  'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD',
  'WARN_DATA_TRUNCATED',
  'ER_BAD_NULL_ERROR',
  'ER_NO_REFERENCED_ROW_2',
])

// La structure de la base ne correspond pas au code : base creee avec une
// ancienne version de BD.sql.
const BASE_PAS_A_JOUR = new Set(['ER_NO_SUCH_TABLE', 'ER_BAD_FIELD_ERROR', 'ER_WRONG_VALUE_COUNT_ON_ROW'])

// Le serveur de base de donnees est injoignable ou refuse la connexion.
const BASE_INJOIGNABLE = new Set([
  'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'PROTOCOL_CONNECTION_LOST',
  'ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR', 'ER_CON_COUNT_ERROR',
])

/**
 * @param {{code?: string}} error
 * @returns {{status: number, corps: object} | null} null si l'erreur n'est pas reconnue
 */
export function reponsePourErreurSql(error) {
  const code = error?.code
  if (!code) return null

  if (DONNEES_INVALIDES.has(code)) {
    return { status: 400, corps: { error: 'Une valeur envoyée est invalide ou trop longue.', erreurs: ['Une valeur envoyée est invalide ou trop longue.'] } }
  }
  if (code === 'ER_DUP_ENTRY') {
    return { status: 409, corps: { error: 'Cet élément existe déjà.', erreurs: ['Cet élément existe déjà.'] } }
  }
  if (BASE_PAS_A_JOUR.has(code)) {
    return {
      status: 500,
      corps: {
        error: 'La base de données n’est pas à jour. Recréez-la avec BD.sql puis npm run seed (voir le README).',
        code,
      },
    }
  }
  if (BASE_INJOIGNABLE.has(code)) {
    return {
      status: 503,
      corps: { error: 'La base de données est injoignable. Vérifiez que MySQL/MariaDB est démarré et le fichier .env.', code },
    }
  }
  return null
}
