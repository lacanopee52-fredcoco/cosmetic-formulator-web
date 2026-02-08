# Guide de Migration - Cosmetic Formulator Web

## ✅ Ce qui a été créé

### Structure Next.js
- ✅ Projet Next.js 15 avec App Router
- ✅ TypeScript configuré
- ✅ Tailwind CSS configuré

### Authentification Supabase
- ✅ Pages de login et signup
- ✅ Middleware de protection des routes
- ✅ Navigation avec déconnexion
- ✅ Layout du dashboard

### Configuration Supabase
- ✅ Clients Supabase (browser et server)
- ✅ Schéma SQL complet avec RLS (Row Level Security)
- ✅ Types TypeScript

## 🚀 Prochaines étapes

### 1. Configuration Supabase

1. Créez un compte sur [supabase.com](https://supabase.com)
2. Créez un nouveau projet
3. Dans SQL Editor, exécutez le contenu de `supabase/schema.sql`
4. Copiez votre URL et votre clé anonyme

### 2. Variables d'environnement

Créez un fichier `.env.local` à la racine :

```env
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anonyme
```

### 3. Migration des composants

Les composants suivants doivent être migrés depuis `cosmetic-formulator/src/components/` :

- [ ] `ImportPage.tsx` → `app/dashboard/import/page.tsx`
- [ ] `FormulationPage.tsx` → `app/dashboard/formulation/page.tsx`
- [ ] `FormulasList.tsx` → `app/dashboard/formulas/page.tsx`
- [ ] `FormulaTable.tsx` → `components/FormulaTable.tsx`
- [ ] `MaterialAutocomplete.tsx` → `components/MaterialAutocomplete.tsx`
- [ ] `MaterialModal.tsx` → `components/MaterialModal.tsx`
- [ ] `StabilityTracker.tsx` → `components/StabilityTracker.tsx`
- [ ] `AllergenTracker.tsx` → `components/AllergenTracker.tsx`
- [ ] `INCIList.tsx` → `components/INCIList.tsx`
- [ ] `NotesResultsMenu.tsx` → `components/NotesResultsMenu.tsx`
- [ ] `HistoryButton.tsx` → `components/HistoryButton.tsx`

### 4. Remplacement des appels Electron par Supabase

#### Avant (Electron)
```typescript
const materials = await window.electronAPI.getRawMaterials()
```

#### Après (Supabase)
```typescript
const supabase = createClient()
const { data: materials } = await supabase
  .from('raw_materials')
  .select('*')
  .eq('user_id', user.id)
```

### 5. Import Excel côté client

L'import Excel doit être fait côté client avec `xlsx` :

```typescript
import * as XLSX from 'xlsx'

const file = event.target.files[0]
const workbook = XLSX.read(await file.arrayBuffer())
// ... parser les données
```

### 6. Stockage des images

Utiliser Supabase Storage au lieu de base64 :

```typescript
const { data, error } = await supabase.storage
  .from('formula-images')
  .upload(`${user.id}/${formulaId}.png`, imageFile)
```

## 📝 Notes importantes

1. **RLS (Row Level Security)** : Toutes les tables ont RLS activé. Chaque utilisateur ne voit que ses propres données.

2. **Authentification requise** : Toutes les routes `/dashboard/*` nécessitent une authentification.

3. **User ID** : Utilisez `user.id` de Supabase Auth pour filtrer les données.

4. **Images** : Créez un bucket `formula-images` dans Supabase Storage avec les permissions appropriées.

## 🔄 Différences principales

| Electron | Supabase Web |
|----------|--------------|
| `window.electronAPI.getRawMaterials()` | `supabase.from('raw_materials').select()` |
| SQLite local | PostgreSQL cloud |
| Fichiers locaux | Supabase Storage |
| Pas d'auth | Supabase Auth |
| Desktop uniquement | Web accessible partout |

## 📚 Ressources

- [Documentation Supabase](https://supabase.com/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
