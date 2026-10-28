// Bandeau montre a un coproprietaire a la place d'un formulaire de saisie :
// la saisie est reservee a l'administrateur (le serveur refuse avec 403).

export default function BandeauConsultation({ quoi }: { quoi: string }) {
  return (
    <div role="note" className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
      <p>
        <span className="font-semibold">Mode consultation (copropriétaire) :</span> vous pouvez consulter {quoi} ci-dessous.
        La saisie, l’import et la suppression sont réservés à l’administrateur de la PPE.
      </p>
    </div>
  )
}
