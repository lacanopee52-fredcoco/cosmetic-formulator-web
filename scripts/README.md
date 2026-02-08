# Scripts d'Import Excel

## 📋 Prérequis

1. Avoir exécuté le schéma SQL dans Supabase (`supabase/schema-complete.sql`)
2. Avoir votre fichier `DonnéesMP.xlsx` dans ce dossier
3. Avoir une clé **Service Role** de Supabase (pour bypasser RLS lors de l'import)

## 🔑 Obtenir la clé Service Role

1. Dans Supabase, allez dans **Settings** → **API**
2. Copiez la clé **service_role** (⚠️ Ne la partagez jamais publiquement!)
3. Ajoutez-la dans votre `.env.local` :

```env
SUPABASE_SERVICE_ROLE_KEY=votre_cle_service_role
```

## 🚀 Utilisation

### 1. Installer les dépendances

```bash
cd scripts
npm install
```

### 2. Placer le fichier Excel

Placez votre fichier `DonnéesMP.xlsx` dans le dossier `scripts/`

### 3. Exécuter l'import

```bash
npm run import
```

Le script vous demandera votre User ID (UUID de Supabase Auth).

### 4. Trouver votre User ID

Dans Supabase :
1. Allez dans **Authentication** → **Users**
2. Copiez l'UUID de votre utilisateur

## 📊 Structure attendue du fichier Excel

### Feuille "Liste"
Colonnes requises :
- `Code` (requis)
- `nom` (requis)
- `Fournisseur principal`
- `INCI`
- `Catégorie`
- `Prix au kilo`
- `En stock` (oui/non)
- `%PPAI`
- `%PPAI Bio`
- `%CPAI`
- `%CPAI Bio`
- `Fonctions`
- `N°CAS`
- `Impuretés`

### Feuille "Allergènes"
- Première colonne : `Code` (référence à l'ingrédient)
- Autres colonnes : Noms des allergènes avec pourcentages

### Feuille "Tests toxico"
- `Code` : Référence à l'ingrédient
- `Test` : Nom du test
- `Résultat` : Résultat du test
- `Date` : Date du test
- `Notes` : Notes additionnelles

### Feuille "Gamme bébé"
- `Code` : Référence à l'ingrédient
- `Approuvé` : oui/non
- `Restrictions` : Restrictions d'utilisation
- `Notes` : Notes additionnelles

## ⚠️ Important

- **Supabase est la source de vérité** : Après l'import, modifiez les données via l'application web, pas via Excel
- L'import utilise `upsert` : Les données existantes seront mises à jour si le Code correspond
- Les données sont liées à votre User ID : Seul vous verrez vos données importées

## 🔄 Réimporter

Si vous devez réimporter :
1. Le script utilisera `upsert` pour mettre à jour les données existantes
2. Les allergènes seront supprimés et réimportés pour éviter les doublons
3. Les autres tables relationnelles seront mises à jour
