-- Corriger la clé primaire de ingredients pour que l'upsert (organization_id, code) fonctionne.
-- À exécuter dans le SQL Editor Supabase si l'erreur "duplicate key violates ingredients_pkey" persiste.

-- 1) Supprimer les FK qui référencent ingredients (elles empêchent de changer la PK)
ALTER TABLE formula_lines DROP CONSTRAINT IF EXISTS formula_lines_ingredient_code_fkey;
ALTER TABLE allergens DROP CONSTRAINT IF EXISTS allergens_ingredient_code_fkey;
ALTER TABLE allergens DROP CONSTRAINT IF EXISTS allergens_ingredient_fkey;
ALTER TABLE toxicology_tests DROP CONSTRAINT IF EXISTS toxicology_tests_ingredient_code_fkey;
ALTER TABLE toxicology_tests DROP CONSTRAINT IF EXISTS toxicology_tests_ingredient_fkey;
ALTER TABLE baby_range DROP CONSTRAINT IF EXISTS baby_range_ingredient_code_fkey;
ALTER TABLE baby_range DROP CONSTRAINT IF EXISTS baby_range_ingredient_fkey;

-- 2) Remplacer la clé primaire par (organization_id, code)
ALTER TABLE ingredients DROP CONSTRAINT IF EXISTS ingredients_pkey;
ALTER TABLE ingredients ADD PRIMARY KEY (organization_id, code);

-- 3) Réajouter les FK (ignorer l'erreur si elles existent déjà)
ALTER TABLE allergens DROP CONSTRAINT IF EXISTS allergens_ingredient_fkey;
ALTER TABLE allergens ADD CONSTRAINT allergens_ingredient_fkey
  FOREIGN KEY (organization_id, ingredient_code) REFERENCES ingredients(organization_id, code) ON DELETE CASCADE;

ALTER TABLE toxicology_tests DROP CONSTRAINT IF EXISTS toxicology_tests_ingredient_fkey;
ALTER TABLE toxicology_tests ADD CONSTRAINT toxicology_tests_ingredient_fkey
  FOREIGN KEY (organization_id, ingredient_code) REFERENCES ingredients(organization_id, code) ON DELETE CASCADE;

ALTER TABLE baby_range DROP CONSTRAINT IF EXISTS baby_range_ingredient_fkey;
ALTER TABLE baby_range ADD CONSTRAINT baby_range_ingredient_fkey
  FOREIGN KEY (organization_id, ingredient_code) REFERENCES ingredients(organization_id, code) ON DELETE CASCADE;
