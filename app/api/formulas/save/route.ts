import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type SaveBody = {
  payload: {
    name: string
    version: string | null
    formulator: string | null
    total_weight: number
    notes: Record<string, unknown>
    stability: { start_date?: string; days: unknown[] }
    image: string | null
    is_active: boolean
    improvement_goal: string | null
    id?: number
    lines?: Array<{
      phase: string
      ingredient_code: string
      ingredient_name: string
      percent: number
      grams: number
      notes: string
      is_qsp: boolean
      prix_au_kilo?: number | null
      stock_indicator?: string | null
    }>
  }
  originalLoadedVersion: string | null
  stockIndicators: (string | null)[]
}

/**
 * POST /api/formulas/save
 * Enregistre une formule. Utilise les cookies de la requête (credentials: 'include')
 * pour que la session soit bien reçue en production (Vercel).
 */
export async function POST(request: Request) {
  try {
    const body: SaveBody = await request.json()
    const { payload, originalLoadedVersion, stockIndicators } = body

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { ok: false, error: 'Utilisateur non authentifié' },
        { status: 401 }
      )
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile?.organization_id) {
      return NextResponse.json(
        { ok: false, error: 'Organisation introuvable pour cet utilisateur.' },
        { status: 400 }
      )
    }

    const formulaData = {
      name: payload.name,
      version: payload.version || null,
      formulator: payload.formulator || null,
      total_weight: payload.total_weight,
      notes: payload.notes || {},
      stability: payload.stability || { days: [] },
      image: payload.image || null,
      is_active: payload.is_active ?? false,
      improvement_goal: payload.improvement_goal?.trim() || null,
      organization_id: profile.organization_id,
    }

    const nameTrim = (payload.name || '').trim()
    const versionTrim = (payload.version || '').trim()
    let formulaId: number

    let existingByNameVersion: { id: number } | null = null
    if (nameTrim && versionTrim) {
      const { data: existing } = await supabase
        .from('formulas')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', payload.name)
        .eq('version', payload.version)
        .maybeSingle()
      if (existing?.id) existingByNameVersion = { id: existing.id }
    }

    if (existingByNameVersion) {
      const { data, error } = await supabase
        .from('formulas')
        .update(formulaData)
        .eq('id', existingByNameVersion.id)
        .eq('user_id', user.id)
        .select('id')
        .single()
      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
      }
      formulaId = data.id
      await supabase.from('formula_lines').delete().eq('formula_id', formulaId)
      return NextResponse.json({
        ok: true,
        formulaId,
        savedWithStock: true,
        redirectId: formulaId,
      })
    }

    const saveAsNewVersion = Boolean(
      payload.id &&
        originalLoadedVersion !== null &&
        versionTrim !== (originalLoadedVersion || '').trim()
    )

    if (payload.id && !saveAsNewVersion) {
      const { data, error } = await supabase
        .from('formulas')
        .update(formulaData)
        .eq('id', payload.id)
        .eq('user_id', user.id)
        .select('id')
        .single()
      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
      }
      formulaId = data.id
      await supabase.from('formula_lines').delete().eq('formula_id', formulaId)
    } else if (saveAsNewVersion) {
      const stabilityReset = { start_date: undefined, days: [] }
      const { data, error } = await supabase
        .from('formulas')
        .insert({
          ...formulaData,
          stability: stabilityReset,
          is_active: false,
        })
        .select('id')
        .single()
      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
      }
      formulaId = data.id
      return NextResponse.json({
        ok: true,
        formulaId,
        savedWithStock: true,
        redirectId: formulaId,
      })
    } else {
      const { data, error } = await supabase
        .from('formulas')
        .insert(formulaData)
        .select('id')
        .single()
      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
      }
      formulaId = data.id
    }

    let savedWithStock = true
    if (payload.lines && payload.lines.length > 0) {
      const linesForRpc = payload.lines.map((line, index) => ({
        phase: line.phase,
        ingredient_code: line.ingredient_code,
        ingredient_name: line.ingredient_name,
        percent: line.percent,
        grams: line.grams,
        notes: line.notes || '',
        is_qsp: line.is_qsp || false,
        prix_au_kilo: line.prix_au_kilo ?? null,
        stock_indicator: line.stock_indicator ?? stockIndicators[index] ?? null,
      }))

      const { error: rpcError } = await supabase.rpc('insert_formula_lines', {
        p_formula_id: formulaId,
        p_lines: linesForRpc,
      })

      if (rpcError) {
        const msg = rpcError.message || ''
        const columnMissing = /stock_indicator|column.*does not exist|unknown column/i.test(msg)
        if (columnMissing) {
          const linesWithoutStock = linesForRpc.map(
            ({ stock_indicator: _, ...rest }) => rest
          )
          const { error: retryError } = await supabase.rpc('insert_formula_lines', {
            p_formula_id: formulaId,
            p_lines: linesWithoutStock,
          })
          if (retryError) {
            return NextResponse.json(
              { ok: false, error: retryError.message },
              { status: 400 }
            )
          }
          savedWithStock = false
        } else {
          return NextResponse.json(
            { ok: false, error: rpcError.message },
            { status: 400 }
          )
        }
      }
    }

    return NextResponse.json({ ok: true, formulaId, savedWithStock })
  } catch (e) {
    console.error('[api/formulas/save]', e)
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
