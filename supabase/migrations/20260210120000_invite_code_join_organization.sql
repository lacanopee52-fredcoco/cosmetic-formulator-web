-- Code d'invitation par organisation : permettre à un 2e utilisateur de rejoindre la même société
-- et voir les mêmes formules / données.

-- 1) Colonne invite_code sur organizations (unique, 8 caractères)
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS invite_code TEXT;

-- Backfill : codes uniques pour les organisations existantes (dérivés de l'id pour unicité)
UPDATE organizations
SET invite_code = lower(substr(md5(id::text), 1, 8))
WHERE invite_code IS NULL;

-- Contrainte d'unicité
CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_invite_code
  ON organizations (invite_code);

-- Rendre la colonne obligatoire (backfill déjà fait ci‑dessus)
ALTER TABLE organizations
  ALTER COLUMN invite_code SET NOT NULL;

-- Valeur par défaut pour les inserts directs (la fonction settera toujours sa propre valeur)
ALTER TABLE organizations
  ALTER COLUMN invite_code SET DEFAULT lower(substr(md5(gen_random_uuid()::text), 1, 8));

-- 2) Adapter create_organization_for_user : générer un invite_code à la création
CREATE OR REPLACE FUNCTION public.create_organization_for_user(org_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
  new_org_id uuid;
  new_code text;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;
  IF EXISTS (SELECT 1 FROM profiles WHERE user_id = uid) THEN
    RAISE EXCEPTION 'Un profil existe déjà pour cet utilisateur';
  END IF;
  new_code := lower(substr(md5(gen_random_uuid()::text), 1, 8));
  INSERT INTO organizations (name, invite_code)
  VALUES (COALESCE(NULLIF(trim(org_name), ''), 'Mon organisation'), new_code)
  RETURNING id INTO new_org_id;
  INSERT INTO profiles (user_id, organization_id)
  VALUES (uid, new_org_id);
  RETURN new_org_id;
END;
$$;

-- 3) Nouvelle fonction : rejoindre une organisation avec un code d'invitation
CREATE OR REPLACE FUNCTION public.join_organization_by_code(invite_code_input text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
  org_id uuid;
  code_trim text;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;
  IF EXISTS (SELECT 1 FROM profiles WHERE user_id = uid) THEN
    RAISE EXCEPTION 'Un profil existe déjà pour cet utilisateur';
  END IF;
  code_trim := lower(trim(invite_code_input));
  IF code_trim = '' THEN
    RAISE EXCEPTION 'Code d''invitation requis';
  END IF;
  SELECT id INTO org_id
  FROM organizations
  WHERE lower(trim(invite_code)) = code_trim
  LIMIT 1;
  IF org_id IS NULL THEN
    RAISE EXCEPTION 'Code d''invitation invalide ou expiré';
  END IF;
  INSERT INTO profiles (user_id, organization_id)
  VALUES (uid, org_id);
  RETURN org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_organization_by_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_organization_by_code(text) TO service_role;
