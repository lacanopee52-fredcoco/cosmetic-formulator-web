# ⚡ Démarrage Rapide

## En 5 minutes

### 1. Créer un projet Supabase (2 min)

1. Allez sur [supabase.com](https://supabase.com) et créez un compte
2. Cliquez sur **"New Project"**
3. Choisissez un nom et une région
4. Notez le mot de passe de la base de données
5. Attendez la création du projet

### 2. Configurer la base de données (1 min)

1. Dans Supabase, allez dans **SQL Editor**
2. Cliquez sur **"New query"**
3. Ouvrez le fichier `supabase/schema.sql` de ce projet
4. Copiez-collez tout le contenu dans l'éditeur
5. Cliquez sur **"Run"** (ou `Cmd+Enter`)

### 3. Récupérer les clés (30 sec)

1. Dans Supabase, allez dans **Settings** → **API**
2. Copiez :
   - **Project URL**
   - **anon public** key

### 4. Configurer l'application (1 min)

1. Créez un fichier `.env.local` à la racine :
   ```bash
   cd /Users/fredericmmunoz/cursor1/cosmetic-formulator-web
   touch .env.local
   ```

2. Ajoutez dans `.env.local` :
   ```env
   NEXT_PUBLIC_SUPABASE_URL=votre_url_ici
   NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_ici
   ```

### 5. Lancer l'application (30 sec)

```bash
npm install
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur !

---

## ✅ Vérification

Si tout fonctionne, vous devriez voir :
- ✅ Page de login qui s'affiche
- ✅ Possibilité de créer un compte
- ✅ Après connexion, accès au dashboard

---

## 🐛 Problèmes courants

### "Invalid API key"
→ Vérifiez que vous avez bien copié la clé **anon public** (pas la clé service_role)

### "Table does not exist"
→ Vérifiez que vous avez bien exécuté le schéma SQL dans Supabase

### "Cannot connect to Supabase"
→ Vérifiez que votre URL Supabase est correcte dans `.env.local`

---

## 📚 Documentation complète

Pour plus de détails, consultez `GUIDE_TEST.md`
