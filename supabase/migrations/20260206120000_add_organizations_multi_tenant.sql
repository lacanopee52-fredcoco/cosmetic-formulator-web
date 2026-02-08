-- cosmetic-formulator-web/supabase/migrations/20260206120000_add_organizations_multi_tenant.sql

-- Multi-tenant: organisations et profils utilisateur
-- Chaque utilisateur appartient à une organisation ; les données sont filtrées par organization_id.

-- 1) Table organisations
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2) Table profils (lien user -> organisation)
CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can create organization" ON organizations FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can view own org" ON organizations FOR SELECT USING (id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can update own org" ON organizations FOR UPDATE USING (id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

-- 3) Organisation par défaut et profils pour les utilisateurs existants
INSERT INTO organizations (id, name) VALUES ('00000000-0000-0000-0000-000000000001'::uuid, 'Default')
ON CONFLICT (id) DO NOTHING;

-- Récupérer tous les user_id distincts des tables existantes et créer un profil pour chacun
INSERT INTO profiles (user_id, organization_id)
SELECT DISTINCT u.id, '00000000-0000-0000-0000-000000000001'::uuid
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = u.id);

-- 4) Fonction pour obtenir l'organisation de l'utilisateur connecté
CREATE OR REPLACE FUNCTION public.get_my_organization_id()
RETURNS UUID AS $$
  SELECT organization_id FROM profiles WHERE user_id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 5) Ajouter organization_id aux tables (on garde user_id pour traçabilité)

-- Ingrédients : ajouter organization_id puis changer la PK
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
UPDATE ingredients i SET organization_id = p.organization_id FROM profiles p WHERE i.user_id = p.user_id;
ALTER TABLE ingredients ALTER COLUMN organization_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_ingredients_org_code ON ingredients(organization_id, code);
-- Supprimer les anciennes FK avant de changer la PK ingredients
ALTER TABLE allergens DROP CONSTRAINT IF EXISTS allergens_ingredient_code_fkey;
ALTER TABLE toxicology_tests DROP CONSTRAINT IF EXISTS toxicology_tests_ingredient_code_fkey;
ALTER TABLE baby_range DROP CONSTRAINT IF EXISTS baby_range_ingredient_code_fkey;
ALTER TABLE formula_lines DROP CONSTRAINT IF EXISTS formula_lines_ingredient_code_fkey;
ALTER TABLE ingredients DROP CONSTRAINT IF EXISTS ingredients_pkey;
ALTER TABLE ingredients ADD PRIMARY KEY (organization_id, code);

-- Allergens : ajouter organization_id AVANT d'ajouter la nouvelle FK
ALTER TABLE allergens ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
UPDATE allergens a SET organization_id = p.organization_id FROM profiles p WHERE a.user_id = p.user_id;
ALTER TABLE allergens ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE allergens ADD CONSTRAINT allergens_ingredient_fkey FOREIGN KEY (organization_id, ingredient_code) REFERENCES ingredients(organization_id, code) ON DELETE CASCADE;

-- Toxicology_tests : idem
ALTER TABLE toxicology_tests ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
UPDATE toxicology_tests t SET organization_id = p.organization_id FROM profiles p WHERE t.user_id = p.user_id;
ALTER TABLE toxicology_tests ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE toxicology_tests ADD CONSTRAINT toxicology_tests_ingredient_fkey FOREIGN KEY (organization_id, ingredient_code) REFERENCES ingredients(organization_id, code) ON DELETE CASCADE;

-- Baby_range : idem
ALTER TABLE baby_range ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
UPDATE baby_range b SET organization_id = p.organization_id FROM profiles p WHERE b.user_id = p.user_id;
ALTER TABLE baby_range ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE baby_range ADD CONSTRAINT baby_range_ingredient_fkey FOREIGN KEY (organization_id, ingredient_code) REFERENCES ingredients(organization_id, code) ON DELETE CASCADE;
-- Un seul enregistrement par (organisation, ingrédient)
ALTER TABLE baby_range DROP CONSTRAINT IF EXISTS baby_range_ingredient_code_user_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_baby_range_org_ingredient ON baby_range(organization_id, ingredient_code);

