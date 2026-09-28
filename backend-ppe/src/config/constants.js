// L'application ne gere qu'un seul immeuble (PPE) pour l'instant : toutes
// les requetes filtrent sur cet identifiant. Le schema supporte plusieurs
// PPE (table PPE, Appartenir en N-N) ; le jour ou l'app devient multi-immeuble,
// cette constante disparaitra au profit d'un id_ppe pris sur l'utilisateur
// connecte (via Appartenir) ou dans l'URL.
export const ID_PPE_DEFAUT = 1
