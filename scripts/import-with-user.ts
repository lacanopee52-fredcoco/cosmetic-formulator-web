/**
 * Script d'import avec User ID en paramètre (pour éviter la saisie interactive)
 */

import XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
// Priorité au fichier sans accent (souvent plus complet / plus à jour)
const EXCEL_FILE = (() => {
  const sansAccent = path.join(__dirname, 'DonneesMP.xlsx')
  const avecAccent = path.join(__dirname, 'DonnéesMP.xlsx')
  if (fs.existsSync(sansAccent)) return sansAccent
  return avecAccent
})()

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

// Récupérer le User ID depuis les arguments
const userId = process.argv[2]

if (!userId) {
  console.error('❌ Usage: npx tsx import-with-user.ts <USER_ID>')
  console.error('   Exemple: npx tsx import-with-user.ts a1b2c3d4-e5f6-7890-abcd-ef1234567890')
  process.exit(1)
}

console.log(`✅ User ID: ${userId.substring(0, 8)}...`)

// Fonctions d'import (copiées depuis import-excel.ts)
function normalizeBoolean(value: any): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim()
    return lower === 'oui' || lower === 'yes' || lower === 'true' || lower === '1' || lower === 'o'
  }
  if (typeof value === 'number') return value === 1
  return false
}

function parseNumber(value: any): number | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const cleaned = value.replace(',', '.').replace(/\s+/g, '')
    const parsed = parseFloat(cleaned)
    return isNaN(parsed) ? null : parsed
  }
  return null
}

