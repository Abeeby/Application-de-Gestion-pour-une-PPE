## Application de Gestion pour une PPE

Créer une application web pour simplifier la gestion financière d'une Propriété par Étage (PPE). L'application doit permettre aux administrateurs et copropriétaires d'accéder aux comptes, budgets, dépenses (comme l'électricité), et statistiques financières.

---

## KAN-29 : Historique pluriannuel et filtres

### User story

En tant qu'administrateur, je veux consulter l'historique des dépenses sur plusieurs années par catégorie, afin de comparer les exercices et de repérer les écarts.

### Fonctionnalités

- Affichage des dépenses par catégorie sur plusieurs années
- Filtres par année de début et année de fin
- Calcul automatique de l'écart en % entre chaque année
- Ligne de total avec écart global
- Code couleur : rouge pour une hausse, vert pour une baisse

### Structure du projet

```
backend-ppe/          API Express
  index.js            Données et route /api/depenses/historique

frontend-ppe/         Application Next.js
  app/
    page.tsx          Redirection vers /historique
    historique/
      page.tsx        Page avec les filtres et le tableau
```

### API

**GET** `/api/depenses/historique`

Paramètres de requête :

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `anneeDebut` | number | 2022 | Première année à afficher |
| `anneeFin` | number | 2025 | Dernière année à afficher |

Exemple :

```
http://localhost:3001/api/depenses/historique?anneeDebut=2023&anneeFin=2025
```

Réponse :

```json
[
  { "annee": 2023, "categorie": "Entretien", "montant": 13100 },
  { "annee": 2023, "categorie": "Assurances", "montant": 9200 }
]
```

### Catégories disponibles

Entretien, Assurances, Nettoyage, Eau & Electricite, Administration, Reparations

### Lancer le projet

Le backend et le frontend doivent tourner en même temps, dans deux terminaux séparés.

**Terminal 1 — Backend** (port 3001)

```bash
cd backend-ppe
npm install
node index.js
```

**Terminal 2 — Frontend** (port 3000)

```bash
cd frontend-ppe
npm install
npm run dev
```

Puis ouvrir http://localhost:3000