ALTER TABLE formulas ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
UPDATE formulas f SET organization_id = p.organization_id FROM profiles p WHERE f.user_id = p.user_id;
ALTER TABLE formulas ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE packaging ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
UPDATE packaging pkg SET organization_id = p.organization_id FROM profiles p WHERE pkg.user_id = p.user_id;
ALTER TABLE packaging ALTER COLUMN organization_id SET NOT NULL;
-- Un seul emballage par (organisation, description)
ALTER TABLE packaging DROP CONSTRAINT IF EXISTS packaging_user_id_description_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_packaging_org_description ON packaging(organization_id, description);

ALTER TABLE ifra_limits ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
UPDATE ifra_limits il SET organization_id = p.organization_id FROM profiles p WHERE il.user_id = p.user_id;
ALTER TABLE ifra_limits ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE produit_fini ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
UPDATE produit_fini pf SET organization_id = p.organization_id FROM profiles p WHERE pf.user_id = p.user_id;
ALTER TABLE produit_fini ALTER COLUMN organization_id SET NOT NULL;

-- 6) RLS basé sur organization_id

-- Ingredients
DROP POLICY IF EXISTS "Users can view their own ingredients" ON ingredients;
DROP POLICY IF EXISTS "Users can insert their own ingredients" ON ingredients;
DROP POLICY IF EXISTS "Users can update their own ingredients" ON ingredients;
DROP POLICY IF EXISTS "Users can delete their own ingredients" ON ingredients;
CREATE POLICY "Org can manage ingredients" ON ingredients FOR ALL USING (organization_id = public.get_my_organization_id());
ALTER TABLE ingredients FORCE ROW LEVEL SECURITY;

-- Allergens
DROP POLICY IF EXISTS "Users can view their own allergens" ON allergens;
DROP POLICY IF EXISTS "Users can insert their own allergens" ON allergens;
DROP POLICY IF EXISTS "Users can update their own allergens" ON allergens;
DROP POLICY IF EXISTS "Users can delete their own allergens" ON allergens;
CREATE POLICY "Org can manage allergens" ON allergens FOR ALL USING (organization_id = public.get_my_organization_id());
ALTER TABLE allergens FORCE ROW LEVEL SECURITY;

-- Toxicology tests
DROP POLICY IF EXISTS "Users can view their own toxicology tests" ON toxicology_tests;
DROP POLICY IF EXISTS "Users can insert their own toxicology tests" ON toxicology_tests;
DROP POLICY IF EXISTS "Users can update their own toxicology tests" ON toxicology_tests;
DROP POLICY IF EXISTS "Users can delete their own toxicology tests" ON toxicology_tests;
CREATE POLICY "Org can manage toxicology_tests" ON toxicology_tests FOR ALL USING (organization_id = public.get_my_organization_id());
ALTER TABLE toxicology_tests FORCE ROW LEVEL SECURITY;

-- Baby range
DROP POLICY IF EXISTS "Users can view their own baby range" ON baby_range;
DROP POLICY IF EXISTS "Users can insert their own baby range" ON baby_range;
DROP POLICY IF EXISTS "Users can update their own baby range" ON baby_range;
DROP POLICY IF EXISTS "Users can delete their own baby range" ON baby_range;
CREATE POLICY "Org can manage baby_range" ON baby_range FOR ALL USING (organization_id = public.get_my_organization_id());
ALTER TABLE baby_range FORCE ROW LEVEL SECURITY;

-- Formulas
DROP POLICY IF EXISTS "Users can view their own formulas" ON formulas;
DROP POLICY IF EXISTS "Users can insert their own formulas" ON formulas;
DROP POLICY IF EXISTS "Users can update their own formulas" ON formulas;
DROP POLICY IF EXISTS "Users can delete their own formulas" ON formulas;
CREATE POLICY "Org can manage formulas" ON formulas FOR ALL USING (organization_id = public.get_my_organization_id());
ALTER TABLE formulas FORCE ROW LEVEL SECURITY;

