'use client'

// Role de l'utilisateur connecte, lu une fois par page via GET /api/auth/me.
// null tant que la reponse n'est pas arrivee (ou si personne n'est connecte) :
// les pages n'affichent alors ni les formulaires ni les boutons d'action,
// pour eviter qu'ils apparaissent une fraction de seconde puis disparaissent.

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'

export type Role = 'admin' | 'owner'
export type Utilisateur = { id: number; name: string; email: string; role: Role }

export function useUtilisateur(): Utilisateur | null {
  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null)

  useEffect(() => {
    let actif = true
    apiFetch('/api/auth/me')
      .then(async (reponse) => {
        if (!reponse.ok || !actif) return
        const { user } = await reponse.json()
        setUtilisateur(user)
      })
      .catch(() => {
        // Pas connecte : la page affiche deja son propre message
      })
    return () => {
      actif = false
    }
  }, [])

  return utilisateur
}