async function importIngredients(sheet: XLSX.WorkSheet, userId: string) {
  console.log('\n📦 Import des ingrédients depuis la feuille "Liste"...')
  
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null })
  console.log(`   ${rows.length} lignes trouvées`)
  
  if (rows.length > 0) {
    console.log(`   Colonnes détectées: ${Object.keys(rows[0] as Record<string, unknown>).join(', ')}`)
  }

  const ingredients = rows
    .filter((row: any) => row.Code && row.nom)
    .map((row: any) => ({
      code: String(row.Code).trim(),
      nom: String(row.nom).trim(),
      fournisseur_principal: row['Fournisseur principal'] ? String(row['Fournisseur principal']).trim() : null,
      inci: row.INCI ? String(row.INCI).trim() : null,
      categorie: row.Catégorie ? String(row.Catégorie).trim() : null,
      prix_au_kilo: parseNumber(row['Prix au kilo']),
      en_stock: normalizeBoolean(row['En stock']),
      pourcentage_ppai: parseNumber(row['%PPAI']),
      pourcentage_ppai_bio: parseNumber(row['%PPAI Bio']),
      pourcentage_cpai: parseNumber(row['%CPAI']),
      pourcentage_cpai_bio: parseNumber(row['%CPAI Bio']),
      fonctions: row.Fonctions ? String(row.Fonctions).trim() : null,
      numero_cas: row['N°CAS'] ? String(row['N°CAS']).trim() : null,
      impuretes: row.Impuretés ? String(row.Impuretés).trim() : null,
      user_id: userId,
    }))

  console.log(`   ${ingredients.length} ingrédients valides à importer`)

  // Test avec un seul ingrédient d'abord
  if (ingredients.length > 0) {
    console.log(`\n   🧪 Test avec le premier ingrédient: ${ingredients[0].code} - ${ingredients[0].nom}`)
    console.log(`   Données à insérer:`, JSON.stringify(ingredients[0], null, 2))
    
    const testIngredient = ingredients[0]
    const { data: testData, error: testError } = await supabase
      .from('ingredients')
      .upsert([testIngredient], {
        onConflict: 'code',
        ignoreDuplicates: false,
      })
      .select()

    if (testError) {
      console.error(`   ❌ Erreur de test:`, testError.message)
      console.error(`   Code d'erreur:`, testError.code)
      console.error(`   Détails complets:`, JSON.stringify(testError, null, 2))
      console.error(`\n   💡 Vérifiez que:`)
      console.error(`      1. Le schéma SQL a bien été exécuté`)
      console.error(`      2. La clé service_role est correcte`)
      console.error(`      3. Le user_id "${userId}" existe dans auth.users`)
      return ingredients
    } else {
      console.log(`   ✅ Test réussi! Données insérées:`, testData?.length || 0)
      if (testData && testData.length > 0) {
        console.log(`   📊 Données retournées:`, JSON.stringify(testData[0], null, 2))
      }
    }
  }

  // Supprimer les doublons (garder le dernier en cas de code en double)
  const uniqueIngredients = new Map<string, typeof ingredients[0]>()
  for (const ing of ingredients) {
    uniqueIngredients.set(ing.code, ing) // Le dernier écrase le précédent
  }
  const deduplicatedIngredients = Array.from(uniqueIngredients.values())
  
  if (deduplicatedIngredients.length < ingredients.length) {
    const duplicates = ingredients.length - deduplicatedIngredients.length
    console.log(`   ⚠️  ${duplicates} ingrédients en double détectés et supprimés`)
    console.log(`   ${deduplicatedIngredients.length} ingrédients uniques à importer`)
  }

  // Import par batch
  const batchSize = 100
  let imported = 0
  let errors = 0

  for (let i = 0; i < deduplicatedIngredients.length; i += batchSize) {
    let batch = deduplicatedIngredients.slice(i, i + batchSize)
    
    // Vérifier qu'il n'y a pas de doublons dans le batch
    const batchCodes = new Set(batch.map(ing => ing.code))
    if (batchCodes.size !== batch.length) {
      console.log(`   ⚠️  Batch ${Math.floor(i / batchSize) + 1}: ${batch.length - batchCodes.size} doublons détectés, suppression...`)
      // Supprimer les doublons du batch (garder le premier)
      const uniqueBatch: typeof batch = []
      const seen = new Set<string>()
      for (const ing of batch) {
        if (!seen.has(ing.code)) {
          uniqueBatch.push(ing)
          seen.add(ing.code)
        }
      }
      batch = uniqueBatch
    }
    
    const { data, error } = await supabase.from('ingredients').upsert(batch, {
      onConflict: 'code',
      ignoreDuplicates: false,
    }).select()

    if (error) {
      console.error(`   ❌ Erreur batch ${Math.floor(i / batchSize) + 1}:`, error.message)
      console.error(`   Code:`, error.code)
      if (error.details) console.error(`   Détails:`, error.details)
      
      // En cas d'erreur, essayer un par un pour ce batch
      console.log(`   🔄 Tentative d'import un par un pour ce batch...`)
      let batchImported = 0
      for (const ing of batch) {
        const { error: singleError } = await supabase.from('ingredients').upsert([ing], {
          onConflict: 'code',
          ignoreDuplicates: false,
        })
        if (singleError) {
          console.error(`      ❌ Erreur pour ${ing.code}:`, singleError.message)
          errors++
        } else {
          batchImported++
        }
      }
      imported += batchImported
    } else {
      imported += (data?.length || 0)
      const insertedCount = data?.length || 0
      console.log(`   ✅ Batch ${Math.floor(i / batchSize) + 1}: ${insertedCount}/${batch.length} ingrédients importés`)
      if (insertedCount !== batch.length) {
        console.log(`   ⚠️  ${batch.length - insertedCount} ingrédients non insérés`)
      }
    }
  }

  console.log(`\n   ✅ Total: ${imported} ingrédients importés`)
  if (errors > 0) {
    console.log(`   ⚠️  ${errors} erreurs`)
  }

  return ingredients
}

async function main() {
  console.log('🚀 Import Excel vers Supabase\n')
  console.log('='.repeat(50))

  if (!fs.existsSync(EXCEL_FILE)) {
    console.error(`❌ Fichier non trouvé: ${EXCEL_FILE}`)
    process.exit(1)
  }

  console.log(`\n📖 Lecture du fichier: ${EXCEL_FILE}`)
  const workbook = XLSX.readFile(EXCEL_FILE)
  const sheetNames = workbook.SheetNames
  console.log(`   Feuilles trouvées: ${sheetNames.join(', ')}`)

  const listeSheet = workbook.Sheets['Liste'] || 
                     workbook.Sheets['liste'] || 
                     workbook.Sheets['LISTE'] ||
                     workbook.Sheets[sheetNames.find((name: string) => name.toLowerCase().includes('liste')) || '']
  
  if (!listeSheet) {
    console.error('❌ Feuille "Liste" non trouvée')
    process.exit(1)
  }

  await importIngredients(listeSheet, userId)

  console.log('\n' + '='.repeat(50))
  console.log('✅ Import terminé!')
}

main().catch((error) => {
  console.error('❌ Erreur fatale:', error)
  process.exit(1)
})
