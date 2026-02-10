import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/formulas/[id]
 * Charge une formule et ses lignes côté serveur (session via cookies).
 * Évite que les lignes soient vides en production quand le client ne voit pas la session.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const formulaId = parseInt(id, 10)
    if (isNaN(formulaId)) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non connecté' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('formulas')
      .select(
        `
        *,
        lines:formula_lines(*)
      `
      )
      .eq('id', formulaId)
      .eq('user_id', user.id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (!data) {
      return NextResponse.json({ error: 'Formule non trouvée' }, { status: 404 })
    }

    return NextResponse.json({
      formula: {
        id: data.id,
        name: data.name,
        version: data.version ?? '',
        formulator: data.formulator ?? '',
        total_weight: data.total_weight ?? 1000,
        notes: data.notes ?? {},
        stability: data.stability ?? { days: [] },
        image: data.image ?? undefined,
        is_active: !!data.is_active,
        improvement_goal: data.improvement_goal ?? '',
        lines: (data.lines ?? []).map((line: Record<string, unknown>) => ({
          id: line.id,
          phase: line.phase,
          ingredient_code: line.ingredient_code,
          ingredient_name: line.ingredient_name,
          percent: line.percent,
          grams: line.grams,
          notes: line.notes ?? '',
          is_qsp: line.is_qsp ?? false,
          prix_au_kilo: line.prix_au_kilo ?? null,
          stock_indicator: line.stock_indicator ?? null,
        })),
        created_at: data.created_at,
        updated_at: data.updated_at,
      },
    })
  } catch (e) {
    console.error('[api/formulas/[id]]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
