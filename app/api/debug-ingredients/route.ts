import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationId } from '@/lib/supabase/organization'

/**
 * Diagnostic : retourne le nombre d'ingrédients visibles pour l'utilisateur connecté.
 * ?code=MP500 : en plus, cherche un ingrédient dont le code contient ce texte.
 * Ouvre /api/debug-ingredients (ou ?code=MP500) en étant connecté pour vérifier.
 */
export async function GET(request: Request) {
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
    const url = new URL(request.url)
    const codeParam = (url.searchParams.get('code') || 'MP500').trim()
    const { data: codeRows } = await supabase
      .from('ingredients')
      .select('code, nom')
      .ilike('code', `%${codeParam}%`)
      .limit(10)
    const codeSearch = {
      codeRecherche: codeParam || '(aucun)',
      found: codeRows?.length ?? 0,
      rows: (codeRows ?? []).map((r: { code: string; nom: string }) => ({ code: r.code, nom: r.nom })),
    }
    return NextResponse.json({
      email: user.email,
      organizationId,
      count: count ?? 0,
      message: (count ?? 0) > 0 ? 'Ingrédients visibles pour cet utilisateur.' : 'Aucun ingrédient dans cette organisation.',
      codeSearch,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e), count: 0 })
  }
}
