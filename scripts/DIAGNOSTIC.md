# 🔍 Diagnostic : Table Ingredients Vide

## Problème
La table `ingredients` apparaît vide dans Supabase Table Editor, même après un import "réussi".

## Causes possibles

### 1. Row Level Security (RLS) bloque la vue
- **Symptôme** : Les données sont là mais invisibles dans Table Editor
- **Solution** : Utiliser la clé `service_role` pour voir toutes les données

### 2. User ID incorrect
- **Symptôme** : Les données sont importées avec un mauvais user_id
- **Solution** : Vérifier que le User ID utilisé correspond à votre utilisateur

### 3. Erreur silencieuse lors de l'import
- **Symptôme** : Le script dit "succès" mais aucune donnée n'est insérée
- **Solution** : Relancer l'import avec le script amélioré qui affiche les erreurs

## Solutions

### Solution 1 : Vérifier avec SQL Editor

Dans Supabase → SQL Editor, exécutez :

```sql
SELECT COUNT(*) FROM ingredients;
```

Si cela retourne un nombre > 0, les données sont là mais RLS les cache.

### Solution 2 : Vérifier avec la clé service_role

Le script `check-data.ts` utilise la clé service_role et devrait voir toutes les données.

### Solution 3 : Relancer l'import avec diagnostics

Le script d'import a été amélioré pour :
- Tester avec un seul ingrédient d'abord
- Afficher les erreurs détaillées
- Montrer combien de lignes sont réellement insérées

## Commandes utiles

```bash
# Vérifier les données
cd /Users/fredericmmunoz/cursor1/cosmetic-formulator-web/scripts
npx tsx check-data.ts

# Relancer l'import avec diagnostics
npm run import
```
