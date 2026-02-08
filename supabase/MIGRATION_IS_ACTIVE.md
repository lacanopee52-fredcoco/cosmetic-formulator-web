# Migration : colonne is_active (formule active)

Si vous voyez l’erreur **"Could not find the 'is_active' column of 'formulas' in the schema cache"**, exécutez la migration suivante dans Supabase.

## Étapes

1. Ouvrez [Supabase](https://supabase.com) → votre projet.
2. Allez dans **SQL Editor**.
3. Cliquez sur **New query**.
4. Collez le SQL ci-dessous.
5. Cliquez sur **Run** (ou `Cmd+Enter`).

## SQL à exécuter

```sql
-- Formule active = version choisie pour la fabrication (une seule par nom de formule)
ALTER TABLE formulas ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_formulas_is_active ON formulas(user_id, name) WHERE is_active = true;
```

Après exécution, rechargez l’application : l’erreur doit disparaître.
