# Confirmation d'email et connexion

Pour que le lien de confirmation reçu par email **ouvre bien une session** et redirige vers le dashboard :

## 1. URL de redirection dans Supabase

Dans **Supabase Dashboard** → **Authentication** → **URL Configuration** → **Redirect URLs**, ajoutez :

- En production : `https://cosmetic-formulator-web.vercel.app/auth/callback`
- En local : `http://localhost:3000/auth/callback`

## 2. Flux PKCE (recommandé)

Pour que le lien de confirmation envoie un **code** (et non les tokens dans l’URL), utilisez le flux PKCE :

- **Authentication** → **Providers** → **Email** : garder la confirmation activée.
- Vérifier que le projet utilise bien le flux par **code** pour les redirections (c’est souvent le cas avec les projets récents).

Quand l’utilisateur clique sur le lien dans l’email :

1. Supabase redirige vers `https://votre-app.com/auth/callback?code=...`
2. La route `/auth/callback` échange ce code contre une session et enregistre les cookies.
3. L’utilisateur est redirigé vers `/dashboard` et est connecté.

## 3. Si la connexion ne fonctionne pas après le clic

- Vérifier que l’URL exacte de callback (avec le bon domaine) est bien dans **Redirect URLs**.
- Si votre projet Supabase n’utilise pas encore le flux par code pour l’email, activer **PKCE** dans les réglages Auth si l’option existe, ou contacter le support Supabase pour ce point.

## 4. Désactiver la confirmation d’email (développement uniquement)

Pour tester sans email de confirmation :

- **Authentication** → **Providers** → **Email** → désactiver **“Confirm email”**.

En production, il est préférable de garder la confirmation activée et de configurer correctement le callback ci-dessus.
