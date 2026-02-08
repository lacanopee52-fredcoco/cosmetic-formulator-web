# 🔐 Résolution du Problème de Connexion

## Problème
Erreur "Invalid login credentials" lors de la connexion.

## Solutions

### Solution 1 : Créer un nouveau compte (RECOMMANDÉ)

Si l'utilisateur a été créé directement dans Supabase sans mot de passe :

1. **Supprimer l'ancien utilisateur** (optionnel) :
   - Dans Supabase → Authentication → Users
   - Cliquez sur l'utilisateur `frmunoz@orange.fr`
   - Cliquez sur "Delete user" (ou utilisez un autre email)

2. **Créer un nouveau compte via l'application** :
   - Sur la page de login, cliquez sur **"S'inscrire"**
   - Utilisez votre email : `frmunoz@orange.fr`
   - Choisissez un mot de passe (minimum 6 caractères)
   - Cliquez sur "S'inscrire"
   - Vous serez automatiquement connecté

### Solution 2 : Réinitialiser le mot de passe depuis Supabase

1. Dans Supabase → Authentication → Users
2. Cliquez sur votre utilisateur (`frmunoz@orange.fr`)
3. Dans la section "Reset password", cliquez sur **"Send password recovery"**
4. Vérifiez votre email (`frmunoz@orange.fr`)
5. Cliquez sur le lien de réinitialisation
6. Choisissez un nouveau mot de passe
7. Reconnectez-vous avec le nouveau mot de passe

### Solution 3 : Modifier le mot de passe directement dans Supabase

1. Dans Supabase → Authentication → Users
2. Cliquez sur votre utilisateur
3. Dans l'onglet "Raw JSON", vous pouvez voir les données
4. Pour changer le mot de passe, utilisez SQL Editor :

```sql
-- Réinitialiser le mot de passe (remplacez 'NouveauMotDePasse123!' par votre mot de passe)
UPDATE auth.users 
SET encrypted_password = crypt('NouveauMotDePasse123!', gen_salt('bf'))
WHERE email = 'frmunoz@orange.fr';
```

⚠️ **Note** : Cette méthode nécessite l'extension `pgcrypto` dans Supabase.

## Solution la plus simple

**Recommandation** : Créer un nouveau compte via l'interface web

1. Cliquez sur **"S'inscrire"** sur la page de login
2. Utilisez : `frmunoz@orange.fr`
3. Choisissez un mot de passe que vous retiendrez
4. Vous serez automatiquement connecté et pourrez accéder à vos 953 ingrédients

## Vérification

Une fois connecté, vous devriez voir :
- Le dashboard avec vos ingrédients
- La navigation (Nouvelle Formule, Formules, Importer Matières)
- Vos 953 ingrédients disponibles pour créer des formules
