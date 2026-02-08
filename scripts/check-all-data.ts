/**
 * Script pour vérifier TOUTES les données dans Supabase (sans filtre user_id)
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
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function checkAllData() {
  console.log('🔍 Vérification complète de la base de données...\n')

  try {
    // Vérifier les ingrédients (sans filtre)
    const { count: ingredientsCount, data: ingredientsSample } = await supabase
      .from('ingredients')
      .select('code, nom, user_id')
      .limit(10)

    console.log(`📊 Total d'ingrédients: ${ingredientsCount || 0}`)

    if (ingredientsCount && ingredientsCount > 0) {
      console.log('\n📋 Exemples d\'ingrédients:')
      ingredientsSample?.forEach((ing, idx) => {
        console.log(`   ${idx + 1}. ${ing.code} - ${ing.nom}`)
        console.log(`      user_id: ${ing.user_id || 'NULL (orphelin)'}`)
      })
    } else {
      console.log('\n⚠️  Aucun ingrédient trouvé dans la base de données !')
      console.log('\n💡 Les données ont peut-être été supprimées.')
      console.log('   Vous devrez réimporter les données depuis le fichier Excel.')
    }

    // Vérifier les autres tables
    const { count: allergensCount } = await supabase
      .from('allergens')
      .select('*', { count: 'exact', head: true })

    const { count: formulasCount } = await supabase
      .from('formulas')
      .select('*', { count: 'exact', head: true })

    console.log(`\n📊 Autres données:`)
    console.log(`   - Allergènes: ${allergensCount || 0}`)
    console.log(`   - Formules: ${formulasCount || 0}`)

  } catch (error) {
    console.error('❌ Erreur:', error)
  }
}

checkAllData().catch(console.error)
