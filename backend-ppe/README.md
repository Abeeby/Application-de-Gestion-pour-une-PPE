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
