# 🚀 Guide pour Tester l'Application en Ligne

## 📋 Prérequis

1. Un compte Supabase (gratuit) : [supabase.com](https://supabase.com)
2. Node.js installé (v18 ou supérieur)
3. Un compte Vercel (gratuit) pour le déploiement : [vercel.com](https://vercel.com)

---

## 🔧 Étape 1 : Configurer Supabase

### 1.1 Créer un projet Supabase

1. Allez sur [supabase.com](https://supabase.com)
2. Cliquez sur **"New Project"**
3. Remplissez :
   - **Name** : `cosmetic-formulator` (ou autre nom)
   - **Database Password** : Choisissez un mot de passe fort (notez-le !)
   - **Region** : Choisissez la région la plus proche (ex: `West Europe`)
4. Cliquez sur **"Create new project"**
5. ⏳ Attendez 2-3 minutes que le projet soit créé

### 1.2 Exécuter le schéma SQL

1. Dans votre projet Supabase, allez dans **SQL Editor** (menu de gauche)
2. Cliquez sur **"New query"**
3. Ouvrez le fichier `supabase/schema.sql` de ce projet
4. Copiez tout le contenu
5. Collez-le dans l'éditeur SQL de Supabase
6. Cliquez sur **"Run"** (ou appuyez sur `Cmd+Enter`)
7. ✅ Vous devriez voir "Success. No rows returned"

### 1.3 Récupérer les clés API

1. Dans Supabase, allez dans **Settings** → **API**
2. Notez :
   - **Project URL** (ex: `https://xxxxx.supabase.co`)
   - **anon public** key (longue chaîne de caractères)

---

## 🔐 Étape 2 : Configurer les Variables d'Environnement

### 2.1 Créer le fichier .env.local

Dans le dossier `cosmetic-formulator-web`, créez un fichier `.env.local` :

```bash
cd /Users/fredericmmunoz/cursor1/cosmetic-formulator-web
touch .env.local
```

### 2.2 Ajouter les clés Supabase

Ouvrez `.env.local` et ajoutez :

```env
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anonyme_ici
```

**Remplacez** :
- `https://votre-projet.supabase.co` par votre **Project URL** de Supabase
- `votre_cle_anonyme_ici` par votre **anon public** key

### 2.3 Vérifier le fichier

Votre `.env.local` devrait ressembler à :
```env
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzODk2NzI4MCwiZXhwIjoxOTU0NTQzMjgwfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 💻 Étape 3 : Tester Localement

### 3.1 Installer les dépendances

```bash
cd /Users/fredericmmunoz/cursor1/cosmetic-formulator-web
npm install
```

### 3.2 Lancer le serveur de développement

```bash
npm run dev
```

### 3.3 Accéder à l'application

Ouvrez votre navigateur sur : **http://localhost:3000**

Vous devriez voir :
- La page de login
- Possibilité de créer un compte
- Après connexion, accès au dashboard

### 3.4 Tester l'application

1. **Créer un compte** :
   - Cliquez sur "S'inscrire"
   - Entrez un email et un mot de passe
   - Vous serez automatiquement connecté

2. **Importer des matières premières** :
   - Allez dans "📥 Importer Matières"
   - (Cette fonctionnalité doit encore être migrée)

3. **Créer une formule** :
   - Allez dans "✏️ Nouvelle Formule"
   - (Cette fonctionnalité doit encore être migrée)

---

## 🌐 Étape 4 : Déployer en Ligne (Vercel)

### 4.1 Préparer le projet

Assurez-vous que tout fonctionne localement avant de déployer.

### 4.2 Créer un compte Vercel

1. Allez sur [vercel.com](https://vercel.com)
2. Cliquez sur **"Sign Up"**
3. Connectez-vous avec GitHub (recommandé)

### 4.3 Déployer le projet

#### Option A : Via l'interface Vercel

1. Dans Vercel, cliquez sur **"Add New Project"**
2. Importez votre repository GitHub (ou créez-en un)
3. Vercel détectera automatiquement Next.js
4. **Important** : Ajoutez les variables d'environnement :
   - `NEXT_PUBLIC_SUPABASE_URL` = votre URL Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = votre clé anonyme
5. Cliquez sur **"Deploy"**
6. ⏳ Attendez 2-3 minutes
7. ✅ Votre application sera en ligne !

#### Option B : Via la ligne de commande

```bash
# Installer Vercel CLI
npm i -g vercel

# Se connecter
vercel login

# Déployer
cd /Users/fredericmmunoz/cursor1/cosmetic-formulator-web
vercel

# Suivre les instructions
# Quand demandé, ajoutez les variables d'environnement
```

### 4.4 Accéder à votre application en ligne

Après le déploiement, Vercel vous donnera une URL comme :
- `https://cosmetic-formulator-web.vercel.app`

Votre application est maintenant accessible partout dans le monde ! 🌍

---

## 🔍 Vérification

### Checklist avant déploiement

- [ ] Supabase projet créé
- [ ] Schéma SQL exécuté
- [ ] Variables d'environnement configurées
- [ ] Application fonctionne en local (`npm run dev`)
- [ ] Peut créer un compte et se connecter
- [ ] Dashboard s'affiche correctement

### En cas de problème

1. **Erreur de connexion Supabase** :
   - Vérifiez que les variables d'environnement sont correctes
   - Vérifiez que le projet Supabase est actif

2. **Erreur "Table does not exist"** :
   - Vérifiez que le schéma SQL a bien été exécuté
   - Allez dans Supabase → Table Editor pour voir les tables

3. **Erreur d'authentification** :
   - Vérifiez que RLS est activé sur les tables
   - Vérifiez les politiques RLS dans Supabase

---

## 📝 Notes Importantes

1. **Sécurité** : Les clés dans `.env.local` sont pour le développement local. Pour la production, utilisez les variables d'environnement de Vercel.

2. **RLS** : Row Level Security est activé. Chaque utilisateur ne voit que ses propres données.

3. **Gratuit** : Les plans gratuits de Supabase et Vercel sont suffisants pour tester et développer.

4. **Migration** : Les composants de l'ancienne version Electron doivent encore être migrés. Seule la structure de base est prête.

---

## 🎯 Prochaines Étapes

Une fois que l'application fonctionne en ligne :

1. Migrer les composants depuis l'ancienne version
2. Tester toutes les fonctionnalités
3. Ajouter le stockage d'images (Supabase Storage)
4. Personnaliser le design si nécessaire

---

## 🆘 Besoin d'aide ?

- [Documentation Supabase](https://supabase.com/docs)
- [Documentation Next.js](https://nextjs.org/docs)
- [Documentation Vercel](https://vercel.com/docs)
