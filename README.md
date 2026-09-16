## Application de Gestion pour une PPE

Créer une application web pour simplifier la gestion financière d'une Propriété par Étage (PPE). L'application doit permettre aux administrateurs et copropriétaires d'accéder aux comptes, budgets, dépenses (comme l'électricité), et statistiques financières.

---

## KAN-19 : Module de saisie des dépenses

### User story

Saisie et enregistrement des dépenses : montant, date, catégorie, justificatif et appartement concerné.

### Fonctionnalités

- Formulaire de saisie d'une nouvelle dépense
- Validation des champs côté serveur avec messages d'erreur
- Tableau des dépenses déjà enregistrées
- Listes déroulantes alimentées par le serveur (catégories et appartements)

### Champs du formulaire

| Champ | Type | Obligatoire | Règle |
|-------|------|-------------|-------|
| Montant | nombre | oui | doit être supérieur à 0 |
| Date | date | oui | — |
| Catégorie | liste | oui | doit exister dans la liste |
| Appartement | liste | oui | doit exister dans la liste |
| Projet | liste | non | si renseigné, doit exister dans la liste (KAN-36) |
| Justificatif | texte | non | numéro de facture, ex. `FAC-2026-001` |

### API

**GET** `/api/saisies/options` — les listes à afficher dans le formulaire

```json
{
  "categories": ["Entretien", "Assurances", "..."],
  "appartements": ["A1", "A2", "A3", "B1", "B2", "B3", "Parties communes"],
  "projets": ["Rénovation toit", "Facade", "Ascenseur", "..."]
}
```

**GET** `/api/saisies` — la liste des dépenses enregistrées

**POST** `/api/saisies` — enregistre une dépense

Corps de la requête :

```json
{
  "montant": 1500,
  "date": "2026-09-01",
  "categorie": "Entretien",
  "appartement": "A1",
  "projet": "Rénovation toit",
  "justificatif": "FAC-2026-001"
}
```

Réponse `201` si tout va bien, `400` avec la liste des erreurs sinon :

```json
{ "erreurs": ["Le montant doit etre un nombre superieur a 0"] }
```

### Limite connue

Les dépenses sont gardées en mémoire du serveur : elles disparaissent au redémarrage du backend. Le projet n'a pas encore de base de données.

---

## KAN-36 : Association dépense ↔ projet et appartement

### User story

En tant que copropriétaire ou administrateur, je veux enregistrer une dépense rattachée à un projet spécifique ou à un appartement concerné, afin d'assurer un suivi détaillé des coûts.

### Fonctionnalités

- Ajout d'un champ « Projet » (optionnel) au formulaire de saisie KAN-19, en complément de l'appartement (déjà présent)
- Liste déroulante des projets alimentée par le serveur (`GET /api/saisies/options`)
- Ajout de `Transactions.id_lot` dans `backend-ppe/BD.sql`, pour permettre à terme de rattacher une dépense réelle à un lot précis en base (nullable : une charge commune n'a pas de lot)

### Tests validants (`backend-ppe/saisies.test.js`)

- `refuse un appartement qui n existe pas` — l'appartement reste obligatoire
- `refuse un projet qui n existe pas` — un projet fourni doit exister dans la liste
- `accepte une depense sans projet` — le rattachement au projet est optionnel
- `ajouterSaisie garde tous les champs de la depense` — vérifie que `projet` et `appartement` sont bien conservés sur la dépense enregistrée

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

### API

**GET** `/api/depenses/historique`

Paramètres de requête :

| Paramètre    | Type   | Défaut | Description               |
| ------------ | ------ | ------ | ------------------------- |
| `anneeDebut` | number | 2022   | Première année à afficher |
| `anneeFin`   | number | 2025   | Dernière année à afficher |

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

---

## Structure des fichiers

```
backend-ppe/            API Express (port 3001)
  index.js              Routes de l'application
  saisies.js            KAN-19 : validation et enregistrement des dépenses
  saisies.test.js       KAN-19 : tests

frontend-ppe/           Application Next.js (port 3000)
  app/
    page.tsx            Connexion et tableau de bord (KAN-12)
    saisie/
      page.tsx          KAN-19 : formulaire de saisie
    historique/
      page.tsx          KAN-29 : filtres et tableau comparatif
```

### Catégories disponibles

Entretien, Assurances, Nettoyage, Eau & Electricite, Administration, Reparations

---

## Lancer le projet

Le backend et le frontend doivent tourner en même temps, dans deux terminaux séparés.

**Terminal 1 — Backend** (port 3001)

```bash
cd backend-ppe
npm install
npm start
```

**Terminal 2 — Frontend** (port 3000)

```bash
cd frontend-ppe
npm install
npm run dev
```

Les pages sont ensuite accessibles à ces adresses :

| Page | Adresse |
|------|---------|
| Connexion et tableau de bord | http://localhost:3000 |
| Saisie des dépenses | http://localhost:3000/saisie |
| Historique des dépenses | http://localhost:3000/historique |

---

## Lancer les tests

Les tests utilisent le testeur intégré de Node, il n'y a aucune librairie à installer.

```bash
cd backend-ppe
npm test
```

Le serveur ne doit pas déjà tourner, sinon le port 3001 est occupé.

---

## prototype PPE

lien: https://www.figma.com/proto/VLnF9yMvQWJWMkNjw85VOY/Untitled?node-id=0-1&t=gHqj4aeOhw9YSFcC-1
