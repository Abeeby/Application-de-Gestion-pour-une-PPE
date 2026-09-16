## Application de Gestion pour une PPE

Créer une application web pour simplifier la gestion financière d'une Propriété par Étage (PPE). L'application doit permettre aux administrateurs et copropriétaires d'accéder aux comptes, budgets, dépenses (comme l'électricité), et statistiques financières.

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

### Structure du projet

```
backend-ppe/          API Express
  index.js            Données et route /api/depenses/historique

frontend-ppe/         Application Next.js
  app/
    page.tsx          Redirection vers /historique
    historique/
      page.tsx        Page avec les filtres et le tableau
```

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

```bash
cd backend-ppe
npm install
node index.js
```

**Terminal 2 — Frontend** (port 3000)

```bash
cd frontend-ppe
npm install
npm run dev
```

Puis ouvrir http://localhost:3000

---

## KAN-32 : Évolution de la production d'électricité

### User story

En tant que copropriétaire, je veux suivre l'évolution de la production d'électricité de l'immeuble, afin d'évaluer ce qu'elle rapporte face aux charges.

### Fonctionnalités

- Page dédiée à la consultation de la production solaire.
- Indicateurs clés (KPIs) : Consommation, Coût Global, Production Solaire, Économies Réalisées.
- Graphiques dynamiques : Évolution de la production (kWh) et Bilan Financier (CHF).
- Section de répartition de la consommation par lot / appartement.
- Boutons d'import CSV / Saisie Manuelle (UI uniquement pour l'instant).
- Unification de l'interface via un menu latéral persistant (sidebar).
- Persistance de l'authentification (utilisation du `localStorage`).

### API

**GET** `/api/electricite/evolution`

Paramètres de requête :

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `annee`   | number | 2024   | Année de la production d'électricité |

Exemple :

```
http://localhost:3001/api/electricite/evolution?annee=2024
```

### Tests de fonctionnalités (Plan de validation)

Pour valider l'implémentation de KAN-32, effectuez les vérifications suivantes sur l'application (`http://localhost:3000`) :

1. **Test de la Connexion et Persistance (Auth)** :
   - Sur la page de connexion, cliquez sur "Connexion".
   - Allez sur la page "Électricité", puis retournez sur "Tableau de bord".
   - *Résultat attendu :* Vous n'êtes pas déconnecté et la page s'affiche directement sans demander les identifiants.

2. **Test de la Navigation (Sidebar)** :
   - Observez le menu à gauche de l'écran.
   - *Résultat attendu :* Le menu est présent sur toutes les pages avec uniquement "Tableau de bord" et "Électricité" (les autres onglets inactifs ont été masqués). L'onglet actif doit être en surbrillance (bleu).

3. **Test de la Page Électricité - Affichage des données (KPIs)** :
   - Naviguez sur la page "Électricité".
   - *Résultat attendu :* 4 cartes KPIs s'affichent correctement avec leurs indicateurs respectifs.

4. **Test du Filtrage par Année** :
   - En haut à droite, cliquez sur les boutons "2023" puis "2024".
   - *Résultat attendu :* Les données des graphiques (BarChart et ComposedChart) se mettent à jour dynamiquement selon l'année sélectionnée.

5. **Test des Graphiques Intéractifs** :
   - Survolez les colonnes ou la courbe avec la souris.
   - *Résultat attendu :* Une infobulle (Tooltip) s'affiche avec le détail des valeurs (Consommation, Production, Balance, Gains, Charges) pour le mois correspondant.

6. **Test de la Répartition par Lot** :
   - Observez le bloc "Répartition par lot" en bas à droite.
   - *Résultat attendu :* La liste des 4 appartements s'affiche correctement avec le montant, la consommation et une barre de progression colorée pour chacun.
