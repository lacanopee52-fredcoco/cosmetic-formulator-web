import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationId } from '@/lib/supabase/organization'

type IngredientUpsert = {
  code: string
  nom: string
  fournisseur_principal?: string | null
  inci?: string | null
  categorie?: string | null
  prix_au_kilo?: number | null
  en_stock?: boolean | null
  pourcentage_ppai?: number | null
  pourcentage_ppai_bio?: number | null
  pourcentage_cpai?: number | null
  pourcentage_cpai_bio?: number | null
  fonctions?: string | null
  numero_cas?: string | null
  impuretes?: string | null
}

type AllergenInsert = {
  ingredient_code: string
  allergen_name: string
  percentage: number
}

type ToxicologyInsert = {
  ingredient_code: string
  test_name: string
  test_result?: string | null
  test_date?: string | null
  notes?: string | null
}

type BabyRangeUpsert = {
  ingredient_code: string
  approved: boolean
  restrictions?: string | null
  notes?: string | null
}

type PackagingUpsert = {
  description: string
  prix_unitaire: number
}

type IfraLimitInsert = {
  category_number: string
  description: string
  ingredient_code: string
  limit_percent: number
}

type Payload = {
  ingredients: IngredientUpsert[]
  allergens: AllergenInsert[]
  toxicology_tests: ToxicologyInsert[]
  baby_range: BabyRangeUpsert[]
  packaging?: PackagingUpsert[]
  ifra_limits?: IfraLimitInsert[]
  mode?: 'merge' | 'replace' // replace = purge tables for user then import
}

