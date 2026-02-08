/**
 * Script pour réinitialiser le mot de passe d'un utilisateur (Admin)
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

async function resetPassword() {
  console.log('🔐 Réinitialisation du mot de passe\n')

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
    // Demander l'email
    const email = await question('📧 Email de l\'utilisateur: ')
    
    if (!email || !email.includes('@')) {
      console.error('❌ Email invalide')
      rl.close()
      return
    }

    // Vérifier que l'utilisateur existe
    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers()
    
    if (usersError) {
      console.error('❌ Erreur lors de la récupération des utilisateurs:', usersError.message)
      rl.close()
      return
    }

    const user = usersData?.users.find(u => u.email === email)

    if (!user) {
      console.error(`❌ Utilisateur ${email} non trouvé`)
      rl.close()
      return
    }

    console.log(`\n✅ Utilisateur trouvé: ${user.email} (${user.id.substring(0, 8)}...)`)

    // Demander le nouveau mot de passe
    const newPassword = await question('\n🔑 Nouveau mot de passe (min 6 caractères): ')
    
    if (!newPassword || newPassword.length < 6) {
      console.error('❌ Le mot de passe doit contenir au moins 6 caractères')
      rl.close()
      return
    }

    // Confirmer
    const confirm = await question('\n⚠️  Êtes-vous sûr de vouloir changer le mot de passe ? (oui/non): ')
    
    if (confirm.toLowerCase() !== 'oui' && confirm.toLowerCase() !== 'o') {
      console.log('❌ Opération annulée')
      rl.close()
      return
    }

    // Réinitialiser le mot de passe
    console.log('\n🔄 Réinitialisation en cours...')
    
    const { data, error } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    )

    if (error) {
      console.error('❌ Erreur lors de la réinitialisation:', error.message)
      rl.close()
      return
    }

    console.log('\n✅ Mot de passe réinitialisé avec succès!')
    console.log(`\n📧 Email: ${email}`)
    console.log(`🔑 Nouveau mot de passe: ${newPassword}`)
    console.log('\n💡 Vous pouvez maintenant vous connecter avec ces identifiants.')

  } catch (error) {
    console.error('❌ Erreur:', error)
  } finally {
    rl.close()
  }
}

resetPassword().catch(console.error)
