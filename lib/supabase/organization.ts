import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Récupère l'organization_id de l'utilisateur connecté.
 * Si le profil n'existe pas (nouvel utilisateur), retourne null : l'utilisateur doit
 * passer par l'onboarding (nom de la société) pour créer son organisation.
 */
export async function getOrganizationId(supabase: SupabaseClient): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()

  if (profile?.organization_id) return profile.organization_id
  return null
}

/**
 * Crée une organisation (nom de la société) et le profil de l'utilisateur connecté.
 * Utilise la fonction SQL create_organization_for_user pour éviter le blocage RLS
 * (l'utilisateur ne peut pas SELECT l'organisation venant d'être créée).
 */
export async function createOrganizationForUser(
  supabase: SupabaseClient,
  organizationName: string
): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: existing } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()
  if (existing?.organization_id) return existing.organization_id

  const name = String(organizationName || '').trim() || 'Mon organisation'
  const { data: newOrgId, error } = await supabase.rpc('create_organization_for_user', {
    org_name: name,
  })

  if (error) {
    console.error('[onboarding] create_organization_for_user:', error.message, error.code)
    throw new Error(error.message)
  }
  if (!newOrgId) {
    throw new Error('Organisation non créée')
  }
  return newOrgId as string
}
