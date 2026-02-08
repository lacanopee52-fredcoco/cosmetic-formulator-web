-- PARTIE 1 : uniquement organisations + profils + fonction onboarding
-- À exécuter en premier dans Supabase SQL Editor.
-- Ensuite tu pourras exécuter la migration complète (20260206120000).

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

-- 3) Organisation par défaut
INSERT INTO organizations (id, name) VALUES ('00000000-0000-0000-0000-000000000001'::uuid, 'Default')
ON CONFLICT (id) DO NOTHING;

-- Profils pour les utilisateurs existants (si la table ingredients existe et a user_id)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ingredients')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ingredients' AND column_name = 'user_id') THEN
    INSERT INTO profiles (user_id, organization_id)
    SELECT DISTINCT i.user_id, '00000000-0000-0000-0000-000000000001'::uuid
    FROM ingredients i
    WHERE i.user_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = i.user_id);
  END IF;
  -- Aussi les users auth qui n'ont pas encore de profil
  INSERT INTO profiles (user_id, organization_id)
  SELECT u.id, '00000000-0000-0000-0000-000000000001'::uuid
  FROM auth.users u
  WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = u.id);
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 4) Fonction pour l'app
CREATE OR REPLACE FUNCTION public.get_my_organization_id()
RETURNS UUID AS $$
  SELECT organization_id FROM profiles WHERE user_id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 5) Fonction onboarding (création org + profil)
CREATE OR REPLACE FUNCTION public.create_organization_for_user(org_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
  new_org_id uuid;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;
  IF EXISTS (SELECT 1 FROM profiles WHERE user_id = uid) THEN
    RAISE EXCEPTION 'Un profil existe déjà pour cet utilisateur';
  END IF;
  INSERT INTO organizations (name)
  VALUES (COALESCE(NULLIF(trim(org_name), ''), 'Mon organisation'))
  RETURNING id INTO new_org_id;
  INSERT INTO profiles (user_id, organization_id)
  VALUES (uid, new_org_id);
  RETURN new_org_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_organization_for_user(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_organization_for_user(text) TO service_role;
