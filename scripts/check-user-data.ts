/**
 * Script pour vérifier les données d'un utilisateur spécifique dans Supabase
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

async function checkUserData() {
  console.log('🔍 Vérification des données par utilisateur...\n')

  // Récupérer tous les utilisateurs
  const { data: users, error: usersError } = await supabase.auth.admin.listUsers()

  if (usersError) {
    console.error('❌ Erreur lors de la récupération des utilisateurs:', usersError.message)
    return
  }

  console.log(`👥 Nombre d'utilisateurs: ${users?.users.length || 0}\n`)

  for (const user of users?.users || []) {
    console.log(`\n📧 Utilisateur: ${user.email} (${user.id.substring(0, 8)}...)`)
    
    // Compter les ingrédients pour cet utilisateur
    const { count, error } = await supabase
      .from('ingredients')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (error) {
      console.error(`   ❌ Erreur: ${error.message}`)
      continue
    }

    console.log(`   📊 Ingrédients: ${count || 0}`)

    // Afficher quelques exemples
    if (count && count > 0) {
      const { data, error: dataError } = await supabase
        .from('ingredients')
        .select('code, nom')
        .eq('user_id', user.id)
        .limit(5)

      if (!dataError && data) {
        console.log(`   📋 Exemples:`)
        data.forEach((ing, idx) => {
          console.log(`      ${idx + 1}. ${ing.code} - ${ing.nom}`)
        })
      }
    }
  }

  // Vérifier aussi les ingrédients sans user_id (anciens imports)
  const { count: noUserCount } = await supabase
    .from('ingredients')
    .select('*', { count: 'exact', head: true })
    .is('user_id', null)

  if (noUserCount && noUserCount > 0) {
    console.log(`\n⚠️  ${noUserCount} ingrédients sans user_id (anciens imports)`)
  }
}

checkUserData().catch(console.error)
