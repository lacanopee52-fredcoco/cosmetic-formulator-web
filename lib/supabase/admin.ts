import { createClient } from '@supabase/supabase-js'

/**
 * Client Supabase avec la clé service_role (contourne la RLS).
 * À utiliser UNIQUEMENT côté serveur (API routes, Server Actions)
 * après avoir vérifié les droits avec le client utilisateur.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis pour createAdminClient')
  }
  return createClient(url, key)
}
