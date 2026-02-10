import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Résout un code matière côté serveur (même session que /api/debug-ingredients).
 * GET /api/ingredients/resolve-code?code=MP500
 * Retourne l'ingrédient si exactement un match (code normalisé : sans espaces, insensible casse).
 */
function normalizeCode(s: string): string {
  return (s || '')
    .trim()
    .toLowerCase()
    .replace(/[\s\-_\.]/g, '')
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non connecté' }, { status: 401 })
    }
    const url = new URL(request.url)
    const codeParam = url.searchParams.get('code')?.trim()
    if (!codeParam) {
      return NextResponse.json({ error: 'Paramètre code requis' }, { status: 400 })
    }
    const { data: rows } = await supabase
      .from('ingredients')
      .select('*')
      .ilike('code', `%${codeParam}%`)
      .limit(20)
    const list = rows ?? []
    const normQuery = normalizeCode(codeParam)
    const ingredient = list.find(
      (r: { code?: string | null }) => normalizeCode((r.code || '').trim()) === normQuery
    )
    if (!ingredient) {
      return NextResponse.json({ found: false })
    }
    return NextResponse.json({ found: true, ingredient })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
