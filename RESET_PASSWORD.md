# 🔐 Réinitialiser le Mot de Passe d'un Utilisateur

## 📋 Situation

Vous avez oublié le mot de passe du compte **`frmunoz@orange.fr`** qui contient toutes vos matières premières (953 ingrédients).

## 🎯 Solutions

### Solution 1 : Via Script (RECOMMANDÉ - Rapide)

Utilisez le script que j'ai créé pour réinitialiser le mot de passe :

```bash
cd /Users/fredericmmunoz/cursor1/cosmetic-formulator-web/scripts
npx tsx reset-password.ts
```

Le script va vous demander :
1. L'email de l'utilisateur (`frmunoz@orange.fr`)
2. Le nouveau mot de passe (minimum 6 caractères)
3. Une confirmation

**Exemple :**
```
📧 Email de l'utilisateur: frmunoz@orange.fr
🔑 Nouveau mot de passe (min 6 caractères): MonNouveauMotDePasse123
⚠️  Êtes-vous sûr de vouloir changer le mot de passe ? (oui/non): oui
```

✅ **C'est fait !** Vous pouvez maintenant vous connecter avec le nouveau mot de passe.

---

### Solution 2 : Via Supabase Dashboard (Interface Web)

1. **Allez sur votre projet Supabase** :
   - https://supabase.com/dashboard
   - Connectez-vous avec votre compte Supabase
   - Sélectionnez votre projet

2. **Accédez à Authentication** :
   - Dans le menu de gauche, cliquez sur **"Authentication"**
   - Puis sur **"Users"**

3. **Trouvez l'utilisateur** :
   - Recherchez `frmunoz@orange.fr` dans la liste
   - Cliquez sur les **3 points** (⋯) à droite de l'utilisateur
   - Sélectionnez **"Reset Password"** ou **"Send Password Reset Email"**

4. **Options** :
   - **Option A** : Envoyer un email de réinitialisation (l'utilisateur recevra un lien)
   - **Option B** : Si vous avez les droits admin, vous pouvez modifier directement le mot de passe

---

### Solution 3 : Transférer les Données (Alternative)

Si vous préférez utiliser votre autre compte (`lacanopee52@gmail.com`), vous pouvez transférer toutes les données :

1. **Vérifiez les données** :
   ```bash
   cd /Users/fredericmmunoz/cursor1/cosmetic-formulator-web/scripts
   npx tsx check-user-data.ts
   ```

2. **Transférez les données** :
   - Ouvrez `scripts/transfer-data.ts`
   - Décommentez la ligne `// await transfer()` à la fin
   - Exécutez : `npx tsx transfer-data.ts`

Toutes les 953 matières premières seront transférées vers `lacanopee52@gmail.com`.

---

## 🚀 Recommandation

**Utilisez la Solution 1 (script)** - C'est la plus rapide et la plus simple !

Une fois le mot de passe réinitialisé :
1. Allez sur `http://localhost:3000/login`
2. Connectez-vous avec `frmunoz@orange.fr` et votre nouveau mot de passe
3. Vous verrez toutes vos 953 matières premières ! ✅

---

## ⚠️ Note de Sécurité

Le script utilise votre clé `SUPABASE_SERVICE_ROLE_KEY` qui a des droits administrateur. C'est normal et sécurisé car c'est votre propre projet.
