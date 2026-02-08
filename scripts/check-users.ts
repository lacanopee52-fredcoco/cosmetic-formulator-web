/**
 * Script pour vérifier les utilisateurs dans Supabase
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

async function checkUsers() {
  console.log('🔍 Vérification des utilisateurs...\n')

  const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers()

  if (usersError) {
    console.error('❌ Erreur:', usersError.message)
    return
  }

  const users = usersData?.users || []

  if (users.length === 0) {
    console.log('⚠️  Aucun utilisateur trouvé')
    console.log('💡 Créez un compte via http://localhost:3000/signup')
    return
  }

  console.log(`👥 Nombre d'utilisateurs: ${users.length}\n`)

  users.forEach((user, idx) => {
    console.log(`${idx + 1}. ${user.email}`)
    console.log(`   ID: ${user.id}`)
    console.log(`   Créé le: ${user.created_at}`)
    console.log(`   Dernière connexion: ${user.last_sign_in_at || 'Jamais'}`)
    console.log(`   Email confirmé: ${user.email_confirmed_at ? '✅ Oui' : '❌ Non'}`)
    console.log('')
  })

  // Vérifier les ingrédients par utilisateur
  for (const user of users) {
    const { count } = await supabase
      .from('ingredients')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    console.log(`📊 ${user.email}: ${count || 0} ingrédients`)
  }
}

checkUsers().catch(console.error)
