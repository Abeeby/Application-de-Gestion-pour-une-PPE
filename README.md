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

### Stockage

Depuis le refactor du 28.09 (PR #18), les dépenses sont enregistrées dans la base MySQL/MariaDB (table `Transactions`) et ne disparaissent plus au redémarrage du backend.

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

| Paramètre     | Type   | Défaut | Description                  |
| -------------- | ------ | ------- | ---------------------------- |
| `anneeDebut` | number | 2022    | Première année à afficher |
| `anneeFin`   | number | 2025    | Dernière année à afficher |

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

## KAN-37 : Gestion des droits sur les projets spécifiques

### User story

En tant que membre de la PPE (administrateur ou copropriétaire), je veux que l'accès aux projets spécifiques et aux actions de gestion soit contrôlé selon mon rôle, afin de garantir la sécurité des données et le respect de la gouvernance de la copropriété.

### Matrice de contrôle d'accès (RBAC)

| Action | Administrateur (`admin`) | Copropriétaire (`owner`) | Non authentifié |
|---|---|---|---|
| Consulter les projets (`GET /api/projets`) | ✅ Autorisé | ✅ Autorisé (Lecture seule) | ❌ 401 Non authentifié |
| Consulter le détail d'un projet (`GET /api/projets/:id`) | ✅ Autorisé | ✅ Autorisé (Lecture seule) | ❌ 401 Non authentifié |
| Vérifier ses droits (`GET /api/projets/droits`) | ✅ `{ canCreate: true, canEdit: true, canDelete: true }` | ✅ `{ canCreate: false, canEdit: false, canDelete: false }` | ❌ 401 Non authentifié |
| Créer un projet (`POST /api/projets`) | ✅ Autorisé (201) | ❌ 403 Accès refusé pour ce rôle | ❌ 401 Non authentifié |
| Modifier un projet (`PUT /api/projets/:id`) | ✅ Autorisé (200) | ❌ 403 Accès refusé pour ce rôle | ❌ 401 Non authentifié |
| Supprimer un projet (`DELETE /api/projets/:id`) | ✅ Autorisé (200) | ❌ 403 Accès refusé pour ce rôle | ❌ 401 Non authentifié |

### Fonctionnalités de gestion des droits

- Sécurisation des routes API avec les middlewares `requireAuth` et `requireRole('admin')`.
- Contrôle côté client dans l'interface (`frontend-ppe/app/projets/page.tsx`) :
  - **Administrateur** : affichage du badge « Administrateur (Droits complets) », accès au bouton « + Nouveau projet », aux boutons « Modifier » et « Supprimer », ainsi qu'au formulaire complet d'édition.
  - **Copropriétaire** : affichage du badge « Copropriétaire (Lecture seule) », bandeau explicatif de gouvernance, boutons de modification/création masqués ou désactivés avec mention explicite.
  - Sélecteur de rôle instantané dans l'en-tête permettant de basculer et tester immédiatement les deux comportements.

---

## KAN-22 : Répartition des charges et rapprochement de comptes

### User story

En tant qu'administrateur, je veux que chaque dépense soit automatiquement ventilée entre les copropriétaires (selon quote-part ou clé spécifique) et rapprochée des transactions bancaires, afin de générer des décomptes de charges fiables sans calcul manuel.

### Choix de conception (simplifications assumées)

- **Ventilation au lot** (pas jusqu'au copropriétaire).
- **Clé de répartition par catégorie** : colonne `Categories.cle_repartition` (`quote_part` par défaut, `egal` pour l'eau et l'électricité). Pas de table de clés.
- Une dépense rattachée à un lot habitable est imputée **100 %** à ce lot ; une dépense sans lot ou sur « Parties communes » est une **charge commune**.
- La quote-part est divisée par la **somme** des quote-parts (fonctionne en % comme en millièmes).
- Les montants sont calculés en **centimes** ; la somme des parts tombe toujours juste (méthode du plus fort reste).
- **Rapprochement** : chaque transaction est considérée comme une ligne du relevé ; on vérifie qu'elle correspond à sa facture (`id_facture`) → `rapprochee`, `ecart` (montants différents) ou `sans_justificatif`.
- Le décompte affiche un **avertissement** (sans bloquer) s'il reste des transactions non rapprochées.
- Acomptes = recettes de catégorie « Charges de copropriete » rattachées à un lot. Solde = charges − acomptes.

### API (rôle `admin` uniquement, sinon 403)

- **GET** `/api/charges/decompte?annee=2026` — décompte par lot (`charges`, `acomptes`, `solde`, `parCategorie`), `totalDepenses`, `avertissement`
- **GET** `/api/charges/rapprochement?annee=2026` — transactions avec leur `statut` et un `resume` par statut

### Page

http://localhost:3000/charges (se connecter d'abord en admin sur le tableau de bord)

### Tests d'acceptation

| # | Scénario | Type |
|---|---|---|
| 1 | Dépense commune de 1000 CHF → 166.70 ×5 et 166.50 (B3) | Auto |
| 2 | 10 CHF en parts égales sur 3 lots → 3.34 + 3.33 + 3.33 | Auto |
| 3 | Dépense sur le lot A2 → 100 % A2 ; sur « Parties communes » → ventilée | Auto |
| 4 | Catégorie à clé `egal` → parts égales | Auto |
| 5–7 | Statuts `rapprochee` / `ecart` / `sans_justificatif` | Auto |
| 8 | Décompte : charges − acomptes = solde, avertissement si non rapproché | Auto |
| 9 | API : total des lots = total des dépenses ; 403 non-admin, 401 sans token | Auto (base + seed requis, sinon sauté) |
| 10 | Refaire 3 dépenses à la main dans Excel → mêmes montants au centime | Manuel |
| 11 | Page `/charges` lisible : décompte par lot, détail par catégorie, statuts | Manuel |

Fichiers : `backend-ppe/src/modules/charges/charges.calcul.test.js` (1–8) et `charges.integration.test.js` (9).

---

## Structure des fichiers

```
backend-ppe/                 API Express (port 3001) branchée sur MySQL/MariaDB
  index.js                   assemblage de l'app (middlewares, routes, erreurs)
  BD.sql                     création de la base et de toutes les tables
  src/config/                variables d'environnement (.env), constantes
  src/db/                    pool MySQL + script de seed (données de démo)
  src/middleware/auth.js     requireAuth / requireRole
  src/modules/<module>/      un dossier par fonctionnalité :
                             *.routes.js (Express), *.repository.js (SQL),
                             *.validation.js (règles), *.test.js (tests)
  saisies.js, projets.js,    ancienne version "en mémoire" (avant la base),
  revenus.js (+ .test.js)    plus utilisée par le serveur

frontend-ppe/                Application Next.js (port 3000)
  app/
    page.tsx                 connexion et tableau de bord (KAN-12 / KAN-26)
    saisie/page.tsx          KAN-19 : saisie des dépenses
    revenus/page.tsx         KAN-18 : saisie des revenus
    historique/page.tsx      KAN-29 : historique pluriannuel
    electricite/page.tsx     KAN-32 : production photovoltaïque
    projets/page.tsx         KAN-33 / KAN-37 : projets et droits
    charges/page.tsx         KAN-22 : répartition des charges
```

Le détail du backend (installation de la base, endpoints, comptes de démo) est dans [`backend-ppe/README.md`](backend-ppe/README.md).

### Catégories disponibles

Entretien, Assurances, Nettoyage, Eau & Electricite, Administration, Reparations

---

## Lancer le projet

Il faut **3 choses** qui tournent : la base de données, le backend et le frontend.

**0 — Base de données** (une seule fois, voir `backend-ppe/README.md`)

```bash
cd backend-ppe
mysql -u root -p < BD.sql      # crée la base PPE (efface l'ancienne !)
cp .env.example .env           # puis mettre vos identifiants MySQL
npm install
npm run seed                   # données de démo + comptes de connexion
```

**Terminal 1 — Backend** (port 3001)

```bash
cd backend-ppe
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
| Saisie des revenus | http://localhost:3000/revenus |
| Historique des dépenses | http://localhost:3000/historique |
| Électricité | http://localhost:3000/electricite |
| Projets spécifiques PPE | http://localhost:3000/projets |
| Répartition des charges | http://localhost:3000/charges |

---

## Lancer les tests et le lint

Les tests utilisent le testeur intégré de Node, il n'y a aucune librairie à installer.

```bash
cd backend-ppe
npm test          # sans base : les tests d'intégration sont "skipped"
                  # avec base + .env : tous les tests tournent
```

```bash
cd frontend-ppe
npm run lint      # vérifie le code React/TypeScript avec ESLint
npm run build     # vérifie que l'application compile
```

---

## Prototype

Lien du prototype Figma : https://www.figma.com/proto/VLnF9yMvQWJWMkNjw85VOY/Untitled?node-id=0-1&t=gHqj4aeOhw9YSFcC-1
