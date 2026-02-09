-- Rendre user_id nullable sur packaging pour que l'import Excel ne plante pas
-- (l'app envoie organization_id + user_id ; si l'ancienne version est encore déployée, user_id peut manquer)
ALTER TABLE packaging ALTER COLUMN user_id DROP NOT NULL;
