-- Ajouter organization_id à formulas si manquant (erreur "Could not find organization_id in schema cache")
ALTER TABLE formulas ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

UPDATE formulas f
SET organization_id = p.organization_id
FROM profiles p
WHERE f.user_id = p.user_id AND f.organization_id IS NULL;

-- Formules sans user_id ou sans profil : rattacher à la première org (à adapter si besoin)
UPDATE formulas
SET organization_id = (SELECT id FROM organizations LIMIT 1)
WHERE organization_id IS NULL;

ALTER TABLE formulas ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_formulas_organization_id ON formulas(organization_id);

-- RLS : politiques par organisation (si pas déjà fait)
DROP POLICY IF EXISTS "Users can view their own formulas" ON formulas;
DROP POLICY IF EXISTS "Users can insert their own formulas" ON formulas;
DROP POLICY IF EXISTS "Users can update their own formulas" ON formulas;
DROP POLICY IF EXISTS "Users can delete their own formulas" ON formulas;
DROP POLICY IF EXISTS "Org can manage formulas" ON formulas;

CREATE POLICY "Org select formulas" ON formulas FOR SELECT USING (organization_id = public.get_my_organization_id());
CREATE POLICY "Org insert formulas" ON formulas FOR INSERT WITH CHECK (organization_id = public.get_my_organization_id());
CREATE POLICY "Org update formulas" ON formulas FOR UPDATE USING (organization_id = public.get_my_organization_id());
CREATE POLICY "Org delete formulas" ON formulas FOR DELETE USING (organization_id = public.get_my_organization_id());

ALTER TABLE formulas FORCE ROW LEVEL SECURITY;
