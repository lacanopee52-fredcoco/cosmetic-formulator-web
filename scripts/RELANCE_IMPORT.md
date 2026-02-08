# 🔄 Relancer l'Import avec Diagnostics

## Problème
La table `ingredients` est vide (COUNT = 0) malgré un message "succès".

## Solution : Relancer avec diagnostics

### 1. Obtenir votre User ID

Dans Supabase :
1. **Authentication** → **Users**
2. Si vous n'avez pas d'utilisateur, créez-en un : **"Add user"** → **"Create new user"**
3. **Copiez l'UUID** (ex: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)

### 2. Relancer l'import avec diagnostics

```bash
cd /Users/fredericmmunoz/cursor1/cosmetic-formulator-web/scripts
npx tsx import-with-user.ts VOTRE_USER_ID_ICI
```

**Remplacez** `VOTRE_USER_ID_ICI` par l'UUID que vous avez copié.

### 3. Ce que vous verrez

Le script va :
1. ✅ Tester avec **un seul ingrédient** d'abord
2. ✅ Afficher l'erreur exacte s'il y en a une
3. ✅ Montrer les données qui sont insérées
4. ✅ Continuer avec tous les ingrédients si le test réussit

## Exemple

```bash
npx tsx import-with-user.ts a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

## Erreurs possibles et solutions

### "User ID not found"
→ Vérifiez que l'UUID est correct dans Supabase → Authentication → Users

### "Table does not exist"
→ Vérifiez que vous avez bien exécuté `schema-complete.sql` dans SQL Editor

### "Permission denied"
→ Vérifiez que vous utilisez la clé `service_role` dans `.env.local`

### "Foreign key constraint"
→ Vérifiez que le user_id existe dans `auth.users`
