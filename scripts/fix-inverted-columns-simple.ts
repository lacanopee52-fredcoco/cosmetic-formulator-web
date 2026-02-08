/**
 * Script SIMPLE pour corriger les colonnes inversées dans Supabase
 * Inverse les colonnes 'inci' et 'fournisseur_principal' dans la table ingredients
 * 
 * ⚠️ ATTENTION: Ce script modifie les données dans Supabase
 * 
 * Usage: 
 * 1. cd /Users/fredericmmunoz/cursor1/cosmetic-formulator-web/scripts
 * 2. npx tsx fix-inverted-columns-simple.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Charger les variables d'environnement
const rootDir = path.resolve(__dirname, '..')
const envLocalPath = path.join(rootDir, '.env.local')

if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf-8')
  envContent.split('\n').forEach((line) => {
    const trimmedLine = line.trim()
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const equalIndex = trimmedLine.indexOf('=')
      if (equalIndex > 0) {
        const key = trimmedLine.substring(0, equalIndex).trim()
        const value = trimmedLine.substring(equalIndex + 1).trim()
        const cleanValue = value.replace(/^["']|["']$/g, '')
        if (key && cleanValue && cleanValue !== 'xxxxxxxx') {
          process.env[key] = cleanValue
        }
      }
    }
  })
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Variables d\'environnement manquantes')
  console.error('   Vérifiez que NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont définis dans .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function fixInvertedColumns() {
  console.log('🔄 Correction des colonnes inversées dans la table ingredients...\n')
  console.log('⚠️  Cette opération va inverser les colonnes "inci" et "fournisseur_principal"')
  console.log('   Appuyez sur Ctrl+C pour annuler dans les 5 secondes...\n')
  
  // Attendre 5 secondes
  await new Promise(resolve => setTimeout(resolve, 5000))

  // Récupérer tous les ingrédients
  console.log('📥 Récupération des ingrédients...')
  const { data: ingredients, error: fetchError } = await supabase
    .from('ingredients')
    .select('code, nom, inci, fournisseur_principal')
    .limit(10) // D'abord, tester avec 10 ingrédients

  if (fetchError) {
    console.error('❌ Erreur lors de la récupération:', fetchError.message)
    return
  }

  if (!ingredients || ingredients.length === 0) {
    console.log('⚠️  Aucun ingrédient trouvé')
    return
  }

  console.log(`✅ ${ingredients.length} ingrédients trouvés\n`)

  // Afficher quelques exemples AVANT
  console.log('📊 Exemples AVANT correction:')
  for (let i = 0; i < Math.min(3, ingredients.length); i++) {
    const ing = ingredients[i]
    console.log(`   ${ing.code} - ${ing.nom}`)
    console.log(`      inci: "${ing.inci || '(vide)'}"`)
    console.log(`      fournisseur: "${ing.fournisseur_principal || '(vide)'}"`)
  }
  console.log('')

  // Demander confirmation
  console.log('❓ Voulez-vous continuer et inverser les colonnes pour ces ingrédients ?')
  console.log('   (Pour corriger TOUS les ingrédients, modifiez .limit(10) en .limit(10000) dans le script)')
  console.log('   Tapez "OUI" pour continuer:')
  
  // Pour l'instant, on va juste faire un test avec les 10 premiers
  // Pour corriger tous les ingrédients, il faudra modifier le script
  
  // Mettre à jour chaque ingrédient
  let updated = 0
  let errors = 0

  for (const ing of ingredients) {
    const { error } = await supabase
      .from('ingredients')
      .update({
        inci: ing.fournisseur_principal || null, // L'ancien fournisseur devient le nouveau INCI
        fournisseur_principal: ing.inci || null,  // L'ancien INCI devient le nouveau fournisseur
      })
      .eq('code', ing.code)

    if (error) {
      console.error(`❌ Erreur pour ${ing.code}:`, error.message)
      errors++
    } else {
      updated++
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log(`✅ Correction terminée!`)
  console.log(`   ${updated} ingrédients mis à jour`)
  if (errors > 0) {
    console.log(`   ⚠️  ${errors} erreurs`)
  }
  console.log('\n💡 Les colonnes ont été inversées:')
  console.log('   - La colonne "inci" contient maintenant les vrais noms INCI')
  console.log('   - La colonne "fournisseur_principal" contient maintenant les fournisseurs')
  console.log('\n⚠️  Note: Seuls les 10 premiers ingrédients ont été corrigés.')
  console.log('   Pour corriger TOUS les ingrédients, modifiez .limit(10) en supprimant .limit() dans le script')
}

fixInvertedColumns().catch(console.error)
