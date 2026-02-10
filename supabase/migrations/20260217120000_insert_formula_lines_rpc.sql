-- RPC pour insérer les lignes de formule en contournant la RLS (appelée avec le JWT utilisateur,
-- vérification de propriété faite dans la fonction ; l'insert s'exécute en DEFINER donc RLS bypass).
-- Corrige "new row violates row-level security policy for table formula_lines" en production.
CREATE OR REPLACE FUNCTION public.insert_formula_lines(
  p_formula_id bigint,
  p_lines jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  v_org_id := public.get_my_organization_id();
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Organisation introuvable';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM formulas f
    WHERE f.id = p_formula_id AND f.organization_id = v_org_id
  ) THEN
    RAISE EXCEPTION 'Formule non trouvée ou accès refusé';
  END IF;

  DELETE FROM formula_lines WHERE formula_id = p_formula_id;

  IF jsonb_array_length(p_lines) > 0 THEN
    -- Contourner la RLS : exécuter l'insert en tant que postgres (propriétaire de la table)
    SET LOCAL role = 'postgres';
    INSERT INTO formula_lines (
      formula_id, phase, ingredient_code, ingredient_name, percent, grams,
      notes, is_qsp, prix_au_kilo, stock_indicator
    )
    SELECT
      p_formula_id,
      (elem->>'phase'),
      (elem->>'ingredient_code'),
      (elem->>'ingredient_name'),
      COALESCE((elem->>'percent')::numeric, 0),
      COALESCE((elem->>'grams')::numeric, 0),
      COALESCE(elem->>'notes', ''),
      COALESCE((elem->>'is_qsp')::boolean, false),
      (elem->>'prix_au_kilo')::numeric,
      NULLIF(elem->>'stock_indicator', '')
    FROM jsonb_array_elements(p_lines) AS elem;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_formula_lines(bigint, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_formula_lines(bigint, jsonb) TO service_role;
