# API backend financière PPE

Backend Express branché sur une base MySQL/MariaDB (voir `BD.sql`). Les
données ne sont plus en mémoire : tout est persisté.

## Mise en route

```bash
npm install
```

1. Créer la base et toutes les tables en une seule fois :
   ```bash
   mysql -u root -p < BD.sql
   ```
   (adapter la commande à votre client MySQL/MariaDB - Workbench, DBeaver,
   `mariadb`, etc. fonctionnent aussi bien). **Attention** : ce script fait
   `DROP DATABASE IF EXISTS PPE` avant de la recréer - à ne lancer que sur un
   environnement de développement, jamais contre une base contenant déjà des
   données à conserver.

   `db/migrations/` ne contient que des fichiers obsolètes gardés pour
   l'historique des décisions de conception : tout leur contenu est déjà
   intégré dans `BD.sql` (v2.0). Ne pas les exécuter.

2. Copier `.env.example` en `.env` et renseigner vos identifiants :
   ```bash
   cp .env.example .env
   ```

3. Peupler la base avec des données de démonstration :
   ```bash
   npm run seed
   ```
   Affiche à la fin les comptes de connexion créés (admin + copropriétaire).
   **Le script vide les tables applicatives avant de les repeupler** :
   à ne lancer qu'en développement.

4. Démarrer le serveur :
   ```bash
   npm run dev
   ```
   `GET /api/health` indique si la base est joignable.

## Changements par rapport à la version précédente (en mémoire)

- **Authentification réelle** : `POST /api/auth/login` attend désormais
  `{ email, password }` (et non plus `{ email, role }`). Le mot de passe est
  vérifié via bcrypt contre `Utilisateurs.mot_de_passe`. Le rôle n'est plus
  choisi côté client : il est déterminé par la table `Appartenir`.
- **Identifiants numériques** : les projets, dépenses, revenus, etc. ont
  maintenant de vrais id auto-incrémentés (entiers), et non plus des chaînes
  du type `proj-171...`.
- **`/api/saisies/options` et `/api/revenus/options`** renvoient des listes
  lues en base (`Categories`, `Lots`, `Projets`) au lieu de tableaux figés
  dans le code - le contrat JSON (tableaux de chaînes) ne change pas.
- **Comptes bancaires (`/api/financial/accounts`)** : le schéma ne modélise
  pas de table "Comptes". L'endpoint renvoie un compte unique calculé
  (recettes - dépenses) plutôt que des soldes fictifs. À remodéliser si un
  vrai suivi multi-comptes est nécessaire.
- **Production photovoltaïque (`/api/electricite/evolution`)** : modélisée
  via `Compteurs` (type `production_pv`) + `Releves` (colonne `revenu`
  ajoutée en migration 003), au lieu d'un tableau statique.

## Structure

```
index.js                     assemblage de l'app Express (middlewares, routes, erreurs)
src/config/                  variables d'environnement, constantes
src/db/                      pool MySQL, script de seed
src/middleware/auth.js       requireAuth / requireRole
src/modules/
  auth/                      login, token de session
  projets/                   CRUD projets + étapes (KAN-8/33/37/38)
  depenses/                  saisie des dépenses (KAN-19)
  revenus/                   saisie des revenus + import Excel (KAN-18)
  electricite/                production photovoltaïque (KAN-32)
  financial/                 tableau de bord (résumé, budgets, historique)
  reference/                 listes partagées (catégories, lots, projets)
db/migrations/                évolutions du schéma appliquées après BD.sql
```

Chaque module suit le même découpage : `*.routes.js` (Express),
`*.repository.js` (SQL), `*.validation.js` (règles métier, testées sans DB
quand c'est possible - voir `*.validation.test.js`).

## Authentification

- `POST /api/auth/login` : connexion avec `{ email, password }`
- `GET /api/auth/me` : retourne l'utilisateur connecté à partir du token Bearer

**Sécurité (KAN-12)** : le token est signé (HMAC-SHA256) avec le secret
`AUTH_SECRET` du fichier `.env` (32 caractères minimum, voir `.env.example`).
Sans `AUTH_SECRET`, un secret temporaire est généré au démarrage : il faut
alors se reconnecter après chaque redémarrage du backend. En production
(`NODE_ENV=production`), le serveur refuse de démarrer sans `AUTH_SECRET`.
Toutes les routes de données exigent un token valide (401 sinon).

Comptes de démonstration créés par `npm run seed` (mots de passe visibles
dans la sortie de la commande, également listés ici pour référence dev) :

| Email | Mot de passe | Rôle |
|---|---|---|
| admin@ppe.fr | admin1234 | admin |
| coproprietaire@ppe.fr | coprop1234 | owner |

## Données financières

- `GET /api/financial/summary` : résumé financier global
- `GET /api/financial/accounts` : compte unique calculé depuis les transactions
- `GET /api/financial/transactions` : dernières transactions (recettes + dépenses)
- `GET /api/financial/budgets` : budgets annuels et taux d'usage réel
- `POST /api/financial/budgets` : création/mise à jour d'une ligne de budget (admin)
- `GET /api/depenses/historique` : dépenses agrégées par année/catégorie

## Saisie des dépenses (KAN-19 / KAN-36)

- `GET /api/saisies/options` : catégories, appartements et projets disponibles
- `GET /api/saisies` : liste des dépenses déjà enregistrées
- `POST /api/saisies` : enregistre une nouvelle dépense

Règles de validation (`validerDepenseAvecListes`, testées dans
`src/modules/depenses/depenses.validation.test.js`) :

- `montant` : nombre strictement supérieur à 0
- `date` : obligatoire
- `categorie` : doit exister dans la liste des catégories
- `appartement` : doit exister dans la liste des appartements
- `projet` : optionnel — mais doit exister dans la liste des projets si fourni
- `justificatif` : optionnel (stocké dans `Transactions.description`)

## Saisie des revenus (KAN-18)

- `GET /api/revenus/options`, `GET /api/revenus`, `POST /api/revenus`
- `POST /api/revenus/import` : import CSV/Excel

## Gestion des projets (KAN-8 / KAN-33 / KAN-37 / KAN-38)

- `GET /api/projets/droits` : droits RBAC de l'utilisateur connecté
- `GET /api/projets`, `GET /api/projets/:id`
- `POST /api/projets`, `PUT /api/projets/:id`, `DELETE /api/projets/:id` (admin)

`depense` et `progression` sont calculés depuis les transactions liées au
projet (`Transactions.id_projet`), sauf si `progression` est fournie
explicitement (stockée dans `Projets.progression_manuelle` - utile pour un
projet clôturé sans avoir consommé 100% du budget).

## Exemple de requête

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ppe.fr","password":"admin1234"}'
```

Le token récupéré est ensuite envoyé dans l'en-tête :

```bash
Authorization: Bearer <token>
```
