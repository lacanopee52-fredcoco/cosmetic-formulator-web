/**
 * Script pour corriger les colonnes inversées dans la base de données
 * Inverse les colonnes 'inci' et 'fournisseur_principal' dans la table ingredients
 * 
 * ⚠️ ATTENTION: Ce script modifie les données dans Supabase
 * 
 * Usage: npx tsx scripts/fix-inverted-columns.ts
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

async function promptConfirmation(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question('⚠️  Êtes-vous sûr de vouloir inverser les colonnes inci et fournisseur_principal ? (oui/non): ', (answer) => {
      rl.close()
      resolve(answer.toLowerCase().trim() === 'oui')
    })
  })
}

async function fixInvertedColumns() {
  console.log('🔄 Correction des colonnes inversées dans la table ingredients...\n')

  // Demander confirmation
  const confirmed = await promptConfirmation()
  if (!confirmed) {
    console.log('❌ Opération annulée')
    return
  }

  // Récupérer tous les ingrédients
  console.log('📥 Récupération des ingrédients...')
  const { data: ingredients, error: fetchError } = await supabase
    .from('ingredients')
    .select('code, nom, inci, fournisseur_principal')

  if (fetchError) {
    console.error('❌ Erreur lors de la récupération:', fetchError.message)
    return
  }

  if (!ingredients || ingredients.length === 0) {
    console.log('⚠️  Aucun ingrédient trouvé')
    return
  }

  console.log(`✅ ${ingredients.length} ingrédients trouvés\n`)

  // Préparer les mises à jour
  const updates: Array<{
    code: string
    inci: string | null
    fournisseur_principal: string | null
  }> = []

  for (const ing of ingredients) {
    // Inverser les colonnes
    updates.push({
      code: ing.code,
      inci: ing.fournisseur_principal || null, // L'ancien fournisseur devient le nouveau INCI
      fournisseur_principal: ing.inci || null,  // L'ancien INCI devient le nouveau fournisseur
    })
  }

  console.log('📝 Exemple de transformation:')
  console.log(`   Avant: inci="${ingredients[0].inci}", fournisseur="${ingredients[0].fournisseur_principal}"`)
  console.log(`   Après: inci="${updates[0].inci}", fournisseur="${updates[0].fournisseur_principal}"`)
  console.log('')

  // Mettre à jour par batch de 100
  const batchSize = 100
  let updated = 0
  let errors = 0

  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize)
    
    // Mettre à jour chaque ingrédient individuellement (Supabase ne supporte pas UPDATE avec WHERE code IN)
    for (const update of batch) {
      const { error } = await supabase
        .from('ingredients')
        .update({
          inci: update.inci,
          fournisseur_principal: update.fournisseur_principal,
        })
        .eq('code', update.code)

      if (error) {
        console.error(`❌ Erreur pour ${update.code}:`, error.message)
        errors++
      } else {
        updated++
      }
    }

    console.log(`   Progression: ${Math.min(i + batchSize, updates.length)}/${updates.length} ingrédients traités`)
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
}

fixInvertedColumns().catch(console.error)