const BATCH_ING = 500
const BATCH_ALLERG = 1000
const BATCH_TOX = 500
const BATCH_BABY = 500

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Utilisateur non authentifié' }, { status: 401 })

    const organizationId = await getOrganizationId(supabase)
    if (!organizationId) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 403 })

    const body = (await req.json()) as Payload
    // Dédupliquer les ingrédients par code normalisé (dernier gagnant) pour éviter "duplicate key"
    const ingredientsRaw = Array.isArray(body.ingredients) ? body.ingredients : []
    const ingredientsByCode = new Map<string, IngredientUpsert>()
    for (const ing of ingredientsRaw) {
      const raw = String(ing?.code ?? '').trim()
      if (!raw) continue
      const key = raw.toLowerCase()
      ingredientsByCode.set(key, { ...ing, code: raw }) // garder le code original pour l'insert
    }
    const ingredients = Array.from(ingredientsByCode.values())
    const allergens = Array.isArray(body.allergens) ? body.allergens : []
    const tox = Array.isArray(body.toxicology_tests) ? body.toxicology_tests : []
    const baby = Array.isArray(body.baby_range) ? body.baby_range : []
    const packaging = Array.isArray(body.packaging) ? body.packaging : []
    const ifraLimits = Array.isArray(body.ifra_limits) ? body.ifra_limits : []
    const mode = body.mode || 'merge'

    if (mode === 'replace') {
      await supabase.from('allergens').delete().eq('organization_id', organizationId)
      await supabase.from('toxicology_tests').delete().eq('organization_id', organizationId)
      await supabase.from('baby_range').delete().eq('organization_id', organizationId)
      await supabase.from('packaging').delete().eq('organization_id', organizationId)
      await supabase.from('ifra_limits').delete().eq('organization_id', organizationId)
      await supabase.from('ingredients').delete().eq('organization_id', organizationId)
    }

    // INGREDIENTS (upsert sur organization_id + code)
    let ingUpserted = 0
    for (let i = 0; i < ingredients.length; i += BATCH_ING) {
      const batch = ingredients.slice(i, i + BATCH_ING).map((x) => ({ ...x, organization_id: organizationId }))
      const { error } = await supabase.from('ingredients').upsert(batch, { onConflict: 'organization_id,code' })
      if (error) throw new Error(`ingredients upsert: ${error.message}`)
      ingUpserted += batch.length
    }

    // ALLERGENS
    // Stratégie simple: on supprime les allergènes des codes concernés, puis on réinsère
    const allergenCodes = [...new Set(allergens.map(a => a.ingredient_code).filter(Boolean))]
    if (allergenCodes.length > 0) {
      const { error } = await supabase
        .from('allergens')
        .delete()
        .eq('organization_id', organizationId)
        .in('ingredient_code', allergenCodes)
      if (error) throw new Error(`allergens delete: ${error.message}`)
    }

    let allergInserted = 0
    for (let i = 0; i < allergens.length; i += BATCH_ALLERG) {
      const batch = allergens.slice(i, i + BATCH_ALLERG).map((x) => ({ ...x, organization_id: organizationId }))
      if (batch.length === 0) continue
      const { error } = await supabase.from('allergens').insert(batch)
      if (error) throw new Error(`allergens insert: ${error.message}`)
      allergInserted += batch.length
    }

    // TOXICOLOGY TESTS
    const toxCodes = [...new Set(tox.map(t => t.ingredient_code).filter(Boolean))]
    if (toxCodes.length > 0) {
      const { error } = await supabase
        .from('toxicology_tests')
        .delete()
        .eq('organization_id', organizationId)
        .in('ingredient_code', toxCodes)
      if (error) throw new Error(`toxicology delete: ${error.message}`)
    }

    let toxInserted = 0
    for (let i = 0; i < tox.length; i += BATCH_TOX) {
      const batch = tox.slice(i, i + BATCH_TOX).map((x) => ({ ...x, organization_id: organizationId }))
      if (batch.length === 0) continue
      const { error } = await supabase.from('toxicology_tests').insert(batch)
      if (error) throw new Error(`toxicology insert: ${error.message}`)
      toxInserted += batch.length
    }

    // BABY RANGE (upsert unique organization_id,ingredient_code)
    let babyUpserted = 0
    for (let i = 0; i < baby.length; i += BATCH_BABY) {
      const batch = baby.slice(i, i + BATCH_BABY).map((x) => ({ ...x, organization_id: organizationId }))
      if (batch.length === 0) continue
      const { error } = await supabase.from('baby_range').upsert(batch, { onConflict: 'organization_id,ingredient_code' })
      if (error) throw new Error(`baby_range upsert: ${error.message}`)
      babyUpserted += batch.length
    }

    // PACKAGING (code emballage: description, prix_unitaire ; user_id requis si la colonne existe)
    let packagingUpserted = 0
    if (packaging.length > 0 && user?.id) {
      const batch = packaging.map((x) => ({
        organization_id: organizationId,
        user_id: user.id,
        description: String(x.description || '').trim(),
        prix_unitaire: Number(x.prix_unitaire) || 0,
      })).filter((x) => x.description)
      if (batch.length > 0) {
        const { error } = await supabase.from('packaging').upsert(batch, { onConflict: 'organization_id,description' })
        if (error) throw new Error(`packaging upsert: ${error.message}`)
        packagingUpserted = batch.length
      }
    }

    // IFRA limits (merge: delete then insert for codes present; replace already purged above)
    if (mode === 'merge' && ifraLimits.length > 0) {
      const codes = [...new Set(ifraLimits.map((x) => x.ingredient_code).filter(Boolean))]
      if (codes.length > 0) {
        await supabase.from('ifra_limits').delete().eq('organization_id', organizationId).in('ingredient_code', codes)
      }
    }
    let ifraInserted = 0
    const BATCH_IFRA = 500
    for (let i = 0; i < ifraLimits.length; i += BATCH_IFRA) {
      const batch = ifraLimits.slice(i, i + BATCH_IFRA).map((x) => ({
        organization_id: organizationId,
        ...(user?.id && { user_id: user.id }),
        category_number: String(x.category_number ?? '').trim(),
        description: String(x.description ?? '').trim(),
        ingredient_code: String(x.ingredient_code ?? '').trim(),
        limit_percent: Number(x.limit_percent) ?? 0,
      })).filter((x) => x.ingredient_code && x.category_number !== '')
      if (batch.length > 0) {
        const { error } = await supabase.from('ifra_limits').insert(batch)
        if (error) throw new Error(`ifra_limits insert: ${error.message}`)
        ifraInserted += batch.length
      }
    }

    return NextResponse.json({
      ok: true,
      counts: {
        ingredients: ingUpserted,
        allergens: allergInserted,
        toxicology_tests: toxInserted,
        baby_range: babyUpserted,
        packaging: packagingUpserted,
        ifra_limits: ifraInserted,
      } as Record<string, number>,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}

