-- Enregistrements des calculs "Produit fini" (coût formule + emballages + total)
CREATE TABLE IF NOT EXISTS produit_fini (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT,
  formula_id BIGINT,
  formula_name TEXT NOT NULL DEFAULT '',
  formula_version TEXT NOT NULL DEFAULT '',
  grams REAL NOT NULL DEFAULT 0,
  total_price REAL NOT NULL DEFAULT 0,
  items JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_produit_fini_user_id ON produit_fini(user_id);
CREATE INDEX IF NOT EXISTS idx_produit_fini_created_at ON produit_fini(created_at DESC);

ALTER TABLE produit_fini ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own produit_fini" ON produit_fini;
DROP POLICY IF EXISTS "Users can insert their own produit_fini" ON produit_fini;
DROP POLICY IF EXISTS "Users can update their own produit_fini" ON produit_fini;
DROP POLICY IF EXISTS "Users can delete their own produit_fini" ON produit_fini;

CREATE POLICY "Users can view their own produit_fini"
  ON produit_fini FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own produit_fini"
  ON produit_fini FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own produit_fini"
  ON produit_fini FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own produit_fini"
  ON produit_fini FOR DELETE
  USING (auth.uid() = user_id);
