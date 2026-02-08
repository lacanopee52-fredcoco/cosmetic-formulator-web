-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- INGREDIENTS TABLE (from 'Liste' sheet)
-- ============================================
CREATE TABLE IF NOT EXISTS ingredients (
  code TEXT PRIMARY KEY,
  nom TEXT NOT NULL,
  fournisseur_principal TEXT,
  inci TEXT,
  categorie TEXT,
  prix_au_kilo REAL,
  en_stock BOOLEAN DEFAULT false,
  pourcentage_ppai REAL,
  pourcentage_ppai_bio REAL,
  pourcentage_cpai REAL,
  pourcentage_cpai_bio REAL,
  fonctions TEXT,
  numero_cas TEXT,
  impuretes TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ALLERGENS TABLE (from 'Allergènes' sheet)
-- ============================================
CREATE TABLE IF NOT EXISTS allergens (
  id BIGSERIAL PRIMARY KEY,
  ingredient_code TEXT REFERENCES ingredients(code) ON DELETE CASCADE,
  allergen_name TEXT NOT NULL,
  percentage REAL NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(ingredient_code, allergen_name, user_id)
);

-- ============================================
-- TOXICOLOGY TESTS TABLE (from 'Tests toxico' sheet)
-- ============================================
CREATE TABLE IF NOT EXISTS toxicology_tests (
  id BIGSERIAL PRIMARY KEY,
  ingredient_code TEXT REFERENCES ingredients(code) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  test_result TEXT,
  test_date DATE,
  notes TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- BABY RANGE TABLE (from 'Gamme bébé' sheet)
-- ============================================
CREATE TABLE IF NOT EXISTS baby_range (
  id BIGSERIAL PRIMARY KEY,
  ingredient_code TEXT REFERENCES ingredients(code) ON DELETE CASCADE,
  approved BOOLEAN DEFAULT false,
  restrictions TEXT,
  notes TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(ingredient_code, user_id)
);

-- ============================================
-- FORMULAS TABLE (existing, updated)
-- ============================================
CREATE TABLE IF NOT EXISTS formulas (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT,
  formulator TEXT,
  total_weight REAL NOT NULL DEFAULT 1000,
  notes JSONB,
  stability JSONB,
  image TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- FORMULA LINES TABLE (existing, updated)
-- ============================================
CREATE TABLE IF NOT EXISTS formula_lines (
  id BIGSERIAL PRIMARY KEY,
  formula_id BIGINT REFERENCES formulas(id) ON DELETE CASCADE,
  phase TEXT NOT NULL,
  ingredient_code TEXT REFERENCES ingredients(code) ON DELETE SET NULL,
  ingredient_name TEXT NOT NULL,
  percent REAL NOT NULL,
  grams REAL NOT NULL,
  notes TEXT,
  is_qsp BOOLEAN DEFAULT false,
  prix_au_kilo REAL,
  stock_indicator TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_ingredients_user_id ON ingredients(user_id);
CREATE INDEX IF NOT EXISTS idx_ingredients_code ON ingredients(code);
CREATE INDEX IF NOT EXISTS idx_allergens_ingredient_code ON allergens(ingredient_code);
CREATE INDEX IF NOT EXISTS idx_allergens_user_id ON allergens(user_id);
CREATE INDEX IF NOT EXISTS idx_toxicology_tests_ingredient_code ON toxicology_tests(ingredient_code);
CREATE INDEX IF NOT EXISTS idx_toxicology_tests_user_id ON toxicology_tests(user_id);
CREATE INDEX IF NOT EXISTS idx_baby_range_ingredient_code ON baby_range(ingredient_code);
CREATE INDEX IF NOT EXISTS idx_baby_range_user_id ON baby_range(user_id);
CREATE INDEX IF NOT EXISTS idx_formulas_user_id ON formulas(user_id);
CREATE INDEX IF NOT EXISTS idx_formula_lines_formula_id ON formula_lines(formula_id);
CREATE INDEX IF NOT EXISTS idx_formula_lines_ingredient_code ON formula_lines(ingredient_code);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Ingredients RLS
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ingredients"
  ON ingredients FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ingredients"
  ON ingredients FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ingredients"
  ON ingredients FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ingredients"
  ON ingredients FOR DELETE
  USING (auth.uid() = user_id);

-- Allergens RLS
ALTER TABLE allergens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own allergens"
  ON allergens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own allergens"
  ON allergens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own allergens"
  ON allergens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own allergens"
  ON allergens FOR DELETE
  USING (auth.uid() = user_id);

-- Toxicology Tests RLS
ALTER TABLE toxicology_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own toxicology tests"
  ON toxicology_tests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own toxicology tests"
  ON toxicology_tests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own toxicology tests"
  ON toxicology_tests FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own toxicology tests"
  ON toxicology_tests FOR DELETE
  USING (auth.uid() = user_id);

-- Baby Range RLS
ALTER TABLE baby_range ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own baby range"
  ON baby_range FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own baby range"
  ON baby_range FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own baby range"
  ON baby_range FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own baby range"
  ON baby_range FOR DELETE
  USING (auth.uid() = user_id);

-- Formulas RLS (existing)
ALTER TABLE formulas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own formulas"
  ON formulas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own formulas"
  ON formulas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own formulas"
  ON formulas FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own formulas"
  ON formulas FOR DELETE
  USING (auth.uid() = user_id);

-- Formula Lines RLS (existing)
ALTER TABLE formula_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own formula lines"
  ON formula_lines FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM formulas
      WHERE formulas.id = formula_lines.formula_id
      AND formulas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own formula lines"
  ON formula_lines FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM formulas
      WHERE formulas.id = formula_lines.formula_id
      AND formulas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own formula lines"
  ON formula_lines FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM formulas
      WHERE formulas.id = formula_lines.formula_id
      AND formulas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own formula lines"
  ON formula_lines FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM formulas
      WHERE formulas.id = formula_lines.formula_id
      AND formulas.user_id = auth.uid()
    )
  );

-- ============================================
-- TRIGGERS for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ingredients_updated_at
  BEFORE UPDATE ON ingredients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_toxicology_tests_updated_at
  BEFORE UPDATE ON toxicology_tests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_baby_range_updated_at
  BEFORE UPDATE ON baby_range
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_formulas_updated_at
  BEFORE UPDATE ON formulas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
