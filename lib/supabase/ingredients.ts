import { createClient } from '@/lib/supabase/server'
import { Ingredient } from '@/types'

/**
 * Récupère tous les ingrédients de l'utilisateur connecté
 */
export async function getIngredients(): Promise<Ingredient[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Utilisateur non authentifié')
  }

  const { data, error } = await supabase
    .from('ingredients')
    .select('*')
    .order('nom', { ascending: true })

  if (error) {
    throw new Error(`Erreur lors de la récupération des ingrédients: ${error.message}`)
  }

  return (data || []) as Ingredient[]
}

/**
 * Recherche des ingrédients par nom ou code
 */
export async function searchIngredients(query: string): Promise<Ingredient[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Utilisateur non authentifié')
  }

  const { data, error } = await supabase
    .from('ingredients')
    .select('*')
    .or(`nom.ilike.%${query}%,code.ilike.%${query}%`)
    .order('nom', { ascending: true })
    .limit(50)

  if (error) {
    throw new Error(`Erreur lors de la recherche: ${error.message}`)
  }

  return (data || []) as Ingredient[]
}

/**
 * Récupère un ingrédient par son code
 */
export async function getIngredient(code: string): Promise<Ingredient | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Utilisateur non authentifié')
  }

  const { data, error } = await supabase
    .from('ingredients')
    .select('*')
    .eq('code', code)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Ingrédient non trouvé
    }
    throw new Error(`Erreur lors de la récupération de l'ingrédient: ${error.message}`)
  }

  return data as Ingredient
}

/**
 * Met à jour un ingrédient
 */
export async function updateIngredient(ingredient: Ingredient): Promise<{ success: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Utilisateur non authentifié')
  }

  const { error } = await supabase
    .from('ingredients')
    .update({
      nom: ingredient.nom,
      fournisseur_principal: ingredient.fournisseur_principal,
      inci: ingredient.inci,
      categorie: ingredient.categorie,
      prix_au_kilo: ingredient.prix_au_kilo,
      en_stock: ingredient.en_stock,
      pourcentage_ppai: ingredient.pourcentage_ppai,
      pourcentage_ppai_bio: ingredient.pourcentage_ppai_bio,
      pourcentage_cpai: ingredient.pourcentage_cpai,
      pourcentage_cpai_bio: ingredient.pourcentage_cpai_bio,
      fonctions: ingredient.fonctions,
      numero_cas: ingredient.numero_cas,
      impuretes: ingredient.impuretes,
      updated_at: new Date().toISOString(),
    })
    .eq('code', ingredient.code)

  if (error) {
    throw new Error(`Erreur lors de la mise à jour: ${error.message}`)
  }

  return { success: true }
}
