# Sécurité et accès au logiciel

## Oui, le code et l’accès sont déjà protégés

### 1. Accès à l’application

- **Page d’accueil (`/`)** : si tu n’es pas connecté → redirection vers `/login`. Si tu es connecté → redirection vers `/dashboard`.
- **Dashboard (`/dashboard/*`)** : le layout vérifie l’utilisateur. S’il n’y a pas de session Supabase → **redirection vers `/login`**. Sans compte, impossible d’accéder au logiciel.
- **API d’import** (`/api/import/excel`) : vérification de l’utilisateur ; si non authentifié → réponse 401.

Donc : **tout le logiciel “métier” est derrière une connexion**. Pas de compte = pas d’accès.

### 2. Protection des données dans Supabase (RLS)

Dans Supabase, les **Row Level Security (RLS)** sont activées sur les tables métier (ingredients, formulas, allergens, packaging, etc.) :

- Chaque ligne est associée à une **organisation** (`organization_id`).
- Une politique du type : *« l’utilisateur ne peut voir/modifier que les lignes dont `organization_id` = l’organisation de son profil »* est appliquée (via la fonction `get_my_organization_id()`).
- Donc même en accédant directement à Supabase (SQL, API), **un utilisateur ne peut pas voir ou modifier les données d’une autre organisation**.

En résumé : **le code exige une connexion, et Supabase impose l’isolation des données par organisation.**

### 3. Flux “premier utilisateur / première organisation”

Quand tu t’inscris et que tu arrives pour la **première fois** sur le dashboard :

1. Tu es **déjà protégé** par l’auth (tu as dû te créer un compte).
2. Une page **onboarding** s’affiche : **« Nom de votre société »**. Tu saisis le nom (ex. La Canopée), tu cliques sur Continuer.
3. L’application crée une **organisation** avec ce nom et te rattache à elle (profil).
4. Ensuite tu utilises le logiciel comme **premier utilisateur** de cette organisation : tes données restent isolées par RLS.

Tu n’as pas besoin de “deuxième organisation” pour tester : une seule société, un seul utilisateur, tout est déjà sécurisé côté app et Supabase. Plus tard, tu pourras ajouter d’autres organisations ou utilisateurs si tu le souhaites.
