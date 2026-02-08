# Cosmetic Formulator - Web Version

Application web de formulation cosmétique avec Next.js et Supabase.

## 🚀 Configuration

### 1. Créer un projet Supabase

1. Allez sur [supabase.com](https://supabase.com)
2. Créez un nouveau projet
3. Notez votre URL et votre clé anonyme

### 2. Configurer les variables d'environnement

Copiez `.env.local.example` vers `.env.local` et remplissez les valeurs :

```bash
cp .env.local.example .env.local
```

Puis éditez `.env.local` avec vos clés Supabase.

### 3. Créer le schéma de base de données

Dans votre projet Supabase, allez dans SQL Editor et exécutez le contenu de `supabase/schema.sql`.

### 4. Installer les dépendances

```bash
npm install
```

### 5. Lancer l'application

```bash
npm run dev
```

L'application sera accessible sur [http://localhost:3000](http://localhost:3000)

## 📁 Structure du projet

```
cosmetic-formulator-web/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Routes d'authentification
│   ├── dashboard/          # Tableau de bord
│   └── api/               # API Routes
├── components/            # Composants React
├── lib/                   # Utilitaires
│   └── supabase/         # Clients Supabase
├── types/                 # Types TypeScript
└── supabase/             # Schémas SQL
```

## 🔐 Authentification

L'application utilise Supabase Auth pour l'authentification. Les utilisateurs peuvent :
- S'inscrire avec email/password
- Se connecter
- Gérer leur profil

## 💾 Base de données

Toutes les données sont stockées dans Supabase PostgreSQL avec Row Level Security (RLS) pour garantir que chaque utilisateur ne voit que ses propres données.

## 📦 Fonctionnalités

- ✅ Import de matières premières depuis Excel
- ✅ Création et gestion de formules
- ✅ Calcul automatique des coûts
- ✅ Suivi de stabilité
- ✅ Gestion des allergènes
- ✅ Liste INCI
- ✅ Notes structurées
- ✅ Authentification utilisateur
