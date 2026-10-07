## Application de Gestion pour une PPE

Créer une application web pour simplifier la gestion financière d'une Propriété par Étage (PPE). L'application doit permettre aux administrateurs et copropriétaires d'accéder aux comptes, budgets, dépenses (comme l'électricité), et statistiques financières.

Le frontend utilise Next.js et le backend Express. Les données sont enregistrées dans MySQL/MariaDB. La connexion se fait avec un email et un mot de passe ; le rôle dépend du compte enregistré en base.

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

Les dépenses sont enregistrées dans la table `Transactions` de MySQL/MariaDB et restent disponibles après un redémarrage du backend.

---

## KAN-36 : Association dépense ↔ projet et appartement

### User story

En tant que copropriétaire ou administrateur, je veux enregistrer une dépense rattachée à un projet spécifique ou à un appartement concerné, afin d'assurer un suivi détaillé des coûts.

### Fonctionnalités

- Ajout d'un champ « Projet » (optionnel) au formulaire de saisie KAN-19, en complément de l'appartement (déjà présent)
- Liste déroulante des projets alimentée par le serveur (`GET /api/saisies/options`)
- Rattachement en base avec `Transactions.id_lot` et `Transactions.id_projet` (nullable : une charge commune peut ne pas avoir de lot ou de projet)

### Tests de validation (`backend-ppe/src/modules/depenses/depenses.validation.test.js`)

- Refus d'un appartement absent de la liste de référence
- Refus d'un projet absent de la liste de référence
- Acceptation d'une dépense sans projet

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

## KAN-23 : Génération de rapports et export comptable

En tant qu'administrateur, je veux produire des rapports périodiques de suivi budgétaire et exporter les données vers un outil comptable, afin de communiquer l'état des finances et d'éviter une double saisie.

### Fonctionnalités

- Page `/rapports`, accessible depuis le menu de l'administrateur
- Choix d'une période mensuelle, trimestrielle ou annuelle
- Revenus, dépenses, solde et tableau des transactions de la période
- Suivi du budget annuel par catégorie, avec dépenses cumulées du 1er janvier à la fin de la période
- Signalement des budgets non approuvés, des dépassements et des catégories sans budget
- Export CSV des transactions avec colonnes débit et crédit en CHF
- Export CSV de la synthèse budgétaire par catégorie
- Impression du rapport avec répétition des en-têtes sur les tableaux de plusieurs pages

Le budget reste annuel, sans prorata. L'enveloppe annuelle et la somme des lignes par catégorie restent distinctes. Sans budget enregistré, le rapport affiche les mouvements mais ne calcule aucun restant budgétaire.

Les CSV sont en UTF-8, avec séparateur point-virgule et virgule décimale. Ils relisent les données actuelles de la période du rapport affiché. Le format est générique : les colonnes doivent être associées à celles de l'outil comptable utilisé. Les exports dédiés PDF et Excel relèvent de KAN-31.

### API (authentification et rôle `admin` requis)

- **GET** `/api/rapports?type=annuel&annee=2026`
- **GET** `/api/rapports?type=trimestriel&annee=2026&valeur=3`
- **GET** `/api/rapports?type=mensuel&annee=2026&valeur=9`
- **GET** `/api/rapports/export?type=mensuel&annee=2026&valeur=9&contenu=transactions`
- **GET** `/api/rapports/export?type=mensuel&annee=2026&valeur=9&contenu=synthese`

Les paramètres invalides sont refusés avec `400`, l'absence de session avec `401` et l'accès d'un copropriétaire avec `403`.

### Tests

14 tests unitaires couvrent les périodes, les calculs au centime, le suivi annuel et les exports CSV. 4 tests d'intégration vérifient les droits, les totaux en base et les réponses de l'API. Ces derniers sont activés explicitement et ne modifient aucune donnée. Voir les commandes dans le [README du backend](backend-ppe/README.md#kan-23--rapports-périodiques-et-export-comptable).

---

## Structure des fichiers

```
backend-ppe/            API Express (port 3001)
  index.js              Assemblage des routes de l'application
  BD.sql                Schéma MySQL/MariaDB
  src/
    config/             Configuration et constantes
    db/                 Connexion et données de démonstration
    middleware/         Authentification et contrôle des rôles
    modules/
      auth/             Connexion des utilisateurs
      depenses/         Saisie et validation des dépenses
      revenus/          Saisie et import des revenus
      projets/          Gestion des projets et des droits
      electricite/      Production photovoltaïque
      financial/        Résumé, budgets et historique
      reference/        Catégories, lots et projets
      charges/          Répartition et rapprochement (KAN-22)
      rapports/         Rapports et exports CSV (KAN-23)

frontend-ppe/           Application Next.js (port 3000)
  app/
    page.tsx            Connexion et tableau de bord (KAN-12)
    saisie/             Formulaire de dépenses (KAN-19)
    revenus/            Formulaire et import des revenus
    historique/         Comparaison des exercices (KAN-29)
    projets/            Suivi des projets et gestion des droits
    electricite/        Suivi photovoltaïque
    charges/            Décomptes et rapprochement (KAN-22)
    statistiques/       Graphiques financiers (KAN-30)
    rapports/           Rapports et exports CSV (KAN-23)
```

### Catégories disponibles

Les catégories sont lues dans la table `Categories`. Les formulaires proposent celles qui correspondent au type de mouvement (dépense ou revenu).

---

## Lancer le projet

Le backend et le frontend doivent tourner en même temps, dans deux terminaux séparés.

MySQL/MariaDB doit être démarré et la base configurée dans `backend-ppe/.env`. Pour une première installation, suivre le [README du backend](backend-ppe/README.md#mise-en-route). Si la base contient déjà des données à conserver, ne pas réimporter `BD.sql` ni relancer le seed, qui réinitialisent les données.

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
| Saisie des revenus | http://localhost:3000/revenus |
| Historique des dépenses | http://localhost:3000/historique |
| Projets spécifiques PPE | http://localhost:3000/projets |
| Production photovoltaïque | http://localhost:3000/electricite |
| Répartition des charges | http://localhost:3000/charges |
| Graphiques financiers | http://localhost:3000/statistiques |
| Rapports budgétaires (administrateur) | http://localhost:3000/rapports |

---

Voici le lien du prototype:

lien: https://www.figma.com/proto/VLnF9yMvQWJWMkNjw85VOY/Untitled?node-id=0-1&t=gHqj4aeOhw9YSFcC-1

## Lancer les tests

Les tests utilisent le testeur intégré de Node. Installer les dépendances du backend avant de les lancer.

```bash
cd backend-ppe
node --test src/modules/rapports/rapports.test.js
```

Pour les tests d'intégration KAN-23, la base doit être disponible et les comptes de démonstration présents :

```powershell
cd backend-ppe
$env:PPE_REPORTS_DB_TESTS='1'
node --test src/modules/rapports/*.test.js
```

Pour vérifier la compilation du frontend :

```bash
cd frontend-ppe
npm run build
```
