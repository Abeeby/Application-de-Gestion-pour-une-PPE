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
  charges/                   répartition et rapprochement (KAN-22)
  rapports/                  rapports périodiques et exports CSV (KAN-23)
db/migrations/                anciennes migrations conservées pour l'historique
```

Les modules séparent les routes Express (`*.routes.js`), l'accès SQL
(`*.repository.js`) et les règles de validation ou de calcul. Ces règles
sont testées sans base de données quand c'est possible.

## Authentification

- `POST /api/auth/login` : connexion avec `{ email, password }`
- `GET /api/auth/me` : retourne l'utilisateur connecté à partir du token Bearer

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

## KAN-23 : rapports périodiques et export comptable

Page `/rapports`, accessible dans le menu de l'administrateur. Les routes
de génération et d'export exigent également un token et le rôle `admin`.

- `GET /api/rapports?type=annuel&annee=2026`
- `GET /api/rapports?type=trimestriel&annee=2026&valeur=3`
- `GET /api/rapports?type=mensuel&annee=2026&valeur=9`
- `GET /api/rapports/export?...&contenu=transactions` : détail comptable CSV.
- `GET /api/rapports/export?...&contenu=synthese` : suivi par catégorie CSV.

Le rapport présente revenus, dépenses, solde et détail de la période. Il
compare aussi le budget annuel aux dépenses cumulées depuis le 1er janvier
jusqu'à la fin de cette période. Le budget n'est pas proratisé. L'enveloppe
annuelle et la somme des lignes budgétaires restent deux valeurs distinctes.
Les budgets non approuvés, les catégories sans budget et les dépassements
sont identifiés. Sans budget, aucun montant disponible n'est inventé.

Les CSV sont en UTF-8 avec BOM, séparateur point-virgule et virgule décimale.
L'export des transactions comprend l'identifiant, la date, le type, la catégorie,
la description, le lot, le projet, la facture, le débit et le crédit en CHF.
C'est un format générique : mapper les colonnes dans l'outil comptable choisi.
Les exports relisent les données actuelles de la période du rapport affiché.
La page propose aussi une impression du rapport. KAN-31 reste consacré aux
exports PDF et Excel.

Tests unitaires (sans MySQL) :

```powershell
node --test src/modules/rapports/rapports.test.js
```

Cette commande exécute 14 tests. La commande suivante ajoute 4 tests
d'intégration, soit 18 tests KAN-23 au total. Les commandes sont à lancer
depuis le dossier `backend-ppe`.

Tests d'intégration de lecture (base disponible et comptes de démonstration) :

```powershell
$env:PPE_REPORTS_DB_TESTS='1'
node --test src/modules/rapports/*.test.js
```

Ces tests ne créent, ne modifient ni ne suppriment de données.

## Exemple de connexion

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ppe.fr","password":"admin1234"}'
```

Le token récupéré est ensuite envoyé dans l'en-tête :

```bash
Authorization: Bearer <token>
```
