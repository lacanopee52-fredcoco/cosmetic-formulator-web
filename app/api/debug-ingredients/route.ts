import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationId } from '@/lib/supabase/organization'

/**
 * Diagnostic : retourne le nombre d'ingrédients visibles pour l'utilisateur connecté.
 * Ouvre https://ton-app.vercel.app/api/debug-ingredients en étant connecté pour vérifier.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non connecté', count: 0 })
    }
    const organizationId = await getOrganizationId(supabase)
    if (!organizationId) {
      return NextResponse.json({
        email: user.email,
        organizationId: null,
        count: 0,
        message: 'Aucune organisation (profil manquant ?)',
      })
    }
    const { count, error } = await supabase
      .from('ingredients')
      .select('*', { count: 'exact', head: true })
    if (error) {
      return NextResponse.json({
        email: user.email,
        organizationId,
        count: 0,
        error: error.message,
      })
    }
    return NextResponse.json({
      email: user.email,
      organizationId,
      count: count ?? 0,
      message: (count ?? 0) > 0 ? 'Ingrédients visibles pour cet utilisateur.' : 'Aucun ingrédient dans cette organisation.',
    })
  } catch (e) {
    return NextResponse.json({ error: String(e), count: 0 })
  }
}
