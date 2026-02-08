# 🔑 Quelle Clé Copier Où ?

## 📋 Les Deux Types de Clés

Dans Supabase → Settings → API, vous voyez :

### 1. 🔓 Clé PUBLIABLE (anon public)
```
anon public
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
- ✅ **Sécurisée** pour le frontend
- ✅ Peut être dans le code JavaScript
- ✅ Utilisée par l'application web
- ⚠️ Limite les permissions (via RLS)

### 2. 🔒 Clé SECRÈTE (service_role)
```
service_role secret
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
- ❌ **NE JAMAIS** exposer publiquement
- ❌ Ne jamais mettre dans le code frontend
- ✅ Uniquement pour les scripts serveur
- ✅ Contourne RLS (toutes les permissions)

---

## 📝 Configuration dans .env.local

Dans votre fichier `.env.local`, vous devez mettre **LES DEUX** :

```env
# Clé PUBLIABLE (pour l'application web)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (la clé anon public)

# Clé SECRÈTE (uniquement pour les scripts d'import)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (la clé service_role secret)
```

---

## 🎯 Résumé Simple

| Variable | Quelle Clé | Où la trouver |
|----------|-----------|---------------|
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **anon public** (publiable) | Supabase → Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | **service_role secret** (secrète) | Supabase → Settings → API → service_role secret |

---

## ✅ Exemple Complet

Dans Supabase → Settings → API, vous verrez :

```
Project API keys

[anon] [public]
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5emFiYzEyMyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjM4OTY3MjgwLCJleHAiOjE5NTQ1NDMyODB9.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
→ **Copiez celle-ci** pour `NEXT_PUBLIC_SUPABASE_ANON_KEY`

```
[service_role] [secret]
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5emFiYzEyMyIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE2Mzg5NjcyODAsImV4cCI6MTk1NDU0MzI4MH0.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
→ **Copiez celle-ci** pour `SUPABASE_SERVICE_ROLE_KEY`

---

## 🔒 Sécurité

### ✅ Sécurisé
- Mettre les clés dans `.env.local` (déjà dans `.gitignore`)
- La clé `anon public` dans le code frontend (Next.js la gère automatiquement)

### ❌ Dangereux
- Commiter `.env.local` dans Git
- Exposer la clé `service_role` publiquement
- Mettre la clé `service_role` dans le code frontend

---

## 💡 Pourquoi Deux Clés ?

- **Clé anon (publiable)** : 
  - Utilisée par l'application web
  - Respecte Row Level Security (RLS)
  - Chaque utilisateur ne voit que ses données

- **Clé service_role (secrète)** :
  - Utilisée uniquement pour les scripts d'import
  - Contourne RLS (nécessaire pour l'import initial)
  - Jamais dans le code frontend

---

## ✅ Vérification

Votre `.env.local` devrait ressembler à :

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... (clé anon public - longue chaîne)
SUPABASE_SERVICE_ROLE_KEY=eyJ... (clé service_role secret - longue chaîne)
```

Les deux clés commencent par `eyJ` et sont très longues (plusieurs centaines de caractères).
