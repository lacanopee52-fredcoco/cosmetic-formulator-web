-- Migration minimale : ajouter organization_id aux tables utilisées par l'import Excel.
-- À exécuter si la grosse migration 20260206120000 n'a pas été appliquée (ou a échoué).
-- Ne modifie pas les clés primaires ni les FK existantes.

-- 1) Ingrédients
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
UPDATE ingredients i SET organization_id = p.organization_id FROM profiles p WHERE i.user_id = p.user_id;
UPDATE ingredients SET organization_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE organization_id IS NULL;
ALTER TABLE ingredients ALTER COLUMN organization_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_ingredients_org_code ON ingredients(organization_id, code);

-- 2) Allergens
ALTER TABLE allergens ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
UPDATE allergens a SET organization_id = p.organization_id FROM profiles p WHERE a.user_id = p.user_id;
UPDATE allergens SET organization_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE organization_id IS NULL;
ALTER TABLE allergens ALTER COLUMN organization_id SET NOT NULL;

-- 3) Toxicology tests
ALTER TABLE toxicology_tests ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
UPDATE toxicology_tests t SET organization_id = p.organization_id FROM profiles p WHERE t.user_id = p.user_id;
UPDATE toxicology_tests SET organization_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE organization_id IS NULL;
ALTER TABLE toxicology_tests ALTER COLUMN organization_id SET NOT NULL;

-- 4) Baby range (un seul enregistrement par org + ingrédient pour l'upsert)
ALTER TABLE baby_range ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
UPDATE baby_range b SET organization_id = p.organization_id FROM profiles p WHERE b.user_id = p.user_id;
UPDATE baby_range SET organization_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE organization_id IS NULL;
ALTER TABLE baby_range ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE baby_range DROP CONSTRAINT IF EXISTS baby_range_ingredient_code_user_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_baby_range_org_ingredient ON baby_range(organization_id, ingredient_code);

-- 5) Packaging (un seul emballage par org + description pour l'upsert)
ALTER TABLE packaging ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
UPDATE packaging pkg SET organization_id = p.organization_id FROM profiles p WHERE pkg.user_id = p.user_id;
UPDATE packaging SET organization_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE organization_id IS NULL;
ALTER TABLE packaging ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE packaging DROP CONSTRAINT IF EXISTS packaging_user_id_description_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_packaging_org_description ON packaging(organization_id, description);

-- 6) IFRA limits
ALTER TABLE ifra_limits ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
UPDATE ifra_limits il SET organization_id = p.organization_id FROM profiles p WHERE il.user_id = p.user_id;
UPDATE ifra_limits SET organization_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE organization_id IS NULL;
ALTER TABLE ifra_limits ALTER COLUMN organization_id SET NOT NULL;

