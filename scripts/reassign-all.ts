/**
 * Script simplifié pour réassigner TOUS les ingrédients orphelins au seul utilisateur existant
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

async function reassignAll() {
  console.log('🔄 Réassignation automatique des ingrédients orphelins...\n')

  try {
    // Récupérer tous les utilisateurs
    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers()

    if (usersError) {
      console.error('❌ Erreur:', usersError.message)
      return
    }

    const users = usersData?.users || []

    if (users.length === 0) {
      console.error('❌ Aucun utilisateur trouvé !')
      console.log('💡 Créez d\'abord un compte via http://localhost:3000/signup')
      return
    }

    if (users.length > 1) {
      console.log('⚠️  Plusieurs utilisateurs trouvés. Utilisez reassign-orphan-data.ts pour choisir.')
      return
    }

    const targetUser = users[0]
    console.log(`👤 Utilisateur cible: ${targetUser.email} (${targetUser.id.substring(0, 8)}...)\n`)

    // Compter tous les ingrédients
    const { data: totalRows } = await supabase
      .from('ingredients')
      .select('id')
    const totalCount = totalRows?.length ?? 0

    console.log(`📊 Total d'ingrédients dans la base: ${totalCount}`)

    // Compter les ingrédients déjà assignés à cet utilisateur
    const { data: userRows } = await supabase
      .from('ingredients')
      .select('id')
      .eq('user_id', targetUser.id)
    const userCount = userRows?.length ?? 0

    console.log(`📊 Ingrédients déjà assignés à ${targetUser.email}: ${userCount}`)

    const orphanCount = (totalCount || 0) - (userCount || 0)

    if (orphanCount === 0) {
      console.log('\n✅ Tous les ingrédients sont déjà assignés à votre compte !')
      return
    }

    console.log(`⚠️  Ingrédients orphelins à réassigner: ${orphanCount}\n`)

    // Réassigner tous les ingrédients qui n'ont pas le bon user_id
    console.log('🔄 Réassignation en cours...')

    // Méthode 1 : Mettre à jour tous les ingrédients qui n'ont pas le user_id de l'utilisateur
    const { data: updatedRows, error: updateError } = await supabase
      .from('ingredients')
      .update({ user_id: targetUser.id })
      .neq('user_id', targetUser.id)
      .select('id')
    const updatedCount = updatedRows?.length ?? 0

    if (updateError) {
      console.error('❌ Erreur lors de la réassignation:', updateError.message)
      
      // Méthode alternative : mettre à jour tous les ingrédients (y compris ceux avec user_id null)
      console.log('\n💡 Tentative alternative...')
      
      const { error: altError } = await supabase
        .from('ingredients')
        .update({ user_id: targetUser.id })

      if (altError) {
        console.error('❌ Erreur alternative:', altError.message)
        return
      }

      console.log('✅ Réassignation terminée (méthode alternative)')
    } else {
      console.log(`✅ ${updatedCount || orphanCount} ingrédients réassignés avec succès !`)
    }

    // Vérifier le résultat
    const { data: finalRows } = await supabase
      .from('ingredients')
      .select('id')
      .eq('user_id', targetUser.id)
    const finalCount = finalRows?.length ?? 0

    console.log(`\n📊 Ingrédients maintenant assignés à ${targetUser.email}: ${finalCount || 0}`)
    console.log('\n💡 Vous pouvez maintenant vous connecter et voir toutes vos matières premières !')

  } catch (error) {
    console.error('❌ Erreur:', error)
  }
}

reassignAll().catch(console.error)
