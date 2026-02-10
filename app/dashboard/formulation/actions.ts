'use server'

import { createClient } from '@/lib/supabase/server'

export type SaveFormulaPayload = {
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

export type SaveFormulaResult =
  | { ok: true; formulaId: number; savedWithStock: boolean; redirectId?: number }
  | { ok: false; error: string }

/**
 * Enregistre une formule côté serveur (session lue depuis les cookies).
 * Évite "Utilisateur non authentifié" quand le client ne voit pas les cookies HttpOnly.
 */
export async function saveFormula(
  payload: SaveFormulaPayload,
  originalLoadedVersion: string | null,
  stockIndicators: (string | null)[]
): Promise<SaveFormulaResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, error: 'Utilisateur non authentifié' }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()

  if (profileError || !profile?.organization_id) {
    return { ok: false, error: 'Organisation introuvable pour cet utilisateur.' }
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

  // Existant même nom + version
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
    if (error) return { ok: false, error: error.message }
    formulaId = data.id

    await supabase.from('formula_lines').delete().eq('formula_id', formulaId)
    return {
      ok: true,
      formulaId,
      savedWithStock: true,
      redirectId: formulaId,
    }
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
    if (error) return { ok: false, error: error.message }
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
    if (error) return { ok: false, error: error.message }
    formulaId = data.id
    return {
      ok: true,
      formulaId,
      savedWithStock: true,
      redirectId: formulaId,
    }
  } else {
    const { data, error } = await supabase
      .from('formulas')
      .insert(formulaData)
      .select('id')
      .single()
    if (error) return { ok: false, error: error.message }
    formulaId = data.id
  }

  let savedWithStock = true
  if (payload.lines && payload.lines.length > 0) {
    const linesWithStock = payload.lines.map((line, index) => ({
      formula_id: formulaId,
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
    const linesWithoutStock = linesWithStock.map(
      ({ stock_indicator: _, ...rest }) => rest
    )

    let linesError = await supabase.from('formula_lines').insert(linesWithStock).then((r) => r.error)
    if (linesError) {
      const msg = linesError.message || ''
      const columnMissing = /stock_indicator|column.*does not exist|unknown column/i.test(msg)
      if (columnMissing) {
        const retry = await supabase.from('formula_lines').insert(linesWithoutStock)
        if (retry.error) return { ok: false, error: retry.error.message }
        savedWithStock = false
      } else {
        return { ok: false, error: linesError.message }
      }
    }
  }

  return { ok: true, formulaId, savedWithStock }
}
