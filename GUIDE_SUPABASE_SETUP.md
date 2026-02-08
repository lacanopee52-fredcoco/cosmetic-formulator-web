# 🚀 Guide Complet : Créer un Projet Supabase et Obtenir les Clés

## 📝 Étape 1 : S'inscrire sur Supabase

1. Allez sur [supabase.com](https://supabase.com)
2. Cliquez sur **"Start your project"** ou **"Sign Up"**
3. Connectez-vous avec :
   - GitHub (recommandé)
   - Email/Password
   - Google
4. Confirmez votre email si nécessaire

---

## 🆕 Étape 2 : Créer un Nouveau Projet

1. Une fois connecté, cliquez sur **"New Project"**
2. Remplissez le formulaire :

   **Organization** :
   - Si c'est votre premier projet, créez une organisation
   - Donnez-lui un nom (ex: "La Canopée")

   **Project Details** :
   - **Name** : `cosmetic-formulator` (ou autre nom)
   - **Database Password** : 
     - ⚠️ **IMPORTANT** : Choisissez un mot de passe fort
     - Notez-le quelque part, vous en aurez besoin !
     - Exemple : `MonMotDePasse123!@#`
   
   **Region** :
   - Choisissez la région la plus proche
   - Ex: `West Europe (Paris)` pour la France
   
   **Pricing Plan** :
   - Sélectionnez **"Free"** (gratuit, suffisant pour commencer)

3. Cliquez sur **"Create new project"**
4. ⏳ Attendez 2-3 minutes que le projet soit créé

---

## 🔑 Étape 3 : Récupérer les Clés API

Une fois le projet créé :

1. Dans le menu de gauche, allez dans **Settings** (⚙️)
2. Cliquez sur **API**

Vous verrez maintenant **3 sections importantes** :

### 📍 Section 1 : Project URL

```
Project URL
https://xxxxxxxxxxxxx.supabase.co
```

**C'est votre `NEXT_PUBLIC_SUPABASE_URL`**

### 🔐 Section 2 : Project API keys

Vous verrez plusieurs clés :

#### a) `anon` `public` key
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5emFiYzEyMyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjM4OTY3MjgwLCJleHAiOjE5NTQ1NDMyODB9.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**C'est votre `NEXT_PUBLIC_SUPABASE_ANON_KEY`**

#### b) `service_role` `secret` key
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5emFiYzEyMyIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE2Mzg5NjcyODAsImV4cCI6MTk1NDU0MzI4MH0.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**C'est votre `SUPABASE_SERVICE_ROLE_KEY`**

⚠️ **ATTENTION** : Cette clé est **SECRÈTE** ! Ne la partagez jamais publiquement.

---

## 📋 Étape 4 : Copier les Clés dans .env.local

1. Ouvrez le fichier `.env.local` dans votre projet :
   ```bash
   /Users/fredericmmunoz/cursor1/cosmetic-formulator-web/.env.local
   ```

2. Remplacez les valeurs par vos vraies clés :

   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5emFiYzEyMyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjM4OTY3MjgwLCJleHAiOjE5NTQ1NDMyODB9.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5emFiYzEyMyIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE2Mzg5NjcyODAsImV4cCI6MTk1NDU0MzI4MH0.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

3. Sauvegardez le fichier

---

## ✅ Vérification

Pour vérifier que tout est correct :

```bash
cd /Users/fredericmmunoz/cursor1/cosmetic-formulator-web/scripts
npm run import
```

Si vous voyez :
```
✅ Variables d'environnement chargées depuis .env.local (3 variables)
```

C'est bon ! Le script vous demandera ensuite votre User ID.

---

## 🆔 Étape 5 : Obtenir votre User ID

Pour l'import, vous aurez besoin de votre User ID (UUID) :

### Option 1 : Via l'application web (après création de compte)

1. Lancez l'application : `npm run dev` dans le dossier racine
2. Allez sur [http://localhost:3000](http://localhost:3000)
3. Créez un compte
4. Dans Supabase → **Authentication** → **Users**, vous verrez votre utilisateur avec son UUID

### Option 2 : Créer un utilisateur directement dans Supabase

1. Dans Supabase, allez dans **Authentication** → **Users**
2. Cliquez sur **"Add user"** → **"Create new user"**
3. Entrez un email et un mot de passe
4. Copiez l'UUID qui apparaît dans la liste

---

## 📊 Étape 6 : Exécuter le Schéma SQL

Avant d'importer vos données Excel :

1. Dans Supabase, allez dans **SQL Editor**
2. Cliquez sur **"New query"**
3. Ouvrez le fichier `supabase/schema-complete.sql` de votre projet
4. Copiez tout le contenu
5. Collez dans l'éditeur SQL
6. Cliquez sur **"Run"** (ou `Cmd+Enter`)
7. ✅ Vous devriez voir "Success"

---

## 🎯 Résumé : Ce que vous obtenez

Après inscription et création du projet, vous avez :

✅ **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`  
✅ **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
✅ **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`  
✅ **Base de données PostgreSQL** (gratuite jusqu'à 500 MB)  
✅ **Authentification** (gratuite jusqu'à 50 000 utilisateurs/mois)  
✅ **Storage** (gratuit jusqu'à 1 GB)  

---

## 💡 Astuce

Le plan **Free** de Supabase est largement suffisant pour :
- Développement
- Tests
- Petites applications
- Jusqu'à 500 MB de base de données
- Jusqu'à 2 GB de bande passante/mois

Pour la production avec plus de données, vous pouvez passer au plan Pro plus tard.

---

## 🆘 Besoin d'aide ?

- [Documentation Supabase](https://supabase.com/docs)
- [Forum Supabase](https://github.com/supabase/supabase/discussions)
