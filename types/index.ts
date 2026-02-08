// ============================================
// INGREDIENTS (from Excel 'Liste' sheet)
// ============================================
export interface Ingredient {
  code: string
  nom: string
  fournisseur_principal?: string
  inci?: string
  categorie?: string
  prix_au_kilo?: number
  en_stock?: boolean
  pourcentage_ppai?: number
  pourcentage_ppai_bio?: number
  pourcentage_cpai?: number
  pourcentage_cpai_bio?: number
  fonctions?: string
  numero_cas?: string
  impuretes?: string
  user_id?: string
  created_at?: string
  updated_at?: string
}

// ============================================
// ALLERGENS (from Excel 'Allergènes' sheet)
// ============================================
export interface Allergen {
  id?: number
  ingredient_code: string
  allergen_name: string
  percentage: number
  user_id?: string
  created_at?: string
}

// ============================================
// TOXICOLOGY TESTS (from Excel 'Tests toxico' sheet)
// ============================================
export interface ToxicologyTest {
  id?: number
  ingredient_code: string
  test_name: string
  test_result?: string
  test_date?: string
  notes?: string
  user_id?: string
  created_at?: string
  updated_at?: string
}

// ============================================
// BABY RANGE (from Excel 'Gamme bébé' sheet)
// ============================================
export interface BabyRange {
  id?: number
  ingredient_code: string
  approved: boolean
  restrictions?: string
  notes?: string
  user_id?: string
  created_at?: string
  updated_at?: string
}

// ============================================
// FORMULAS
// ============================================
export interface FormulaNotes {
  protocole?: string
  aspect?: string
  odeur?: string
  ph?: string
  microscope?: string
  remarque?: string
  conditionnement?: string
  conclusion?: string
  /** Photos par catégorie (clé = catégorie, valeur = data URL ou URL) */
  photos?: Record<string, string>
}

export interface StabilityDay {
  day: string // "J0", "J1", "J7", etc.
  notes?: string
}

export interface FormulationStability {
  start_date?: string // ISO date
  days: StabilityDay[]
}

export interface Formula {
  id?: number
  name: string
  version?: string
  formulator?: string
  total_weight: number
  notes?: FormulaNotes
  stability?: FormulationStability
  image?: string
  /** Version choisie pour la fabrication (une par nom de formule) */
  is_active?: boolean
  /** Objectif d'amélioration recherché pour cette version (visible en comparaison) */
  improvement_goal?: string
  user_id?: string
  created_at?: string
  updated_at?: string
  lines?: FormulaLine[]
}

// ============================================
// FORMULA LINES
// ============================================
/** Indicateur stock par ligne : neutre, rouge (pas en stock), vert (en stock), bleu (échantillon) */
export type StockIndicator = 'neutre' | 'rouge' | 'vert' | 'bleu'

export interface FormulaLine {
  id?: number
  formula_id?: number
  phase: string
  ingredient_code: string // Reference to ingredients.code
  ingredient_name: string
  percent: number
  grams: number
  notes: string
  is_qsp: boolean
  prix_au_kilo?: number
  /** Carré couleur stock (persisté en base) */
  stock_indicator?: StockIndicator | null
  created_at?: string
}

// ============================================
// LEGACY (for backward compatibility)
// ============================================
export interface AllergenData {
  [allergenName: string]: number // Pourcentage d'allergène
}

// Alias pour compatibilité avec l'ancien code
export type RawMaterial = Ingredient
