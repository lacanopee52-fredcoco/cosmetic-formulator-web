-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Raw Materials Table
CREATE TABLE IF NOT EXISTS raw_materials (
  code TEXT PRIMARY KEY,
  nom TEXT NOT NULL,
  description TEXT,
  fournisseur TEXT,
  inci TEXT,
  famille TEXT,
  is_sample BOOLEAN DEFAULT false,
  prix_au_kilo REAL,
  en_stock BOOLEAN DEFAULT false,
  allergens JSONB,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Formulas Table
CREATE TABLE IF NOT EXISTS formulas (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT,
  formulator TEXT,
  total_weight REAL NOT NULL DEFAULT 1000,
  notes JSONB,
  stability JSONB,
  image TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  improvement_goal TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Formula Lines Table
CREATE TABLE IF NOT EXISTS formula_lines (
  id BIGSERIAL PRIMARY KEY,
  formula_id BIGINT REFERENCES formulas(id) ON DELETE CASCADE,
  phase TEXT NOT NULL,
  raw_material_code TEXT NOT NULL,
  raw_material_name TEXT NOT NULL,
  percent REAL NOT NULL,
  grams REAL NOT NULL,
  notes TEXT,
  is_qsp BOOLEAN DEFAULT false,
  prix_au_kilo REAL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_raw_materials_user_id ON raw_materials(user_id);
CREATE INDEX IF NOT EXISTS idx_formulas_user_id ON formulas(user_id);
CREATE INDEX IF NOT EXISTS idx_formula_lines_formula_id ON formula_lines(formula_id);

-- Row Level Security (RLS)
ALTER TABLE raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE formulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE formula_lines ENABLE ROW LEVEL SECURITY;

-- RLS Policies for raw_materials
CREATE POLICY "Users can view their own raw materials"
  ON raw_materials FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own raw materials"
  ON raw_materials FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own raw materials"
  ON raw_materials FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own raw materials"
  ON raw_materials FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for formulas
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

-- RLS Policies for formula_lines
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

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_raw_materials_updated_at
  BEFORE UPDATE ON raw_materials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_formulas_updated_at
  BEFORE UPDATE ON formulas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
