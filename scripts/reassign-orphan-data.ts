/**
 * Script pour réassigner les données orphelines (sans user_id valide) à un nouvel utilisateur
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

async function reassignOrphanData() {
  console.log('🔍 Recherche des données orphelines...\n')

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
    // Compter les ingrédients orphelins (sans user_id valide)
    const { count: orphanCount, error: countError } = await supabase
      .from('ingredients')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error('❌ Erreur:', countError.message)
      rl.close()
      return
    }

    console.log(`📊 Total d'ingrédients dans la base: ${orphanCount || 0}`)

    // Récupérer tous les utilisateurs existants
    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers()

    if (usersError) {
      console.error('❌ Erreur lors de la récupération des utilisateurs:', usersError.message)
      rl.close()
      return
    }

    const users = usersData?.users || []
    const validUserIds = new Set(users.map(u => u.id))

    console.log(`👥 Utilisateurs existants: ${users.length}`)
    users.forEach(u => {
      console.log(`   - ${u.email} (${u.id.substring(0, 8)}...)`)
    })

    // Compter les ingrédients avec des user_id invalides
    const { data: allIngredients } = await supabase
      .from('ingredients')
      .select('user_id')
      .limit(1000)

    const orphanIngredients = (allIngredients || []).filter(
      ing => !ing.user_id || !validUserIds.has(ing.user_id)
    )

    console.log(`\n⚠️  Ingrédients orphelins (user_id invalide): ${orphanIngredients.length}`)

    if (orphanIngredients.length === 0) {
      console.log('\n✅ Tous les ingrédients ont un user_id valide !')
      rl.close()
      return
    }

    if (users.length === 0) {
      console.log('\n❌ Aucun utilisateur trouvé !')
      console.log('💡 Créez d\'abord un compte via l\'application web (http://localhost:3000/signup)')
      rl.close()
      return
    }

    // Demander à quel utilisateur réassigner
    console.log('\n📋 À quel utilisateur voulez-vous réassigner les données ?')
    users.forEach((u, idx) => {
      console.log(`   ${idx + 1}. ${u.email} (${u.id.substring(0, 8)}...)`)
    })

    const choice = await question('\nNuméro de l\'utilisateur (1, 2, etc.) : ')
    const userIndex = parseInt(choice) - 1

    if (userIndex < 0 || userIndex >= users.length) {
      console.error('❌ Choix invalide')
      rl.close()
      return
    }

    const targetUser = users[userIndex]
    console.log(`\n✅ Utilisateur sélectionné: ${targetUser.email}`)

    // Confirmer
    const confirm = await question(`\n⚠️  Réassigner ${orphanIngredients.length} ingrédients à ${targetUser.email} ? (oui/non): `)

    if (confirm.toLowerCase() !== 'oui' && confirm.toLowerCase() !== 'o') {
      console.log('❌ Opération annulée')
      rl.close()
      return
    }

    // Réassigner tous les ingrédients orphelins
    console.log('\n🔄 Réassignation en cours...')

    // Mettre à jour tous les ingrédients qui n'ont pas de user_id valide
    const { error: updateError } = await supabase
      .from('ingredients')
      .update({ user_id: targetUser.id })
      .not('user_id', 'in', `(${Array.from(validUserIds).map(id => `'${id}'`).join(',')})`)

    if (updateError) {
      console.error('❌ Erreur lors de la réassignation:', updateError.message)
      console.log('\n💡 Tentative alternative...')

      // Alternative : mettre à jour tous les ingrédients sans user_id valide
      const { error: altError } = await supabase
        .from('ingredients')
        .update({ user_id: targetUser.id })
        .or(`user_id.is.null,user_id.not.in.(${Array.from(validUserIds).map(id => `'${id}'`).join(',')})`)

      if (altError) {
        console.error('❌ Erreur alternative:', altError.message)
        rl.close()
        return
      }
    }

    console.log('\n✅ Réassignation terminée avec succès!')
    console.log(`   ${orphanIngredients.length} ingrédients réassignés à ${targetUser.email}`)
    console.log(`\n💡 Vous pouvez maintenant vous connecter avec ${targetUser.email} et voir toutes vos matières premières !`)

  } catch (error) {
    console.error('❌ Erreur:', error)
  } finally {
    rl.close()
  }
}

reassignOrphanData().catch(console.error)
