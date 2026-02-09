-- Recherche d'ingrédients par nom/code sans souci d'encodage URL (ILIKE côté serveur).
-- Utilisée par l'autocomplete "Matière première".
CREATE OR REPLACE FUNCTION public.search_ingredients(search_term text)
RETURNS SETOF ingredients
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM ingredients
  WHERE organization_id = public.get_my_organization_id()
    AND (
      code ILIKE '%' || search_term || '%'
      OR nom ILIKE '%' || search_term || '%'
    )
  ORDER BY nom
  LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION public.search_ingredients(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_ingredients(text) TO service_role;
