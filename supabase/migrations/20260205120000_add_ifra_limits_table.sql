-- Limites IFRA par catégorie et par ingrédient (importées depuis l'onglet IFRA de l'Excel)
CREATE TABLE IF NOT EXISTS ifra_limits (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_number TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  ingredient_code TEXT NOT NULL,
  limit_percent REAL NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ifra_limits_user_id ON ifra_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_ifra_limits_ingredient ON ifra_limits(user_id, ingredient_code);

ALTER TABLE ifra_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own ifra_limits" ON ifra_limits;
DROP POLICY IF EXISTS "Users can insert their own ifra_limits" ON ifra_limits;
DROP POLICY IF EXISTS "Users can update their own ifra_limits" ON ifra_limits;
DROP POLICY IF EXISTS "Users can delete their own ifra_limits" ON ifra_limits;
CREATE POLICY "Users can view their own ifra_limits" ON ifra_limits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own ifra_limits" ON ifra_limits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own ifra_limits" ON ifra_limits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own ifra_limits" ON ifra_limits FOR DELETE USING (auth.uid() = user_id);
