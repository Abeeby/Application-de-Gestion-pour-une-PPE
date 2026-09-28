import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PPE Gestion',
  description: 'Application de gestion financière d’une PPE',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      {/* suppressHydrationWarning : certaines extensions navigateur (ColorZilla, Grammarly...)
          injectent des attributs sur <body> avant l'hydratation React (ex: cz-shortcut-listen).
          Ca declenche un warning d'hydratation inoffensif qu'on ignore volontairement ici. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
