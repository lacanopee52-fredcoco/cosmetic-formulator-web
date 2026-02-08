# Migration : table IFRA (ifra_limits)

Pour activer l’import de l’onglet IFRA et l’export IFRA, exécutez dans Supabase → SQL Editor le contenu de :

`supabase/migrations/20260205120000_add_ifra_limits_table.sql`

Ou copiez-collez :

```sql
CREATE TABLE IF NOT EXISTS ifra_limits (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_number TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  ingredient_code TEXT NOT NULL,
  limit_percent REAL NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ifra_limits_user_id ON ifra_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_ifra_limits_ingredient ON ifra_limits(user_id, ingredient_code);
ALTER TABLE ifra_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own ifra_limits" ON ifra_limits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own ifra_limits" ON ifra_limits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own ifra_limits" ON ifra_limits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own ifra_limits" ON ifra_limits FOR DELETE USING (auth.uid() = user_id);
```

## Format de l’onglet Excel IFRA

- **Ligne 2 à partir de la colonne G** : numéros de catégories (G = 1re catégorie, H = 2e, I = 3e, etc.)
- **Ligne 3 à partir de la colonne G** : descriptions (même ordre)
- **À partir de la ligne 4** : une ligne par matière — **col. A** = code matière première, **col. G, H, I…** = limite en % pour chaque catégorie

Après import, l’**Export IFRA** (menu Export sur la page Formule) génère un tableau : Catégories, Description, une colonne par matière avec le %, et une colonne « Non limité » lorsque la limite est 100 %.
