-- Nom de la personne (affiché dans l'app, ex. "Bonjour, Jean Dupont")
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
