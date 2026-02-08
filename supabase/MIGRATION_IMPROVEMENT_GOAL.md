# Migration : objectif d'amélioration (improvement_goal)

Pour activer le champ « Objectif d'amélioration » sur les formules, exécutez dans Supabase → SQL Editor :

```sql
ALTER TABLE formulas ADD COLUMN IF NOT EXISTS improvement_goal TEXT;
```
