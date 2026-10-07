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
| Tableau de bord, dépenses, revenus, historique, électricité | ❌ 401 | ✅ | ✅ |
| Projets : consulter | ❌ 401 | ✅ | ✅ |
| Projets : créer / modifier / supprimer (KAN-37) | ❌ 401 | ❌ 403 | ✅ |
| Budgets : créer (`POST /api/financial/budgets`) | ❌ 401 | ❌ 403 | ✅ |
| Répartition des charges (KAN-22) | ❌ 401 | ❌ 403 | ✅ |

### Tests (`backend-ppe/src/modules/auth/`)

- `auth.token.test.js` (14 tests, sans base) : token valide accepté ; faux token, contenu modifié, mauvais secret, token expiré refusés ; règles du secret.
- `auth.integration.test.js` (6 tests, base requise sinon sautés) : 401 sur toutes les routes de données sans token, faux token admin refusé, accès 200 pour admin et copropriétaire connectés.

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
backend-ppe/            API Express (port 3001)
  index.js              Routes de l'application
  saisies.js            KAN-19 : validation et enregistrement des dépenses
  saisies.test.js       KAN-19 : tests
  projets.js            KAN-37 : gestion des droits et modèle de projets
  projets.test.js       Tests du backend

frontend-ppe/           Application Next.js (port 3000)
  app/
    page.tsx            Connexion et tableau de bord (KAN-12)
    saisie/
      page.tsx          KAN-19 : formulaire de saisie
    historique/
      page.tsx          KAN-29 : filtres et tableau comparatif
    projets/
      page.tsx          KAN-37 : suivi des projets et gestion des droits
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
| Projets spécifiques PPE | http://localhost:3000/projets |

---

Voici le lien du prototype:

lien: https://www.figma.com/proto/VLnF9yMvQWJWMkNjw85VOY/Untitled?node-id=0-1&t=gHqj4aeOhw9YSFcC-1
## Lancer les tests

Les tests utilisent le testeur intégré de Node, il n'y a aucune librairie à installer.

```
Puis ouvrir http://localhost:3000
