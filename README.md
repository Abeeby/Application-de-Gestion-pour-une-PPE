## Application de Gestion pour une PPE

Créer une application web pour simplifier la gestion financière d'une Propriété par Étage (PPE). L'application doit permettre aux administrateurs et copropriétaires d'accéder aux comptes, budgets, dépenses (comme l'électricité), et statistiques financières.

---

# Application de gestion pour une PPE

Application web de gestion financière d'une Propriété par Étages (PPE). Elle permet aux administrateurs et copropriétaires de consulter les comptes, budgets, transactions et historiques de dépenses.

## Fonctionnalités

- Consultation du résumé financier, des comptes, transactions et budgets
- Authentification administrateur et copropriétaire
- Historique pluriannuel des dépenses avec filtres par année
- Comparaison des montants par catégorie et calcul des écarts

## Structure du projet

```text
projet-poo/
├── backend-ppe/
│   ├── index.js
│   └── package.json
├── frontend-ppe/
│   ├── app/
│   │   ├── historique/page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   └── package.json
└── README.md
```

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

```powershell
cd backend-ppe
npm install
npm run dev
```

**Terminal 2 — Frontend** (port 3000)

```bash
cd frontend-ppe
npm install
npm run dev
```

Puis ouvrir http://localhost:3000

## KAN-14 - Connexion de l’interface à l’API financière

## Description

Ce ticket a pour objectif de connecter l’interface graphique à l’API financière du projet PPE.

L’interface peut ainsi récupérer les données depuis le back-end au lieu d’utiliser uniquement des données de test définies dans le front-end.

## Objectif du ticket

En tant que développeur front-end,  
je veux consommer l’API financière depuis l’interface graphique,  
afin que les écrans affichent les données retournées par le back-end.

## Installation du back-end

Depuis la racine du projet, entrer dans le dossier du back-end :

```powershell
cd .\backend-ppe
```

Installer les dépendances :

```powershell
npm install
```

Démarrer le serveur :

```powershell
npm run dev
```

Le serveur est accessible à l’adresse suivante :

```text
http://localhost:3001
```

## Vérification de l’API

Pour vérifier que le serveur fonctionne, ouvrir l’adresse suivante :

```text
http://localhost:3001/api/health
```

Réponse attendue :

```json
{
  "status": "ok",
  "app": "ppe-backend",
  "time": "date générée par le serveur"
}
```

La liste des routes peut être consultée à cette adresse :

```text
http://localhost:3001/api
```

## Routes disponibles

### Vérification du serveur

```http
GET /api/health
```

### Connexion

```http
POST /api/auth/login
```

Exemple de données envoyées :

```json
{
  "email": "admin@ppe.fr",
  "role": "admin"
}
```

### Utilisateur connecté

```http
GET /api/auth/me
```

Cette route nécessite un token dans l’en-tête :

```http
Authorization: Bearer TOKEN
```

### Résumé financier

```http
GET /api/financial/summary
```

### Comptes

```http
GET /api/financial/accounts
```

### Transactions

```http
GET /api/financial/transactions
```

### Budgets

```http
GET /api/financial/budgets
```

### Création d’un budget

```http
POST /api/financial/budgets
```

Exemple de données envoyées :

```json
{
  "category": "Entretien",
  "planned": 2500
}
```

### Historique des dépenses

```http
GET /api/depenses/historique
```

Exemple :

```text
http://localhost:3001/api/depenses/historique?anneeDebut=2022&anneeFin=2025
```

## Comptes de démonstration

### Administrateur

```text
Adresse : admin@ppe.fr
Rôle : admin
```

### Copropriétaire

```text
Adresse : coproprietaire@ppe.fr
Rôle : owner
```

## Résultat attendu

Le ticket KAN-14 est terminé lorsque :

- le serveur back-end démarre correctement ;
- l’interface peut contacter le back-end ;
- l’utilisateur peut se connecter ;
- le token est envoyé aux routes protégées ;
- les écrans financiers utilisent les réponses de l’API ;
- les comptes, transactions et budgets sont affichés ;
- les erreurs d’authentification sont gérées ;
- les données de test du front-end ne sont plus utilisées.

## Remarque

Les données sont actuellement stockées en mémoire dans le fichier `index.js`.

Les budgets ajoutés sont donc supprimés lorsque le serveur redémarre. Une base de données pourra être ajoutée ultérieurement pour conserver les données.

## Tests de l’API

Avant d’effectuer les tests, démarrer le serveur depuis le dossier `backend-ppe` :

```powershell
npm run dev
```

Le serveur doit être accessible à l’adresse suivante :

```text
http://localhost:3001
```

### Test 1 : vérifier que le serveur fonctionne

Ouvrir dans le navigateur :

```text
http://localhost:3001/api/health
```

Réponse attendue :

```json
{
  "status": "ok",
  "app": "ppe-backend",
  "time": "date générée par le serveur"
}
```

Test avec PowerShell :

```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/health"
```

### Test 2 : afficher la liste des routes

Ouvrir dans le navigateur :

```text
http://localhost:3001/api
```

La réponse doit afficher le nom de l’API, son statut et la liste des routes disponibles.

Test avec PowerShell :

```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api"
```

### Test 3 : afficher l’historique des dépenses

Ouvrir dans le navigateur :

```text
http://localhost:3001/api/depenses/historique?anneeDebut=2022&anneeFin=2025
```

Test avec PowerShell :

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:3001/api/depenses/historique?anneeDebut=2022&anneeFin=2025"
```

Résultat attendu :

- seules les dépenses comprises entre 2022 et 2025 sont retournées ;
- chaque dépense contient une année, une catégorie et un montant.

### Test 4 : connexion administrateur réussie

Exécuter dans PowerShell :

```powershell
$loginBody = @{
  email = "admin@ppe.fr"
  role = "admin"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod `
  -Uri "http://localhost:3001/api/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body $loginBody

$loginResponse
```

Résultat attendu :

- la réponse contient un token ;
- l’adresse de l’utilisateur est `admin@ppe.fr` ;
- le rôle retourné est `admin`.

### Test 5 : connexion avec un rôle incorrect

```powershell
$invalidBody = @{
  email = "admin@ppe.fr"
  role = "owner"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "http://localhost:3001/api/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body $invalidBody
```

Résultat attendu : la requête retourne une erreur HTTP `403` avec le message `Rôle incorrect pour cet utilisateur`.

### Test 6 : accès à une route protégée

```powershell
$token = $loginResponse.token

Invoke-RestMethod `
  -Uri "http://localhost:3001/api/financial/summary" `
  -Headers @{ Authorization = "Bearer $token" }
```

Résultat attendu : la réponse contient un objet `summary` avec le solde total, les revenus, les dépenses et la prévision mensuelle.
