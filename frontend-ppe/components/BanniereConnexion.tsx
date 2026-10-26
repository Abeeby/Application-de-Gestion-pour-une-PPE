import Link from 'next/link'

// KAN-12 : bandeau affiche quand le backend refuse l'acces (401) parce que
// l'utilisateur n'est pas connecte ou que sa session a expire.
export default function BanniereConnexion() {
  return (
    <div
      role="alert"
      className="mb-6 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between"
    >
      <p>
        <span className="font-semibold">Connexion requise.</span> Vous n’êtes pas connecté ou votre session a expiré.
      </p>
      <Link
        href="/"
        className="inline-flex items-center justify-center rounded-xl bg-blue-700 px-4 py-2 font-semibold text-white transition hover:bg-blue-800"
      >
        Se connecter
      </Link>
    </div>
  )
}
