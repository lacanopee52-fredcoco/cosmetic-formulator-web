-- Formule active = version choisie pour la fabrication (une seule par nom de formule)
ALTER TABLE formulas ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_formulas_is_active ON formulas(user_id, name) WHERE is_active = true;
