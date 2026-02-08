# 📥 Instructions d'Import Excel vers Supabase

## Vue d'ensemble

Ce guide vous explique comment importer votre fichier Excel `DonnéesMP.xlsx` dans Supabase, en faisant de Supabase la **source de vérité** pour toutes les données.

## 🎯 Objectif

- ✅ Importer la feuille "Liste" comme table `ingredients`
- ✅ Créer des tables relationnelles pour les autres feuilles
- ✅ Établir Supabase comme source de vérité unique
- ✅ Permettre l'édition via l'application web

---

## 📋 Étape 1 : Préparer Supabase

### 1.1 Exécuter le schéma SQL

1. Dans Supabase, allez dans **SQL Editor**
2. Créez une nouvelle requête
3. Ouvrez le fichier `supabase/schema-complete.sql`
4. Copiez tout le contenu et exécutez-le
5. ✅ Vérifiez que les tables sont créées dans **Table Editor**

### 1.2 Obtenir la clé Service Role

1. Dans Supabase → **Settings** → **API**
2. Copiez la clé **service_role** (⚠️ Gardez-la secrète!)
3. Ajoutez-la dans `.env.local` :

```env
SUPABASE_SERVICE_ROLE_KEY=votre_cle_service_role_ici
```

---

## 📊 Étape 2 : Préparer le fichier Excel

### Structure attendue

Votre fichier `DonnéesMP.xlsx` doit contenir :

#### Feuille "Liste" (requise)
Colonnes à mapper :
- `Code` → `code` (PRIMARY KEY)
- `nom` → `nom`
- `Fournisseur principal` → `fournisseur_principal`
- `INCI` → `inci`
- `Catégorie` → `categorie`
- `Prix au kilo` → `prix_au_kilo`
- `En stock` → `en_stock` (oui/non → boolean)
- `%PPAI` → `pourcentage_ppai`
- `%PPAI Bio` → `pourcentage_ppai_bio`
- `%CPAI` → `pourcentage_cpai`
- `%CPAI Bio` → `pourcentage_cpai_bio`
- `Fonctions` → `fonctions`
- `N°CAS` → `numero_cas`
- `Impuretés` → `impuretes`

#### Feuille "Allergènes" (optionnelle)
- Première colonne : `Code` (référence à ingredients.code)
- Autres colonnes : Noms d'allergènes avec pourcentages

#### Feuille "Tests toxico" (optionnelle)
- `Code` : Référence à l'ingrédient
- `Test` : Nom du test
- `Résultat` : Résultat
- `Date` : Date du test
- `Notes` : Notes

#### Feuille "Gamme bébé" (optionnelle)
- `Code` : Référence à l'ingrédient
- `Approuvé` : oui/non
- `Restrictions` : Restrictions
- `Notes` : Notes

---

## 🚀 Étape 3 : Exécuter l'import

### 3.1 Installer les dépendances

```bash
cd scripts
npm install
```

### 3.2 Placer le fichier Excel

Placez `DonnéesMP.xlsx` dans le dossier `scripts/`

### 3.3 Trouver votre User ID

1. Dans Supabase → **Authentication** → **Users**
2. Créez un utilisateur si nécessaire (via l'app web)
3. Copiez l'UUID de l'utilisateur

### 3.4 Lancer l'import

```bash
npm run import
```

Le script vous demandera votre User ID. Collez l'UUID.

### 3.5 Vérifier l'import

1. Dans Supabase → **Table Editor**
2. Vérifiez la table `ingredients`
3. Vérifiez les tables relationnelles (`allergens`, `toxicology_tests`, `baby_range`)

---

## ✅ Après l'import

### ⚠️ Important : Supabase est maintenant la source de vérité

- ❌ **Ne modifiez plus** les données via Excel
- ✅ **Modifiez** les données via l'application web
- ✅ Toutes les modifications sont synchronisées en temps réel
- ✅ Les données sont sécurisées avec Row Level Security (RLS)

### Fonctionnalités disponibles

1. **Édition d'ingrédients** : Via l'interface web
2. **Création de formules** : Utilise les ingrédients de Supabase
3. **Gestion des allergènes** : Automatiquement liés aux ingrédients
4. **Tests toxicologiques** : Accessibles depuis les détails d'ingrédient
5. **Gamme bébé** : Filtrage et restrictions automatiques

---

## 🔄 Réimporter (si nécessaire)

Si vous devez réimporter :

1. Le script utilise `upsert` : Les données existantes seront mises à jour
2. Les allergènes seront supprimés et réimportés (pour éviter les doublons)
3. Les autres relations seront mises à jour

**Note** : Après réimport, toutes les modifications faites via l'app web seront écrasées. Utilisez avec précaution.

---

## 🐛 Dépannage

### Erreur "Table does not exist"
→ Vérifiez que vous avez bien exécuté `schema-complete.sql`

### Erreur "Permission denied"
→ Vérifiez que vous utilisez la clé **service_role**, pas la clé **anon**

### Erreur "User ID not found"
→ Vérifiez que l'UUID est correct dans Supabase Auth

### Données manquantes
→ Vérifiez que les noms de colonnes dans Excel correspondent exactement (sensible à la casse)

---

## 📚 Structure de la base de données

```
ingredients (table principale)
├── code (PK)
├── nom
├── fournisseur_principal
├── inci
├── categorie
├── prix_au_kilo
├── en_stock
├── pourcentage_ppai
├── pourcentage_ppai_bio
├── pourcentage_cpai
├── pourcentage_cpai_bio
├── fonctions
├── numero_cas
├── impuretes
└── user_id (FK → auth.users)

allergens (table relationnelle)
├── ingredient_code (FK → ingredients.code)
├── allergen_name
└── percentage

toxicology_tests (table relationnelle)
├── ingredient_code (FK → ingredients.code)
├── test_name
├── test_result
└── test_date

baby_range (table relationnelle)
├── ingredient_code (FK → ingredients.code)
├── approved
└── restrictions
```

---

## 🎯 Prochaines étapes

Après l'import réussi :

1. ✅ Tester l'application web
2. ✅ Vérifier que les ingrédients s'affichent
3. ✅ Créer une formule de test
4. ✅ Modifier un ingrédient via l'interface web
5. ✅ Vérifier que les modifications persistent dans Supabase
