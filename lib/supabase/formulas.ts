import { createClient } from '@/lib/supabase/server'
import { Formula, FormulaLine } from '@/types'
import { getOrganizationId } from '@/lib/supabase/organization'

/**
 * Récupère toutes les formules de l'utilisateur connecté (organisation courante)
 */
export async function getFormulas(): Promise<Formula[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Utilisateur non authentifié')
  }

  const organizationId = await getOrganizationId(supabase)
  if (!organizationId) {
    throw new Error('Organisation introuvable')
  }

  const { data, error } = await supabase
    .from('formulas')
    .select(`
      *,
      lines:formula_lines(*)
    `)
    .eq('organization_id', organizationId)
    .order('updated_at', { ascending: false })

  if (error) {
    throw new Error(`Erreur lors de la récupération des formules: ${error.message}`)
  }

  // Transformer les données pour correspondre au format Formula
  return (data || []).map((formula: any) => ({
    id: formula.id,
    name: formula.name,
    version: formula.version || '',
    formulator: formula.formulator || '',
    total_weight: formula.total_weight || 1000,
    notes: formula.notes || {},
    stability: formula.stability || { days: [] },
    image: formula.image || undefined,
    is_active: !!formula.is_active,
    improvement_goal: formula.improvement_goal || '',
    lines: (formula.lines || []).map((line: any) => ({
      id: line.id,
      phase: line.phase,
      ingredient_code: line.ingredient_code,
      ingredient_name: line.ingredient_name,
      percent: line.percent,
      grams: line.grams,
      notes: line.notes || '',
      is_qsp: line.is_qsp || false,
      prix_au_kilo: line.prix_au_kilo,
    })) as FormulaLine[],
    created_at: formula.created_at,
    updated_at: formula.updated_at,
  }))
}

/**
 * Récupère une formule par son ID (organisation courante)
 */
export async function getFormula(id: number): Promise<Formula | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Utilisateur non authentifié')
  }

  const organizationId = await getOrganizationId(supabase)
  if (!organizationId) {
    return null
  }

  const { data, error } = await supabase
    .from('formulas')
    .select(`
      *,
      lines:formula_lines(*)
    `)
    .eq('id', id)
    .eq('organization_id', organizationId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Formule non trouvée
    }
    throw new Error(`Erreur lors de la récupération de la formule: ${error.message}`)
  }

  if (!data) return null

  return {
    id: data.id,
    name: data.name,
    version: data.version || '',
    formulator: data.formulator || '',
    total_weight: data.total_weight || 1000,
    notes: data.notes || {},
    stability: data.stability || { days: [] },
    image: data.image || undefined,
    is_active: !!data.is_active,
    improvement_goal: data.improvement_goal || '',
    lines: (data.lines || []).map((line: any) => ({
      id: line.id,
      phase: line.phase,
      ingredient_code: line.ingredient_code,
      ingredient_name: line.ingredient_name,
      percent: line.percent,
      grams: line.grams,
      notes: line.notes || '',
      is_qsp: line.is_qsp || false,
      prix_au_kilo: line.prix_au_kilo,
    })) as FormulaLine[],
    created_at: data.created_at,
    updated_at: data.updated_at,
  }
}

/**
 * Sauvegarde une formule (création ou mise à jour)
 */
export async function saveFormula(formula: Formula): Promise<{ success: boolean; id: number }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Utilisateur non authentifié')
  }

  const organizationId = await getOrganizationId(supabase)
  if (!organizationId) {
    throw new Error('Organisation introuvable')
  }

  try {
    // Vérifier si une formule avec le même nom ET version existe déjà
    let existingFormula = null
    if (formula.id) {
      const { data } = await supabase
        .from('formulas')
        .select('id')
        .eq('id', formula.id)
        .eq('organization_id', organizationId)
        .single()
      
      if (data) {
        existingFormula = { id: formula.id }
      }
    } else if (formula.name && formula.version) {
      const { data } = await supabase
        .from('formulas')
        .select('id')
        .eq('name', formula.name)
        .eq('version', formula.version)
        .eq('organization_id', organizationId)
        .single()
      
      if (data) {
        existingFormula = { id: data.id }
      }
    }

    let formulaId: number

    if (existingFormula) {
      // Mise à jour de la formule existante
      const { data, error } = await supabase
        .from('formulas')
        .update({
          name: formula.name,
          version: formula.version || null,
          formulator: formula.formulator || null,
          total_weight: formula.total_weight,
          notes: formula.notes || {},
          stability: formula.stability || { days: [] },
          image: formula.image || null,
          is_active: formula.is_active ?? false,
          improvement_goal: formula.improvement_goal?.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingFormula.id)
        .eq('organization_id', organizationId)
        .select('id')
        .single()

      if (error) {
        throw new Error(`Erreur lors de la mise à jour: ${error.message}`)
      }

      formulaId = data.id

      // Supprimer les anciennes lignes
      await supabase
        .from('formula_lines')
        .delete()
        .eq('formula_id', formulaId)
    } else {
      // Création d'une nouvelle formule
      const { data, error } = await supabase
        .from('formulas')
        .insert({
          name: formula.name,
          version: formula.version || null,
          formulator: formula.formulator || null,
          total_weight: formula.total_weight,
          notes: formula.notes || {},
          stability: formula.stability || { days: [] },
          image: formula.image || null,
          is_active: formula.is_active ?? false,
          improvement_goal: formula.improvement_goal?.trim() || null,
          organization_id: organizationId,
        })
        .select('id')
        .single()

      if (error) {
        throw new Error(`Erreur lors de la création: ${error.message}`)
      }

      formulaId = data.id
    }

    // Insérer les lignes de formule
    if (formula.lines && formula.lines.length > 0) {
      const linesToInsert = formula.lines.map(line => ({
        formula_id: formulaId,
        phase: line.phase,
        ingredient_code: line.ingredient_code,
        ingredient_name: line.ingredient_name,
        percent: line.percent,
        grams: line.grams,
        notes: line.notes || '',
        is_qsp: line.is_qsp || false,
        prix_au_kilo: line.prix_au_kilo || null,
      }))

      const { error: linesError } = await supabase
        .from('formula_lines')
        .insert(linesToInsert)

      if (linesError) {
        throw new Error(`Erreur lors de l'insertion des lignes: ${linesError.message}`)
      }
    }

    return { success: true, id: formulaId }
  } catch (error) {
    console.error('Erreur saveFormula:', error)
    throw error
  }
}

/**
 * Supprime une formule
 */
export async function deleteFormula(id: number): Promise<{ success: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Utilisateur non authentifié')
  }

  const organizationId = await getOrganizationId(supabase)
  if (!organizationId) {
    throw new Error('Organisation introuvable')
  }
  // Les lignes seront supprimées automatiquement grâce à ON DELETE CASCADE
  const { error } = await supabase
    .from('formulas')
    .delete()
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) {
    throw new Error(`Erreur lors de la suppression: ${error.message}`)
  }

  return { success: true }
}
