# Frontend PPE

Interface Next.js pour la gestion financière d'une PPE. Le backend Express
et MySQL/MariaDB doivent être disponibles pour consulter les données.

## Démarrage

Depuis le dossier `frontend-ppe` :

```bash
npm install
npm run dev
```

Ouvrir http://localhost:3000 et se connecter avec un compte existant.
Le rôle administrateur ou copropriétaire provient du backend.

L'API est appelée sur `http://localhost:3001` par défaut. Pour utiliser une
autre adresse, définir `NEXT_PUBLIC_API_URL` dans `.env.local`, puis
redémarrer le frontend :

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:3001
```

La configuration et les comptes de démonstration sont décrits dans le
[README du backend](../backend-ppe/README.md).

## Pages

| Adresse | Fonction |
|---|---|
| `/` | Connexion et tableau de bord |
| `/saisie` | Saisie des dépenses |
| `/revenus` | Saisie et import des revenus |
| `/historique` | Comparaison des dépenses entre exercices |
| `/projets` | Suivi des projets |
| `/electricite` | Production photovoltaïque |
| `/charges` | Répartition des charges et rapprochement |
| `/statistiques` | Graphiques financiers |
| `/rapports` | Rapports budgétaires et exports CSV, réservés à l'administrateur |

## KAN-23 : rapports et exports

1. Se connecter en administrateur depuis le tableau de bord.
2. Ouvrir **Rapports** dans le menu.
3. Choisir la période (mensuelle, trimestrielle ou annuelle), l'année et,
   selon la période, le mois ou le trimestre.
4. Cliquer sur **Générer le rapport**.
5. Consulter les totaux, le suivi du budget annuel et les transactions.
6. Utiliser les boutons d'export des transactions CSV, de synthèse CSV ou
   d'impression du rapport.

Le budget reste annuel ; les dépenses cumulées vont du 1er janvier à la
fin de la période choisie. Sans budget, les mouvements restent visibles,
mais les montants budgétaires sont indiqués comme non définis.

Si la période est changée après une génération, il faut générer un nouveau
rapport. Les exports concernent la période du rapport affiché et relisent
ses données actuelles en base. Les CSV s'ouvrent dans un tableur et peuvent
être importés dans un outil comptable en associant les colonnes.

L'impression masque les contrôles, utilise le format A4 paysage et répète
les en-têtes des tableaux qui continuent sur plusieurs pages. Les exports
dédiés PDF et Excel relèvent de KAN-31.

## Vérification

```bash
npm run build
```

Les tests de calcul, d'export et d'accès aux rapports se trouvent dans
`backend-ppe/src/modules/rapports`. Voir leurs commandes dans le
[README du backend](../backend-ppe/README.md#kan-23--rapports-périodiques-et-export-comptable).
