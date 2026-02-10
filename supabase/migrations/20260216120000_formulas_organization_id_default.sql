-- Valeur par défaut pour organization_id : évite l'erreur "Could not find organization_id in schema cache"
-- quand le client n'envoie pas la colonne (Postgres applique le DEFAULT).
ALTER TABLE formulas
  ALTER COLUMN organization_id SET DEFAULT public.get_my_organization_id();

-- Recharger le cache PostgREST (à exécuter une fois dans le SQL Editor Supabase si besoin) :
-- NOTIFY pgrst, 'reload schema';
-- GRANT ALL ON formulas TO anon, authenticated, service_role;
