'use client'

// Menu lateral commun a toutes les pages.
//
// Avant : chaque page avait sa propre copie du menu, avec des liens
// differents, des couleurs differentes, et un bouton "Deconnexion" qui
// ne supprimait pas le token. Maintenant il n'y a plus qu'un seul menu :
//   - la page active est detectee automatiquement (usePathname) ;
//   - les liens reserves a l'administrateur sont masques pour un
//     coproprietaire (role lu depuis GET /api/auth/me) ;
//   - "Deconnexion" efface vraiment la session.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Activity,
  BarChart2,
  Calculator,
  FileSpreadsheet,
  FileText,
  Filter,
  Folder,
  History,
  LayoutDashboard,
  LogOut,
  PiggyBank,
  Wallet,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { apiFetch, supprimerToken } from '@/lib/api'

type Role = 'admin' | 'owner'

type Lien = {
  href: string
  libelle: string
  icone: LucideIcon
  adminSeulement?: boolean
}

const GROUPES: { titre: string; liens: Lien[] }[] = [
  {
    titre: 'Vue d’ensemble',
    liens: [
      { href: '/', libelle: 'Tableau de bord', icone: LayoutDashboard },
      { href: '/tableau-de-bord', libelle: 'Explorer les finances', icone: Filter },
      { href: '/statistiques', libelle: 'Statistiques', icone: Activity },
      { href: '/historique', libelle: 'Historique', icone: BarChart2 },
    ],
  },
  {
    titre: 'Saisie',
    liens: [
      { href: '/saisie', libelle: 'Dépenses', icone: FileText },
      { href: '/revenus', libelle: 'Revenus', icone: Wallet },
      { href: '/electricite', libelle: 'Électricité', icone: Zap },
    ],
  },
  {
    titre: 'Gestion',
    liens: [
      { href: '/projets', libelle: 'Projets', icone: Folder },
      { href: '/budgets', libelle: 'Budgets', icone: PiggyBank },
      { href: '/charges', libelle: 'Charges', icone: Calculator, adminSeulement: true },
      { href: '/rapports', libelle: 'Rapports', icone: FileSpreadsheet, adminSeulement: true },
      { href: '/modifications', libelle: 'Journal', icone: History },
    ],
  },
]

type Props = {
  /** Appele apres la deconnexion (le tableau de bord remet son etat a zero). */
  onDeconnexion?: () => void
}

export default function MenuLateral({ onDeconnexion }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [role, setRole] = useState<Role | null>(null)
  const [nom, setNom] = useState('')

  useEffect(() => {
    let actif = true
    apiFetch('/api/auth/me')
      .then(async (reponse) => {
        if (!reponse.ok || !actif) return
        const { user } = await reponse.json()
        setRole(user.role)
        setNom(user.name)
      })
      .catch(() => {
        // Pas connecte : la page affiche deja son propre message.
      })
    return () => {
      actif = false
    }
  }, [])

  const seDeconnecter = () => {
    supprimerToken()
    onDeconnexion?.()
    router.push('/')
  }

  return (
    <aside className="hidden w-60 flex-shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col print:hidden">
      <div className="flex items-center gap-3 p-6">
        <div className="rounded-lg bg-blue-600 p-2 text-sm font-bold text-white">PPE</div>
        <div>
          <p className="text-sm font-bold leading-tight text-slate-900">PPE Gestion</p>
          <p className="text-xs text-slate-500">Les Terrasses, Lausanne</p>
        </div>
      </div>

      <nav className="flex-1 space-y-5 px-4 pb-4" aria-label="Menu principal">
        {GROUPES.map((groupe) => {
          const liens = groupe.liens.filter((lien) => !lien.adminSeulement || role === 'admin')
          return (
            <div key={groupe.titre}>
              <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{groupe.titre}</p>
              <div className="space-y-0.5">
                {liens.map(({ href, libelle, icone: Icone }) => {
                  const actif = pathname === href
                  return (
                    <Link
                      key={href}
                      href={href}
                      aria-current={actif ? 'page' : undefined}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                        actif ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Icone className="h-[18px] w-[18px]" /> {libelle}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      <div className="border-t border-slate-200 p-4">
        {role && (
          <div className="mb-3 px-3">
            <p className="truncate text-sm font-semibold text-slate-800">{nom}</p>
            <p className="text-xs text-slate-500">{role === 'admin' ? 'Administrateur' : 'Copropriétaire'}</p>
          </div>
        )}
        <button
          type="button"
          onClick={seDeconnecter}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
        >
          <LogOut className="h-[18px] w-[18px]" /> Déconnexion
        </button>
      </div>
    </aside>
  )
}
