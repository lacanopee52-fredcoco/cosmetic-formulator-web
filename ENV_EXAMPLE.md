# Configuration des Variables d'Environnement

## Créer le fichier .env.local

Créez un fichier `.env.local` à la racine du projet avec ce contenu :

```env
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anonyme_ici
```

## Où trouver ces valeurs ?

### 1. NEXT_PUBLIC_SUPABASE_URL

Dans votre projet Supabase :
1. Allez dans **Settings** → **API**
2. Copiez la valeur de **Project URL**
3. Elle ressemble à : `https://abcdefghijklmnop.supabase.co`

### 2. NEXT_PUBLIC_SUPABASE_ANON_KEY

Dans le même écran (Settings → API) :
1. Copiez la valeur de **anon public** (sous "Project API keys")
2. C'est une longue chaîne qui commence par `eyJ...`

## Exemple complet

```env
NEXT_PUBLIC_SUPABASE_URL=https://xyzabc123.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5emFiYzEyMyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjM4OTY3MjgwLCJleHAiOjE5NTQ1NDMyODB9.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## ⚠️ Important

- Ne commitez **JAMAIS** le fichier `.env.local` dans Git
- Il est déjà dans `.gitignore`
- Pour la production (Vercel), ajoutez ces variables dans les paramètres du projet Vercel
