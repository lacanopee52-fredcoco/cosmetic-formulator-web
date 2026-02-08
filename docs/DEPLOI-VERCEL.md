# Déployer l’app sur Vercel

Guide pas à pas pour mettre ton logiciel Cosmetic Formulator en ligne avec Vercel.

---

## Prérequis

1. **Un compte GitHub** (gratuit) — [github.com](https://github.com)
2. **Ton projet sur GitHub** — le dossier `cosmetic-formulator-web` doit être poussé dans un dépôt (repository).
3. **Les identifiants Supabase** — tu les as déjà : URL du projet et clé « anon » (Settings → API dans le dashboard Supabase).

---

## Étape 1 : Mettre le code sur GitHub (si ce n’est pas déjà fait)

1. Va sur [github.com](https://github.com), connecte-toi, puis clique sur **New repository** (ou **+** → **New repository**).
2. Donne un nom au dépôt (ex. `cosmetic-formulator-web`), laisse **Public**, ne coche pas « Add a README », puis **Create repository**.
3. Sur ton Mac, ouvre un **terminal** dans le dossier du projet :
   ```bash
   cd /Users/fredericmmunoz/cursor1/cosmetic-formulator-web
   ```
4. Si Git n’est pas encore initialisé :
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```
5. Relie le dépôt et pousse le code (remplace `TON_COMPTE` par ton nom d’utilisateur GitHub et `cosmetic-formulator-web` par le nom du repo si différent) :
   ```bash
   git remote add origin https://github.com/TON_COMPTE/cosmetic-formulator-web.git
   git branch -M main
   git push -u origin main
   ```
   Si on te demande de te connecter à GitHub, suis les instructions (mot de passe ou token).

---

## Étape 2 : Créer un compte Vercel

1. Va sur [vercel.com](https://vercel.com).
2. Clique sur **Sign Up**.
3. Choisis **Continue with GitHub** et autorise Vercel à accéder à ton compte GitHub.

---

## Étape 3 : Importer le projet

1. Une fois connecté à Vercel, clique sur **Add New…** → **Project** (ou **Import Project**).
2. Tu vois la liste de tes dépôts GitHub. Clique sur **Import** à côté de **cosmetic-formulator-web** (ou du nom de ton repo).
3. Sur la page de configuration :
   - **Framework Preset** : doit être **Next.js** (détecté automatiquement).
   - **Root Directory** : laisse vide si tout le projet Next.js est à la racine du dépôt.
   - **Build and Output Settings** : tu peux laisser par défaut.

---

## Étape 4 : Variables d’environnement (obligatoire)

Sans ces variables, l’app ne pourra pas parler à Supabase.

1. Sur la même page (avant de déployer), ouvre la section **Environment Variables**.
2. Ajoute **deux variables** :

   | Name                         | Value                                                                 |
   |-----------------------------|-----------------------------------------------------------------------|
   | `NEXT_PUBLIC_SUPABASE_URL`  | L’URL de ton projet Supabase (ex. `https://xxxxx.supabase.co`)      |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | La clé « anon » (longue chaîne de caractères)                    |

   Où les trouver : **Supabase** → ton projet → **Settings** (icône engrenage) → **API** :
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Project API keys** → **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. Coche **Production**, **Preview** et **Development** pour chaque variable (ou au minimum **Production**).
4. Clique sur **Add** pour chaque ligne.

---

## Étape 5 : Déployer

1. Clique sur **Deploy**.
2. Vercel build puis déploie ton app (1 à 2 minutes).
3. Quand c’est vert (**Congratulations!**), clique sur **Visit** (ou sur l’URL affichée).

Tu obtiens une adresse du type : **`https://cosmetic-formulator-web-xxx.vercel.app`**.  
C’est l’URL de ton logiciel en ligne.

---

## Étape 6 : Autoriser l’URL dans Supabase (Auth)

Pour que la connexion / inscription fonctionne depuis l’URL Vercel :

1. **Supabase** → **Authentication** → **URL Configuration** (ou **Settings** → **Auth**).
2. Dans **Redirect URLs** (ou **Site URL**), ajoute l’URL de ton déploiement, par ex. :
   - `https://cosmetic-formulator-web-xxx.vercel.app`
   - `https://cosmetic-formulator-web-xxx.vercel.app/**`
3. Si tu vois **Site URL**, mets-y la même URL (sans `/**`).
4. Sauvegarde.

Tu peux ensuite tester : aller sur l’URL Vercel → Inscription ou Connexion → tout doit fonctionner comme en local.

---

## Après le premier déploiement

- **Chaque push sur `main`** (ou la branche par défaut) déclenche un nouveau déploiement automatique.
- Les **variables d’environnement** peuvent être modifiées dans Vercel : **Project** → **Settings** → **Environment Variables**.

---

## Récap

| Étape | Action |
|-------|--------|
| 1 | Mettre le code sur GitHub |
| 2 | Créer un compte Vercel (avec GitHub) |
| 3 | Importer le dépôt comme projet Next.js |
| 4 | Ajouter `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| 5 | Cliquer sur Deploy |
| 6 | Ajouter l’URL Vercel dans Supabase (Auth → Redirect URLs / Site URL) |

Si tu bloques sur une étape (par ex. « je ne trouve pas les variables Supabase » ou « le build échoue »), dis-moi à quelle étape tu es et le message exact, et on le fait ensemble.
