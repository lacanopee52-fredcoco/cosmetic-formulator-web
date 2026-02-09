-- Rattacher toutes les données d'une organisation vers l'organisation du profil (pour corriger un décalage).
-- À exécuter dans Supabase SQL Editor après avoir remplacé les deux UUID ci-dessous.
--
-- 1) ORG_QUI_A_LES_DONNEES = l'organization_id qui a les ingrédients (celle affichée dans la table ingredients).
-- 2) ORG_DU_PROFIL = l'organization_id du profil de la personne qui doit voir les données (celle dans profiles pour cette utilisatrice).
--
-- Exemple : la cliente a organization_id = 350c1677-... dans profiles, mais les ingredients ont organization_id = 92282dbe-...
-- → Remplace ORG_QUI_A_LES_DONNEES par 92282dbe-... et ORG_DU_PROFIL par 350c1677-...
-- → Toutes les données (ingredients, etc.) passent dans l'org 350c1677, la cliente les verra.

DO $$
DECLARE
  ORG_QUI_A_LES_DONNEES uuid := '92282dbe-8b2e-47b8-9ae2-7b9af0000000'::uuid;  -- ⬅️ REMPLACER par l'org qui a les ingrédients
  ORG_DU_PROFIL         uuid := '350c1677-1564-4bd9-9bfa-fbde00000000'::uuid;  -- ⬅️ REMPLACER par l'org du profil (celle qui doit voir)
BEGIN
  UPDATE ingredients       SET organization_id = ORG_DU_PROFIL WHERE organization_id = ORG_QUI_A_LES_DONNEES;
  UPDATE allergens         SET organization_id = ORG_DU_PROFIL WHERE organization_id = ORG_QUI_A_LES_DONNEES;
  UPDATE toxicology_tests  SET organization_id = ORG_DU_PROFIL WHERE organization_id = ORG_QUI_A_LES_DONNEES;
  UPDATE baby_range        SET organization_id = ORG_DU_PROFIL WHERE organization_id = ORG_QUI_A_LES_DONNEES;
  UPDATE packaging         SET organization_id = ORG_DU_PROFIL WHERE organization_id = ORG_QUI_A_LES_DONNEES;
  UPDATE ifra_limits       SET organization_id = ORG_DU_PROFIL WHERE organization_id = ORG_QUI_A_LES_DONNEES;
  RAISE NOTICE 'Données rattachées à l''organisation %', ORG_DU_PROFIL;
END $$;
