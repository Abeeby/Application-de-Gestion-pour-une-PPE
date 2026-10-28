## Application de Gestion pour une PPE

Créer une application web pour simplifier la gestion financière d'une Propriété par Étage (PPE). L'application doit permettre aux administrateurs et copropriétaires d'accéder aux comptes, budgets, dépenses (comme l'électricité), et statistiques financières.

Le frontend utilise Next.js et le backend Express. Les données sont enregistrées dans MySQL/MariaDB. La connexion se fait avec un email et un mot de passe ; le rôle dépend du compte enregistré en base.

---

## Equipe
- Product Owner : Amin Torrisi - Abeeby
- Scrum Master : Arthur Saugy - arthursaugycpnv & IsxsI & arthurSaugy
- Dev : Farah Mohamed - Farah1530
- Dev : Ruben ten Cate - Ruben-rtc & Ruben-ten-Cate
- Dev : Tavee Matta - Joetyson1403
- Dev : Kodjo Attivon - kodjo2
- Dev : Eyuel Worku - eyuel2020kurosaki
- Dev : Sellé Sow - Keyshi9

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

MySQL/MariaDB doit être démarré et la base configurée dans `backend-ppe/.env`. Pour une première installation, suivre le [README du backend](backend-ppe/README.md#mise-en-route). Si la base contient déjà des données à conserver, ne pas réimporter `BD.sql` ni relancer le seed, qui réinitialisent les données.

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
| Graphiques financiers | http://localhost:3000/statistiques |
| Tableau de bord interactif | http://localhost:3000/tableau-de-bord |
| Budget annuel et suivi | http://localhost:3000/budgets |
| Journal des modifications | http://localhost:3000/modifications |
| Rapports budgétaires (administrateur) | http://localhost:3000/rapports |

---

## Lancer les tests et le lint

Les tests utilisent le testeur intégré de Node. Installer les dépendances du backend avant de les lancer.

```bash
cd backend-ppe
npm test          # sans base : les tests d'intégration sont "skipped"
                  # avec base + .env : tous les tests tournent
```

Les tests d'intégration des rapports (KAN-23) s'activent en plus avec la variable `PPE_REPORTS_DB_TESTS` :

```powershell
cd backend-ppe
$env:PPE_REPORTS_DB_TESTS='1'
node --test src/modules/rapports/*.test.js
```

```bash
cd frontend-ppe
npm run lint      # vérifie le code React/TypeScript avec ESLint (0 erreur attendue)
npm run build     # vérifie que l'application compile
npm test          # calculs du tableau de bord interactif (KAN-28)
```
---

## Interface commune
- `frontend-ppe/components/MenuLateral.tsx` : un seul menu pour toutes les pages. La page active est surlignée, les liens réservés à l'administrateur (Charges, Rapports) sont masqués pour un copropriétaire, et « Déconnexion » efface vraiment la session.
- `frontend-ppe/lib/format.ts` : un seul format pour les montants (`CHF 1’500.00`) et les dates (`28.10.2026`).
- Tous les chiffres affichés viennent de l'API (plus aucune valeur écrite en dur dans les pages).

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
  src/validation/            règles partagées : date réelle, montant valide

frontend-ppe/                Application Next.js (port 3000)
  app/
    page.tsx                 connexion et tableau de bord (KAN-12 / KAN-26)
    saisie/page.tsx          KAN-19 : saisie des dépenses
    revenus/page.tsx         KAN-18 : saisie des revenus
    historique/page.tsx      KAN-29 : historique pluriannuel
    electricite/page.tsx     KAN-32 : production photovoltaïque
    projets/page.tsx         KAN-33 / KAN-37 : projets et droits
    charges/page.tsx         KAN-22 : répartition des charges
    statistiques/page.tsx    KAN-30 : graphiques financiers
    tableau-de-bord/page.tsx KAN-28 : tableau de bord interactif
    budgets/page.tsx         KAN-15 / KAN-17 : budget annuel et suivi
    modifications/page.tsx   KAN-35 : journal des modifications
    rapports/page.tsx        KAN-23 : rapports et exports CSV
```

Le détail du backend (installation de la base, endpoints, comptes de démo) est dans [`backend-ppe/README.md`](backend-ppe/README.md).

### Catégories disponibles

Les catégories sont lues dans la table `Categories`. Les formulaires proposent celles qui correspondent au type de mouvement (dépense ou revenu).

---

## Prototype

Lien du prototype Figma : https://www.figma.com/proto/VLnF9yMvQWJWMkNjw85VOY/Untitled?node-id=0-1&t=gHqj4aeOhw9YSFcC-1

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
  - Le rôle vient de la session réelle (KAN-12). Pour tester l'autre rôle : se déconnecter puis se reconnecter avec l'autre compte de démo.

---

## KAN-12 : Authentification et rôles

### User story

En tant que membre de la PPE, je veux me connecter avec mon email et mon mot de passe, afin que seules les personnes autorisées accèdent aux données financières, chacune selon son rôle.

### Comment ça marche

1. `POST /api/auth/login` vérifie le mot de passe (hash **bcrypt** en base) et renvoie un **token signé**.
2. Le frontend garde ce token (`localStorage`, clé `ppe_token`) et l'envoie à chaque appel : `Authorization: Bearer <token>` (fichier `frontend-ppe/lib/api.ts`).
3. Le backend vérifie le token (`requireAuth`) puis le rôle (`requireRole`) avant de répondre.

Le token a la forme `<contenu>.<signature>` : le contenu (`email` + date d'expiration) est signé avec **HMAC-SHA256** et un secret connu du serveur seul (`AUTH_SECRET` dans `.env`). Modifier le contenu, ou fabriquer un token à la main, casse la signature → `401`.

### Qui a accès à quoi

| Données | Non connecté | Copropriétaire (`owner`) | Administrateur (`admin`) |
|---|---|---|---|
| Tableau de bord, historique, électricité : consulter | ❌ 401 | ✅ | ✅ |
| Dépenses et revenus : consulter | ❌ 401 | ✅ | ✅ |
| Dépenses et revenus : saisir, importer, supprimer | ❌ 401 | ❌ 403 | ✅ |
| Projets : consulter | ❌ 401 | ✅ | ✅ |
| Projets : créer / modifier / supprimer (KAN-37) | ❌ 401 | ❌ 403 | ✅ |
| Budgets : créer (`POST /api/financial/budgets`) | ❌ 401 | ❌ 403 | ✅ |
| Répartition des charges (KAN-22), rapports (KAN-23) | ❌ 401 | ❌ 403 | ✅ |

Pourquoi la saisie des revenus est réservée à l'administrateur : les revenus « Charges de copropriété » d'un lot comptent comme acomptes dans le décompte (KAN-22). Un copropriétaire pouvait donc s'en ajouter lui-même et faire baisser son propre solde de charges.

### Tests (`backend-ppe/src/modules/auth/`)

- `auth.token.test.js` (14 tests, sans base) : token valide accepté ; faux token, contenu modifié, mauvais secret, token expiré refusés ; règles du secret.
- `auth.integration.test.js` (6 tests, base requise sinon sautés) : 401 sur toutes les routes de données sans token, faux token admin refusé, accès 200 pour admin et copropriétaire connectés.

---

## KAN-15 : Création et approbation du budget annuel

### User story

En tant qu'administrateur, je veux générer le budget annuel à partir de l'historique des dépenses, le structurer par catégories, le répartir automatiquement entre copropriétaires selon leur quote-part, et le faire valider (statuts brouillon → soumis → approuvé), afin de disposer rapidement d'un budget fiable et formellement validé chaque année.

### Fonctionnalités

- **Génération automatique** : pour chaque catégorie, moyenne des dépenses des **3 dernières années complètes** + 2 % d'indexation, arrondie à la dizaine supérieure. L'année en cours n'est pas comptée (elle n'est pas finie : elle sous-estimerait le budget).
- **Structure par catégories** : l'administrateur ajuste, ajoute ou retire des lignes tant que le budget est en brouillon. La page montre la moyenne historique à côté de chaque montant.
- **Enveloppe votée ≠ total des lignes** : conformément à la décision d'équipe documentée dans `BD.sql`, l'enveloppe (`prevision_budget`) n'est jamais recalculée depuis les lignes ; l'écart est affiché.
- **Répartition par lot** avec **la même règle que KAN-22** (`ventilerDepense`) : quote-part, ou parts égales pour l'eau/l'électricité. Part annuelle + acompte mensuel par lot, sans perdre un centime.
- **Cycle de validation** :

```
brouillon --soumettre--> soumis --approuver--> approuvé (figé, date d'approbation enregistrée)
    ^                       |
    +----retravailler--- rejeté <--rejeter--+
```

### Droits

| Action | Admin | Copropriétaire |
|---|---|---|
| Voir un budget soumis / approuvé / rejeté | ✅ | ✅ (lecture seule) |
| Voir un brouillon | ✅ | ❌ (404 : travail interne) |
| Générer, modifier, changer le statut | ✅ | ❌ 403 |

### API

| Méthode | Route | Rôle |
|---|---|---|
| GET | `/api/budgets` | liste des budgets |
| GET | `/api/budgets/:annee` | détail + moyennes historiques + répartition par lot |
| POST | `/api/budgets/:annee/generer` | crée (ou regénère) le brouillon depuis l'historique |
| PUT | `/api/budgets/:annee` | `{ lignes: [{ categorie, montant }], enveloppe }` (brouillon uniquement, sinon 409) |
| POST | `/api/budgets/:annee/transition` | `{ action: "soumettre" \| "approuver" \| "rejeter" \| "retravailler" }` (409 si interdite) |

`POST /api/financial/budgets` (KAN-26) refuse aussi (409) de modifier un budget qui n'est plus en brouillon.

### Tests (`backend-ppe/src/modules/budgets/`)

- `budgets.calcul.test.js` : 14 tests sans base (transitions, années de référence, moyenne + indexation, validation des lignes, répartition au centime près).
- `budgets.integration.test.js` : 4 tests avec base (cycle complet, brouillon caché au copropriétaire, droits, lignes invalides).

Page : http://localhost:3000/budgets

---

## KAN-17 : Suivi du budget en direct et alertes de dépassement

### User story

En tant qu'administrateur, je veux visualiser à tout moment l'état du budget consommé par catégorie et recevoir une alerte automatique en cas de dépassement, afin de pouvoir réagir avant que la situation ne devienne problématique.

### Règles d'alerte (par catégorie)

| Niveau | Quand ? |
|---|---|
| 🔴 **Dépassé** | consommé > budget |
| 🟠 **Attention** | ≥ 90 % du budget consommé, **ou** au rythme actuel la catégorie dépassera son budget avant le 31 décembre (projection = consommé ÷ part de l'année écoulée, seulement après le 1er trimestre pour éviter les fausses alertes de janvier) |
| 🔵 **Hors budget** | dépense dans une catégorie qui n'a pas de ligne au budget |
| 🟢 **OK** | sinon |

### Où apparaissent les alertes ?

- **Tableau de bord** : carte « Alertes budgétaires » + pastille rouge sur la cloche avec le nombre d'alertes (avant : 3 alertes écrites en dur).
- **Page Budgets** : section « Suivi en direct » (budget, consommé, barre d'avancement, état) pour l'année choisie.
- **Automatique** : rien à lancer, le suivi est recalculé à chaque affichage depuis les dépenses enregistrées. Démo : saisir une dépense « Électricité » de 1 500 CHF → l'alerte « Budget dépassé » apparaît sur le tableau de bord.

Les chiffres sont cohérents avec KAN-26 : le total suivi est le même que la carte « Budget restant » du tableau de bord.

### API

`GET /api/budgets/:annee/suivi` (administrateur, 403 sinon) → `{ fractionEcoulee, categories: [{ categorie, budget, consomme, restant, taux, projection, niveau }], alertes: [{ niveau, categorie, message }], totaux }`. Sans budget pour l'année : une alerte le signale.

### Tests

- `suivi.calcul.test.js` : 10 tests sans base (part de l'année écoulée, chaque niveau, projection, tri des alertes).
- `suivi.integration.test.js` : 3 tests avec base (vrai dépassement en base sur l'année 2001, droits, absence de budget).

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