-- Formula lines (via formula)
DROP POLICY IF EXISTS "Users can view their own formula lines" ON formula_lines;
DROP POLICY IF EXISTS "Users can insert their own formula lines" ON formula_lines;
DROP POLICY IF EXISTS "Users can update their own formula lines" ON formula_lines;
DROP POLICY IF EXISTS "Users can delete their own formula lines" ON formula_lines;
CREATE POLICY "Org can view formula_lines" ON formula_lines FOR SELECT USING (
  EXISTS (SELECT 1 FROM formulas f WHERE f.id = formula_lines.formula_id AND f.organization_id = public.get_my_organization_id())
);
CREATE POLICY "Org can insert formula_lines" ON formula_lines FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM formulas f WHERE f.id = formula_lines.formula_id AND f.organization_id = public.get_my_organization_id())
);
CREATE POLICY "Org can update formula_lines" ON formula_lines FOR UPDATE USING (
  EXISTS (SELECT 1 FROM formulas f WHERE f.id = formula_lines.formula_id AND f.organization_id = public.get_my_organization_id())
);
CREATE POLICY "Org can delete formula_lines" ON formula_lines FOR DELETE USING (
  EXISTS (SELECT 1 FROM formulas f WHERE f.id = formula_lines.formula_id AND f.organization_id = public.get_my_organization_id())
);
ALTER TABLE formula_lines FORCE ROW LEVEL SECURITY;

-- Packaging
DROP POLICY IF EXISTS "Users can view their own packaging" ON packaging;
DROP POLICY IF EXISTS "Users can insert their own packaging" ON packaging;
DROP POLICY IF EXISTS "Users can update their own packaging" ON packaging;
DROP POLICY IF EXISTS "Users can delete their own packaging" ON packaging;
CREATE POLICY "Org can manage packaging" ON packaging FOR ALL USING (organization_id = public.get_my_organization_id());
ALTER TABLE packaging FORCE ROW LEVEL SECURITY;

-- IFRA limits
DROP POLICY IF EXISTS "Users can view their own ifra_limits" ON ifra_limits;
DROP POLICY IF EXISTS "Users can insert their own ifra_limits" ON ifra_limits;
DROP POLICY IF EXISTS "Users can update their own ifra_limits" ON ifra_limits;
DROP POLICY IF EXISTS "Users can delete their own ifra_limits" ON ifra_limits;
CREATE POLICY "Org can manage ifra_limits" ON ifra_limits FOR ALL USING (organization_id = public.get_my_organization_id());
ALTER TABLE ifra_limits FORCE ROW LEVEL SECURITY;

-- Produit fini
DROP POLICY IF EXISTS "Users can view their own produit_fini" ON produit_fini;
DROP POLICY IF EXISTS "Users can insert their own produit_fini" ON produit_fini;
DROP POLICY IF EXISTS "Users can update their own produit_fini" ON produit_fini;
DROP POLICY IF EXISTS "Users can delete their own produit_fini" ON produit_fini;
CREATE POLICY "Org can manage produit_fini" ON produit_fini FOR ALL USING (organization_id = public.get_my_organization_id());
ALTER TABLE produit_fini FORCE ROW LEVEL SECURITY;

-- 7) Politique INSERT : il faut WITH CHECK pour permettre l'insertion avec organization_id
-- Les politiques "FOR ALL" avec USING seules peuvent ne pas suffire pour INSERT ; on ajoute des WITH CHECK explicites si besoin.
-- Supabase utilise FOR ALL avec USING comme filtre lecture et écriture. Pour INSERT/UPDATE le WITH CHECK doit permettre organization_id = get_my_organization_id().
-- Recréer les politiques avec WITH CHECK pour INSERT
DROP POLICY IF EXISTS "Org can manage ingredients" ON ingredients;
CREATE POLICY "Org select ingredients" ON ingredients FOR SELECT USING (organization_id = public.get_my_organization_id());
CREATE POLICY "Org insert ingredients" ON ingredients FOR INSERT WITH CHECK (organization_id = public.get_my_organization_id());
CREATE POLICY "Org update ingredients" ON ingredients FOR UPDATE USING (organization_id = public.get_my_organization_id());
CREATE POLICY "Org delete ingredients" ON ingredients FOR DELETE USING (organization_id = public.get_my_organization_id());

DROP POLICY IF EXISTS "Org can manage allergens" ON allergens;
CREATE POLICY "Org select allergens" ON allergens FOR SELECT USING (organization_id = public.get_my_organization_id());
CREATE POLICY "Org insert allergens" ON allergens FOR INSERT WITH CHECK (organization_id = public.get_my_organization_id());
CREATE POLICY "Org update allergens" ON allergens FOR UPDATE USING (organization_id = public.get_my_organization_id());
CREATE POLICY "Org delete allergens" ON allergens FOR DELETE USING (organization_id = public.get_my_organization_id());

