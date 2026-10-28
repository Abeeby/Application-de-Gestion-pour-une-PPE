import { pool } from '../../db/pool.js'
import { ID_PPE_DEFAUT } from '../../config/constants.js'

// Le role est porte par Appartenir (droits sur un immeuble), pas par
// Utilisateurs : voir le commentaire dans BD.sql. Cette application ne gere
// qu'une seule PPE pour l'instant : on lit le role sur CETTE PPE (avant, le
// premier rattachement trouve, peut-etre celui d'une autre PPE).

/**
 * Cherche un utilisateur par email et renvoie son hash de mot de passe et son
 * role sur la PPE. Renvoie null si l'email est inconnu.
 * @param {string} email
 */
export async function trouverUtilisateurParEmail(email) {
  const [lignes] = await pool.query(
    `SELECT u.id, u.nom, u.prenom, u.email, u.mot_de_passe, a.role, a.id_ppe
     FROM Utilisateurs u
     JOIN Appartenir a ON a.id_utilisateur = u.id
     WHERE u.email = ? AND a.id_ppe = ?
     LIMIT 1`,
    [email, ID_PPE_DEFAUT],
  )

  return lignes[0] ?? null
}
