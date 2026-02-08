# 📧 Confirmer l'Email d'un Utilisateur

## 🔍 Problème Identifié

Votre compte **`frmunoz@orange.fr`** existe mais l'**email n'est pas confirmé**. Supabase peut exiger la confirmation de l'email avant de permettre la connexion.

## ✅ Solution : Confirmer l'Email Manuellement

### Méthode 1 : Via Script (RECOMMANDÉ)

Exécutez le script pour confirmer l'email :

```bash
cd /Users/fredericmmunoz/cursor1/cosmetic-formulator-web/scripts
npx tsx confirm-email.ts
```

Le script va :
1. Afficher tous les utilisateurs avec email non confirmé
2. Vous demander lequel confirmer (ou "tous")
3. Confirmer l'email

**Exemple :**
```
⚠️  1 utilisateur(s) avec email non confirmé:

1. frmunoz@orange.fr (d5a5db52...)

Numéro de l'utilisateur à confirmer (1, 2, etc.) ou "tous" pour tous : 1

⚠️  Confirmer l'email de 1 utilisateur(s) ? (oui/non): oui

✅ frmunoz@orange.fr confirmé avec succès
```

### Méthode 2 : Via Supabase Dashboard

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Menu gauche → **Authentication** → **Users**
4. Trouvez `frmunoz@orange.fr`
5. Cliquez sur les **3 points** (⋯) → **Confirm Email**

---

## 🚀 Après la Confirmation

Une fois l'email confirmé :

1. Allez sur `http://localhost:3000/login`
2. Connectez-vous avec :
   - Email : `frmunoz@orange.fr`
   - Mot de passe : votre mot de passe
3. Vous devriez pouvoir vous connecter ! ✅

---

## 🔄 Alternative : Désactiver la Confirmation d'Email

Si vous préférez ne pas avoir besoin de confirmer l'email :

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Menu gauche → **Authentication** → **Settings**
4. Désactivez **"Enable email confirmations"**
5. Sauvegardez

⚠️ **Note** : Désactiver la confirmation réduit la sécurité mais simplifie l'utilisation pour le développement.

---

## 📋 Résumé Rapide

1. Exécutez : `npx tsx confirm-email.ts`
2. Choisissez votre utilisateur (ou "tous")
3. Confirmez
4. Connectez-vous ! ✅