-- 7) RLS : politiques basées sur organization_id (pour que l'utilisateur ne voie que les données de son org)
-- Ingredients
DROP POLICY IF EXISTS "Users can view their own ingredients" ON ingredients;
DROP POLICY IF EXISTS "Users can insert their own ingredients" ON ingredients;
DROP POLICY IF EXISTS "Users can update their own ingredients" ON ingredients;
DROP POLICY IF EXISTS "Users can delete their own ingredients" ON ingredients;
CREATE POLICY "Org select ingredients" ON ingredients FOR SELECT USING (organization_id = public.get_my_organization_id());
CREATE POLICY "Org insert ingredients" ON ingredients FOR INSERT WITH CHECK (organization_id = public.get_my_organization_id());
CREATE POLICY "Org update ingredients" ON ingredients FOR UPDATE USING (organization_id = public.get_my_organization_id());
CREATE POLICY "Org delete ingredients" ON ingredients FOR DELETE USING (organization_id = public.get_my_organization_id());
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients FORCE ROW LEVEL SECURITY;

-- Allergens
DROP POLICY IF EXISTS "Users can view their own allergens" ON allergens;
DROP POLICY IF EXISTS "Users can insert their own allergens" ON allergens;
DROP POLICY IF EXISTS "Users can update their own allergens" ON allergens;
DROP POLICY IF EXISTS "Users can delete their own allergens" ON allergens;
CREATE POLICY "Org select allergens" ON allergens FOR SELECT USING (organization_id = public.get_my_organization_id());
CREATE POLICY "Org insert allergens" ON allergens FOR INSERT WITH CHECK (organization_id = public.get_my_organization_id());
CREATE POLICY "Org update allergens" ON allergens FOR UPDATE USING (organization_id = public.get_my_organization_id());
CREATE POLICY "Org delete allergens" ON allergens FOR DELETE USING (organization_id = public.get_my_organization_id());
ALTER TABLE allergens ENABLE ROW LEVEL SECURITY;
ALTER TABLE allergens FORCE ROW LEVEL SECURITY;

-- Toxicology tests
DROP POLICY IF EXISTS "Users can view their own toxicology tests" ON toxicology_tests;
DROP POLICY IF EXISTS "Users can insert their own toxicology tests" ON toxicology_tests;
DROP POLICY IF EXISTS "Users can update their own toxicology tests" ON toxicology_tests;
DROP POLICY IF EXISTS "Users can delete their own toxicology tests" ON toxicology_tests;
CREATE POLICY "Org select toxicology_tests" ON toxicology_tests FOR SELECT USING (organization_id = public.get_my_organization_id());
CREATE POLICY "Org insert toxicology_tests" ON toxicology_tests FOR INSERT WITH CHECK (organization_id = public.get_my_organization_id());
CREATE POLICY "Org update toxicology_tests" ON toxicology_tests FOR UPDATE USING (organization_id = public.get_my_organization_id());
CREATE POLICY "Org delete toxicology_tests" ON toxicology_tests FOR DELETE USING (organization_id = public.get_my_organization_id());
ALTER TABLE toxicology_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE toxicology_tests FORCE ROW LEVEL SECURITY;

-- Baby range
DROP POLICY IF EXISTS "Users can view their own baby range" ON baby_range;
DROP POLICY IF EXISTS "Users can insert their own baby range" ON baby_range;
DROP POLICY IF EXISTS "Users can update their own baby range" ON baby_range;
DROP POLICY IF EXISTS "Users can delete their own baby range" ON baby_range;
CREATE POLICY "Org select baby_range" ON baby_range FOR SELECT USING (organization_id = public.get_my_organization_id());
CREATE POLICY "Org insert baby_range" ON baby_range FOR INSERT WITH CHECK (organization_id = public.get_my_organization_id());
CREATE POLICY "Org update baby_range" ON baby_range FOR UPDATE USING (organization_id = public.get_my_organization_id());
CREATE POLICY "Org delete baby_range" ON baby_range FOR DELETE USING (organization_id = public.get_my_organization_id());
ALTER TABLE baby_range ENABLE ROW LEVEL SECURITY;
ALTER TABLE baby_range FORCE ROW LEVEL SECURITY;

-- Packaging
DROP POLICY IF EXISTS "Users can view their own packaging" ON packaging;
DROP POLICY IF EXISTS "Users can insert their own packaging" ON packaging;
DROP POLICY IF EXISTS "Users can update their own packaging" ON packaging;
DROP POLICY IF EXISTS "Users can delete their own packaging" ON packaging;
CREATE POLICY "Org select packaging" ON packaging FOR SELECT USING (organization_id = public.get_my_organization_id());
CREATE POLICY "Org insert packaging" ON packaging FOR INSERT WITH CHECK (organization_id = public.get_my_organization_id());
CREATE POLICY "Org update packaging" ON packaging FOR UPDATE USING (organization_id = public.get_my_organization_id());
CREATE POLICY "Org delete packaging" ON packaging FOR DELETE USING (organization_id = public.get_my_organization_id());
ALTER TABLE packaging ENABLE ROW LEVEL SECURITY;
ALTER TABLE packaging FORCE ROW LEVEL SECURITY;

-- IFRA limits
DROP POLICY IF EXISTS "Users can view their own ifra_limits" ON ifra_limits;
DROP POLICY IF EXISTS "Users can insert their own ifra_limits" ON ifra_limits;
DROP POLICY IF EXISTS "Users can update their own ifra_limits" ON ifra_limits;
DROP POLICY IF EXISTS "Users can delete their own ifra_limits" ON ifra_limits;
CREATE POLICY "Org select ifra_limits" ON ifra_limits FOR SELECT USING (organization_id = public.get_my_organization_id());
CREATE POLICY "Org insert ifra_limits" ON ifra_limits FOR INSERT WITH CHECK (organization_id = public.get_my_organization_id());
CREATE POLICY "Org update ifra_limits" ON ifra_limits FOR UPDATE USING (organization_id = public.get_my_organization_id());
CREATE POLICY "Org delete ifra_limits" ON ifra_limits FOR DELETE USING (organization_id = public.get_my_organization_id());
ALTER TABLE ifra_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE ifra_limits FORCE ROW LEVEL SECURITY;
