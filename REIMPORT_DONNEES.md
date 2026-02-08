# 📥 Réimporter les Données depuis Excel

## ⚠️ Situation

Les données ont été supprimées de Supabase. Il n'y a plus d'ingrédients dans la base de données.

## ✅ Solution : Réimporter depuis Excel

### Étape 1 : Vérifier que le fichier Excel existe

Le fichier `DonnéesMP.xlsx` doit être dans le dossier `scripts/` :

```bash
cd /Users/fredericmmunoz/cursor1/cosmetic-formulator-web/scripts
ls -la DonnéesMP.xlsx
```

Si le fichier n'est pas là, copiez-le :

```bash
# Si le fichier est sur votre Bureau
cp ~/Desktop/DonneesMP.xlsx /Users/fredericmmunoz/cursor1/cosmetic-formulator-web/scripts/DonnéesMP.xlsx
```

### Étape 2 : Récupérer votre user_id

Vous devez connaître votre `user_id` pour l'import. Exécutez :

```bash
cd /Users/fredericmmunoz/cursor1/cosmetic-formulator-web/scripts
npx tsx check-users.ts
```

Notez l'ID de votre utilisateur (ex: `d5a5db52-d135-4893-a9e0-e629f17ac374`)

### Étape 3 : Réimporter les données

Exécutez le script d'import avec votre `user_id` :

```bash
cd /Users/fredericmmunoz/cursor1/cosmetic-formulator-web/scripts
npx tsx import-with-user.ts d5a5db52-d135-4893-a9e0-e629f17ac374
```

**Remplacez `d5a5db52-d135-4893-a9e0-e629f17ac374` par votre vrai user_id !**

### Étape 4 : Vérifier l'import

Après l'import, vérifiez que les données sont bien là :

```bash
npx tsx check-user-data.ts
```

Vous devriez voir vos 953 ingrédients !

---

## 🚀 Alternative : Import Automatique

Si vous préférez, je peux créer un script qui détecte automatiquement votre user_id et importe les données. Dites-moi si vous voulez que je le fasse !

---

## 📋 Résumé Rapide

1. Vérifiez que `DonnéesMP.xlsx` est dans `scripts/`
2. Récupérez votre `user_id` : `npx tsx check-users.ts`
3. Importez : `npx tsx import-with-user.ts <votre_user_id>`
4. Vérifiez : `npx tsx check-user-data.ts`
