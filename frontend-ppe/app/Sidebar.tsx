'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Folder, Zap, BarChart2, Briefcase, FileText, Users, Settings, LogOut } from 'lucide-react'

// Liens sans icône = sous-liens (affichés en retrait)
const liens = [
  { href: '/', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/comptabilite', label: 'Comptabilité', icon: Folder },
  { href: '/comptabilite/budget', label: 'Budget annuel' },
  { href: '/saisie', label: 'Saisie dépenses' },
  { href: '/revenus', label: 'Saisie revenus' },
  { href: '/historique', label: 'Historique' },
  { href: '/electricite', label: 'Électricité', icon: Zap },
  { href: '/statistiques', label: 'Statistiques', icon: BarChart2 },
  { href: '/projets', label: 'Projets', icon: Briefcase },
  { href: '/appels-offres', label: "Appels d'offres", icon: FileText },
  { href: '/coproprietaires', label: 'Copropriétaires', icon: Users },
]

function deconnexion() {
  localStorage.removeItem('ppe_token')
  window.location.href = '/'
}

export default function Sidebar() {
  const pathname = usePathname()

  const style = (href: string) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
      pathname === href ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
    }`

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col gap-6 border-r border-slate-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-blue-600 p-2 text-sm font-bold text-white">PPE</div>
        <div>
          <p className="font-bold leading-tight">PPE Gestion</p>
          <p className="text-xs text-slate-500">Gestion de copropriété</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto">
        {liens.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={`${style(href)} ${Icon ? '' : 'ml-8 py-1.5 text-xs'}`}>
            {Icon && <Icon className="h-4 w-4" />} {label}
          </Link>
        ))}
      </nav>

      <div className="space-y-1 border-t border-slate-200 pt-4">
        <Link href="/parametres" className={style('/parametres')}>
          <Settings className="h-4 w-4" /> Paramètres
        </Link>
        <button onClick={deconnexion} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50">
          <LogOut className="h-4 w-4" /> Déconnexion
        </button>
      </div>
    </aside>
  )
}
