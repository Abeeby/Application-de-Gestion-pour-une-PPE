# API backend financière PPE

## Authentification

- `POST /api/auth/login` : connexion avec un email et un rôle (`admin` ou `owner`)
- `GET /api/auth/me` : retourne l’utilisateur connecté à partir du token Bearer

## Données financières

- `GET /api/financial/summary` : résumé financier global
- `GET /api/financial/accounts` : liste des comptes
- `GET /api/financial/transactions` : liste des revenus et dépenses
- `GET /api/financial/budgets` : budgets et taux d’usage
- `POST /api/financial/budgets` : création d’un budget réservé aux administrateurs

## Saisie des dépenses (KAN-19 / KAN-36)

User story : en tant que copropriétaire ou administrateur, je veux enregistrer une dépense rattachée à un projet spécifique ou à un appartement concerné, afin d'assurer un suivi détaillé des coûts.

- `GET /api/saisies/options` : catégories, appartements et projets disponibles pour le formulaire
- `GET /api/saisies` : liste des dépenses déjà enregistrées
- `POST /api/saisies` : enregistre une nouvelle dépense

Règles de validation (`validerDepense`, testées dans `saisies.test.js`) :

- `montant` : nombre strictement supérieur à 0
- `date` : obligatoire
- `categorie` : doit exister dans la liste des catégories
- `appartement` : doit exister dans la liste des appartements
- `projet` : optionnel — mais doit exister dans la liste des projets si fourni
- `justificatif` : optionnel

## Exemple de requête

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ppe.fr","role":"admin"}'
```

Le token récupéré est ensuite envoyé dans l’en-tête :

```bash
Authorization: Bearer <token>
```
