-- Indicateur de stock par ligne de formule (carré couleur : neutre / rouge / vert / bleu)
ALTER TABLE formula_lines ADD COLUMN IF NOT EXISTS stock_indicator TEXT;
