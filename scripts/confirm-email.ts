/**
 * Script pour confirmer manuellement l'email d'un utilisateur
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import * as readline from 'readline'

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

async function confirmEmail() {
  console.log('📧 Confirmation manuelle de l\'email\n')

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  const question = (query: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(query, resolve)
    })
  }

  try {
    // Récupérer tous les utilisateurs
    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers()

    if (usersError) {
      console.error('❌ Erreur:', usersError.message)
      rl.close()
      return
    }

    const users = usersData?.users || []

    if (users.length === 0) {
      console.log('⚠️  Aucun utilisateur trouvé')
      rl.close()
      return
    }

    // Afficher les utilisateurs non confirmés
    const unconfirmedUsers = users.filter(u => !u.email_confirmed_at)
    
    if (unconfirmedUsers.length === 0) {
      console.log('✅ Tous les utilisateurs ont leur email confirmé !')
      rl.close()
      return
    }

    console.log(`⚠️  ${unconfirmedUsers.length} utilisateur(s) avec email non confirmé:\n`)

    unconfirmedUsers.forEach((user, idx) => {
      console.log(`${idx + 1}. ${user.email} (${user.id.substring(0, 8)}...)`)
    })

    const choice = await question('\nNuméro de l\'utilisateur à confirmer (1, 2, etc.) ou "tous" pour tous : ')
    
    let usersToConfirm = []

    if (choice.toLowerCase() === 'tous' || choice.toLowerCase() === 'all') {
      usersToConfirm = unconfirmedUsers
    } else {
      const userIndex = parseInt(choice) - 1
      if (userIndex < 0 || userIndex >= unconfirmedUsers.length) {
        console.error('❌ Choix invalide')
        rl.close()
        return
      }
      usersToConfirm = [unconfirmedUsers[userIndex]]
    }

    // Confirmer
    const confirm = await question(`\n⚠️  Confirmer l'email de ${usersToConfirm.length} utilisateur(s) ? (oui/non): `)

    if (confirm.toLowerCase() !== 'oui' && confirm.toLowerCase() !== 'o') {
      console.log('❌ Opération annulée')
      rl.close()
      return
    }

    // Confirmer les emails
    console.log('\n🔄 Confirmation en cours...')

    for (const user of usersToConfirm) {
      const { error } = await supabase.auth.admin.updateUserById(
        user.id,
        { email_confirm: true }
      )

      if (error) {
        console.error(`❌ Erreur pour ${user.email}:`, error.message)
      } else {
        console.log(`✅ ${user.email} confirmé avec succès`)
      }
    }

    console.log('\n✅ Opération terminée!')
    console.log('\n💡 Vous pouvez maintenant vous connecter avec votre compte.')

  } catch (error) {
    console.error('❌ Erreur:', error)
  } finally {
    rl.close()
  }
}

confirmEmail().catch(console.error)
