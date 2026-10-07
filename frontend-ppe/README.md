This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## KAN-28 : tableau de bord interactif

Page `/tableau-de-bord`, accessible depuis le tableau de bord principal après
connexion (administrateur ou copropriétaire).

- Filtres combinables : année, catégorie, appartement, projet.
- Totaux en CHF, dépenses par catégorie, évolution mensuelle et transactions
  recalculés sur les mêmes lignes filtrées.
- Réinitialisation des filtres et actualisation des données.
- Données des API existantes `/api/saisies`, `/api/revenus` et de leurs options.
  Les revenus n'ont pas de projet : un filtre projet ne garde que les dépenses
  rattachées, avec une explication dans la page.
- Les années proviennent des transactions, sans liste d'années fixe.
- Les montants sont additionnés en centimes dans `app/tableau-de-bord/calculs.ts`.

Le backend et MySQL doivent fonctionner pour charger les données. Une erreur
de connexion est affichée avec un bouton pour réessayer.

Tests des filtres et calculs (Node 24) : `npm test` dans `frontend-ppe`.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
