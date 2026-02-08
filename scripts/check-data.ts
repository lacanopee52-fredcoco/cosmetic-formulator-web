/**
 * Script pour vérifier les données dans Supabase
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

async function checkData() {
  console.log('🔍 Vérification des données dans Supabase...\n')

  // Compter les ingrédients
  const { count, error } = await supabase
    .from('ingredients')
    .select('*', { count: 'exact', head: true })

  if (error) {
    console.error('❌ Erreur:', error.message)
    return
  }

  console.log(`📊 Nombre total d'ingrédients: ${count || 0}`)

  // Afficher quelques exemples
  const { data, error: dataError } = await supabase
    .from('ingredients')
    .select('code, nom, user_id')
    .limit(5)

  if (dataError) {
    console.error('❌ Erreur lors de la récupération:', dataError.message)
    return
  }

  if (data && data.length > 0) {
    console.log('\n📋 Exemples d\'ingrédients:')
    data.forEach((ing, idx) => {
      console.log(`   ${idx + 1}. ${ing.code} - ${ing.nom} (user_id: ${ing.user_id?.substring(0, 8)}...)`)
    })
  } else {
    console.log('\n⚠️  Aucun ingrédient trouvé')
    console.log('\n💡 Vérifiez que:')
    console.log('   1. L\'import a bien été exécuté')
    console.log('   2. Le user_id utilisé correspond à votre utilisateur')
    console.log('   3. RLS n\'est pas activé pour la clé service_role')
  }
}

checkData().catch(console.error)
