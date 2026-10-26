// KAN-12 : appels a l'API du backend avec la session de l'utilisateur.
//
// Depuis la securisation du backend, toutes les routes de donnees exigent
// l'en-tete "Authorization: Bearer <token>". Plutot que de recopier ce code
// dans chaque page, les pages passent par apiFetch(), qui :
//   1. ajoute automatiquement le token sauvegarde a la connexion ;
//   2. si le backend repond 401 (pas connecte, token expire ou invalide),
//      efface le token et leve une SessionExpireeError que la page affiche.

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

// Meme cle que celle utilisee par le tableau de bord (app/page.tsx)
const CLE_TOKEN = 'ppe_token'

export class SessionExpireeError extends Error {
  constructor() {
    super('Vous devez vous connecter (ou votre session a expiré).')
    this.name = 'SessionExpireeError'
  }
}

export function lireToken(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(CLE_TOKEN)
}

export function enregistrerToken(token: string) {
  window.localStorage.setItem(CLE_TOKEN, token)
}

export function supprimerToken() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(CLE_TOKEN)
}

/**
 * fetch() vers le backend, avec le token de session.
 * @param chemin ex. '/api/saisies' (sans l'adresse du serveur)
 * @throws SessionExpireeError si le backend repond 401
 */
export async function apiFetch(chemin: string, options: RequestInit = {}): Promise<Response> {
  const token = lireToken()
  const headers = new Headers(options.headers)

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const reponse = await fetch(`${API_URL}${chemin}`, { ...options, headers })

  if (reponse.status === 401) {
    supprimerToken()
    throw new SessionExpireeError()
  }

  return reponse
}

/** Message a afficher a l'utilisateur pour une erreur d'appel API. */
export function messageErreur(erreur: unknown): string {
  if (erreur instanceof SessionExpireeError) return erreur.message
  return 'Le backend est indisponible'
}
