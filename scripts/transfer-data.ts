/**
 * Script pour transférer les données d'un utilisateur à un autre
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

async function transferData() {
  console.log('🔄 Transfert des données...\n')

  // Récupérer tous les utilisateurs
  const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers()

  if (usersError) {
    console.error('❌ Erreur lors de la récupération des utilisateurs:', usersError.message)
    return
  }

  const users = usersData?.users || []
  
  // Trouver les utilisateurs
  const sourceUser = users.find(u => u.email === 'frmunoz@orange.fr')
  const targetUser = users.find(u => u.email === 'lacanopee52@gmail.com')

  if (!sourceUser) {
    console.error('❌ Utilisateur source (frmunoz@orange.fr) non trouvé')
    return
  }

  if (!targetUser) {
    console.error('❌ Utilisateur cible (lacanopee52@gmail.com) non trouvé')
    return
  }

  console.log(`📤 Source: ${sourceUser.email} (${sourceUser.id.substring(0, 8)}...)`)
  console.log(`📥 Cible: ${targetUser.email} (${targetUser.id.substring(0, 8)}...)\n`)

  // Compter les données source
  const { data: ingredientsRows } = await supabase
    .from('ingredients')
    .select('id')
    .eq('user_id', sourceUser.id)
  const ingredientsCount = ingredientsRows?.length ?? 0

  console.log(`📊 Ingrédients à transférer: ${ingredientsCount || 0}`)

  if (!ingredientsCount || ingredientsCount === 0) {
    console.log('⚠️  Aucune donnée à transférer')
    return
  }

  // Demander confirmation
  console.log('\n⚠️  Cette opération va:')
  console.log(`   1. Mettre à jour ${ingredientsCount} ingrédients`)
  console.log(`   2. Changer leur user_id de ${sourceUser.id.substring(0, 8)}... vers ${targetUser.id.substring(0, 8)}...`)
  console.log('\n💡 Pour continuer, modifiez ce script et décommentez la ligne "// await transfer()"')

  // Fonction de transfert (commentée par sécurité)
  async function transfer() {
    if (!sourceUser || !targetUser) return
    console.log('\n🔄 Transfert en cours...')

    // Mettre à jour les ingrédients
    const { error: updateError } = await supabase
      .from('ingredients')
      .update({ user_id: targetUser.id })
      .eq('user_id', sourceUser.id)

    if (updateError) {
      console.error('❌ Erreur lors du transfert:', updateError.message)
      return
    }

    console.log('✅ Transfert terminé avec succès!')
    console.log(`   ${ingredientsCount} ingrédients transférés vers ${targetUser.email}`)
  }

  // Décommentez cette ligne pour exécuter le transfert
  // await transfer()
}

transferData().catch(console.error)
