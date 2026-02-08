# Multi-tenant : étapes à faire de ton côté

Ce guide décrit ce que tu dois faire après les modifications du code (helper, contexte, migration).

---

## Étape 1 : Vérifier les noms des contraintes (optionnel mais recommandé)

La migration supprime des contraintes uniques sur `baby_range` et `packaging`. Les noms peuvent varier selon ta base.

1. Ouvre le **Dashboard Supabase** de ton projet.
2. Va dans **SQL Editor**.
3. Exécute cette requête pour lister les contraintes :

```sql
SELECT conname, conrelid::regclass
FROM pg_constraint
WHERE conrelid IN ('baby_range'::regclass, 'packaging'::regclass)
  AND contype = 'u';
```

4. Note les noms affichés (colonnes `conname`).
5. Si un nom est différent de :
   - `baby_range_ingredient_code_user_id_key` pour la table `baby_range`
   - `packaging_user_id_description_key` pour la table `packaging`
   alors ouvre le fichier :
   `supabase/migrations/20260206120000_add_organizations_multi_tenant.sql`
   et remplace le nom dans la ligne `DROP CONSTRAINT IF EXISTS ...` par le nom affiché.

---

## Étape 2 : Exécuter les migrations

### Option A : Via le Dashboard Supabase

**Migration 1 – Multi-tenant (organisations, profils, RLS)**  
1. Dans le **Dashboard Supabase**, va dans **SQL Editor**.
2. Ouvre le fichier :  
   `cosmetic-formulator-web/supabase/migrations/20260206120000_add_organizations_multi_tenant.sql`
3. Copie **tout** le contenu, colle-le dans l’éditeur SQL, puis **Run**.
4. Vérifie qu’il n’y a pas d’erreur. Si une ligne `DROP CONSTRAINT` échoue, reviens à l’étape 1 et corrige le nom.

**Migration 2 – Onboarding (création organisation au premier login)**  
5. Dans le même **SQL Editor**, ouvre le fichier :  
   `cosmetic-formulator-web/supabase/migrations/20260208200000_onboarding_create_org_function.sql`
6. Copie tout le contenu, colle-le, puis **Run**.  
   Cette fonction permet à un nouvel utilisateur de créer sa société (sans blocage RLS).

### Option B : Via la CLI Supabase (si tu l’utilises)

1. Ouvre un terminal dans le dossier du projet :
   ```bash
   cd cosmetic-formulator-web
   ```
2. Lance les migrations :
   ```bash
   npx supabase db push
   ```
   (ou `supabase db push` si la CLI est installée globalement.)
3. Si une erreur indique qu’une contrainte n’existe pas, adapte le nom dans la migration comme à l’étape 1, puis réessaie.

---

## Étape 3 : Vérifier que tout fonctionne

1. **Démarrer l’app en local** (si ce n’est pas déjà fait) :
   ```bash
   cd cosmetic-formulator-web
   npm run dev
   ```

2. **Connexion** : va sur la page de login, connecte-toi (ou crée un compte).

3. **Premier accès au dashboard** :
   - Va sur `/dashboard` (ou la page d’accueil après login).
   - Rien à faire de spécial : le layout crée automatiquement une organisation « Mon organisation » et ton profil si besoin.

4. **Vérifier les données** :
   - Ouvre la **Formulation** : crée ou modifie une formule, enregistre.
   - Ouvre la **Liste des formules** : tu dois voir tes formules.
   - Si tu as l’import Excel : lance un import et vérifie qu’il se termine sans erreur.

5. **Vérifier en base (optionnel)** :
   - Dans Supabase → **Table Editor** :
     - Table `organizations` : tu dois voir au moins une ligne (ex. « Default » ou « Mon organisation »).
     - Table `profiles` : une ligne avec ton `user_id` et un `organization_id`.
   - Les tables métier (formulas, ingredients, etc.) doivent avoir la colonne `organization_id` remplie.

---

## Étape 4 : En cas d’erreur sur la migration

- **Erreur du type "constraint ... does not exist"**  
  → Utilise l’étape 1 pour trouver le bon nom de contrainte et corrige le `DROP CONSTRAINT` dans le fichier de migration, puis réexécute uniquement les lignes concernées dans le SQL Editor (ou refais un `db push` après correction).

- **Erreur "column ... does not exist"**  
  → Vérifie que tu as bien exécuté **toute** la migration (tout le fichier), et que ta base a bien les tables `ingredients`, `formulas`, `allergens`, etc. telles que définies dans tes autres migrations.

- **Après migration : "Organisation introuvable" ou 403**  
  → Vérifie dans `profiles` que ton `user_id` (celui de Supabase Auth) a bien une ligne avec un `organization_id`. Si non, la migration devait créer les profils pour les utilisateurs existants ; revérifier la section de la migration qui fait les `INSERT INTO profiles ...`.

---

## Récapitulatif

| Étape | Action |
|-------|--------|
| 1 | (Optionnel) Vérifier les noms des contraintes uniques dans Supabase |
| 2 | Exécuter la migration (SQL Editor ou `supabase db push`) |
| 3 | Tester : login → dashboard → formulation / formules / import |
| 4 | En cas d’erreur : adapter le nom de contrainte ou vérifier que toute la migration a été exécutée |

Une fois ces étapes faites, ton app est en multi-tenant : chaque utilisateur est rattaché à une organisation et les données sont isolées par `organization_id`.
