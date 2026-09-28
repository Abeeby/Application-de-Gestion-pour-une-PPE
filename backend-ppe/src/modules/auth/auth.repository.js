import { pool } from '../../db/pool.js'

// Le role est porte par Appartenir (droits sur un immeuble), pas par
// Utilisateurs : voir le commentaire dans BD.sql. Cette application ne gere
// qu'une seule PPE pour l'instant, donc on prend le premier rattachement.

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
     WHERE u.email = ?
     LIMIT 1`,
    [email],
  )

  return lignes[0] ?? null
}
