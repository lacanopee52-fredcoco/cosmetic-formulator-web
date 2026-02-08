-- Table code emballage (feuille Excel "Emballages": description, prix unitaire)
CREATE TABLE IF NOT EXISTS packaging (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  prix_unitaire REAL NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, description)
);

CREATE INDEX IF NOT EXISTS idx_packaging_user_id ON packaging(user_id);
CREATE INDEX IF NOT EXISTS idx_packaging_description ON packaging(description);

ALTER TABLE packaging ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques si elles existent (permet de ré-exécuter le script)
DROP POLICY IF EXISTS "Users can view their own packaging" ON packaging;
DROP POLICY IF EXISTS "Users can insert their own packaging" ON packaging;
DROP POLICY IF EXISTS "Users can update their own packaging" ON packaging;
DROP POLICY IF EXISTS "Users can delete their own packaging" ON packaging;

CREATE POLICY "Users can view their own packaging"
  ON packaging FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own packaging"
  ON packaging FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own packaging"
  ON packaging FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own packaging"
  ON packaging FOR DELETE
  USING (auth.uid() = user_id);