DROP POLICY IF EXISTS "Org can manage toxicology_tests" ON toxicology_tests;
CREATE POLICY "Org select toxicology_tests" ON toxicology_tests FOR SELECT USING (organization_id = public.get_my_organization_id());
CREATE POLICY "Org insert toxicology_tests" ON toxicology_tests FOR INSERT WITH CHECK (organization_id = public.get_my_organization_id());
CREATE POLICY "Org update toxicology_tests" ON toxicology_tests FOR UPDATE USING (organization_id = public.get_my_organization_id());
CREATE POLICY "Org delete toxicology_tests" ON toxicology_tests FOR DELETE USING (organization_id = public.get_my_organization_id());

DROP POLICY IF EXISTS "Org can manage baby_range" ON baby_range;
CREATE POLICY "Org select baby_range" ON baby_range FOR SELECT USING (organization_id = public.get_my_organization_id());
CREATE POLICY "Org insert baby_range" ON baby_range FOR INSERT WITH CHECK (organization_id = public.get_my_organization_id());
CREATE POLICY "Org update baby_range" ON baby_range FOR UPDATE USING (organization_id = public.get_my_organization_id());
CREATE POLICY "Org delete baby_range" ON baby_range FOR DELETE USING (organization_id = public.get_my_organization_id());

DROP POLICY IF EXISTS "Org can manage formulas" ON formulas;
CREATE POLICY "Org select formulas" ON formulas FOR SELECT USING (organization_id = public.get_my_organization_id());
CREATE POLICY "Org insert formulas" ON formulas FOR INSERT WITH CHECK (organization_id = public.get_my_organization_id());
CREATE POLICY "Org update formulas" ON formulas FOR UPDATE USING (organization_id = public.get_my_organization_id());
CREATE POLICY "Org delete formulas" ON formulas FOR DELETE USING (organization_id = public.get_my_organization_id());

DROP POLICY IF EXISTS "Org can manage packaging" ON packaging;
CREATE POLICY "Org select packaging" ON packaging FOR SELECT USING (organization_id = public.get_my_organization_id());
CREATE POLICY "Org insert packaging" ON packaging FOR INSERT WITH CHECK (organization_id = public.get_my_organization_id());
CREATE POLICY "Org update packaging" ON packaging FOR UPDATE USING (organization_id = public.get_my_organization_id());
CREATE POLICY "Org delete packaging" ON packaging FOR DELETE USING (organization_id = public.get_my_organization_id());

DROP POLICY IF EXISTS "Org can manage ifra_limits" ON ifra_limits;
CREATE POLICY "Org select ifra_limits" ON ifra_limits FOR SELECT USING (organization_id = public.get_my_organization_id());
CREATE POLICY "Org insert ifra_limits" ON ifra_limits FOR INSERT WITH CHECK (organization_id = public.get_my_organization_id());
CREATE POLICY "Org update ifra_limits" ON ifra_limits FOR UPDATE USING (organization_id = public.get_my_organization_id());
CREATE POLICY "Org delete ifra_limits" ON ifra_limits FOR DELETE USING (organization_id = public.get_my_organization_id());

DROP POLICY IF EXISTS "Org can manage produit_fini" ON produit_fini;
CREATE POLICY "Org select produit_fini" ON produit_fini FOR SELECT USING (organization_id = public.get_my_organization_id());
CREATE POLICY "Org insert produit_fini" ON produit_fini FOR INSERT WITH CHECK (organization_id = public.get_my_organization_id());
CREATE POLICY "Org update produit_fini" ON produit_fini FOR UPDATE USING (organization_id = public.get_my_organization_id());
CREATE POLICY "Org delete produit_fini" ON produit_fini FOR DELETE USING (organization_id = public.get_my_organization_id());

-- Index pour les requêtes par organisation
CREATE INDEX IF NOT EXISTS idx_ingredients_organization_id ON ingredients(organization_id);
CREATE INDEX IF NOT EXISTS idx_formulas_organization_id ON formulas(organization_id);
