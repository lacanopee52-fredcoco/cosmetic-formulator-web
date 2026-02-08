/**
 * Script d'import Excel vers Supabase
 * 
 * Usage:
 * 1. Placez votre fichier DonnéesMP.xlsx dans le dossier scripts/
 * 2. Configurez vos variables d'environnement Supabase
 * 3. Exécutez: npx tsx scripts/import-excel.ts
 */

import XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'
import { fileURLToPath } from 'url'

// Configuration - Gérer __dirname pour ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
// Priorité au fichier sans accent (DonneesMP.xlsx), souvent plus complet avec l'onglet Allergènes 81
const EXCEL_FILE = (() => {
  const sansAccent = path.join(__dirname, 'DonneesMP.xlsx')
  const avecAccent = path.join(__dirname, 'DonnéesMP.xlsx')
  if (fs.existsSync(sansAccent)) return sansAccent
  return avecAccent
})()

// Charger les variables d'environnement depuis .env.local à la racine
const rootDir = path.resolve(__dirname, '..')
const envLocalPath = path.join(rootDir, '.env.local')

if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf-8')
  let loadedCount = 0
  envContent.split('\n').forEach((line) => {
    const trimmedLine = line.trim()
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const equalIndex = trimmedLine.indexOf('=')
      if (equalIndex > 0) {
        const key = trimmedLine.substring(0, equalIndex).trim()
        const value = trimmedLine.substring(equalIndex + 1).trim()
        // Supprimer les guillemets si présents
        const cleanValue = value.replace(/^["']|["']$/g, '')
        if (key && cleanValue && cleanValue !== 'xxxxxxxx') {
          process.env[key] = cleanValue
          loadedCount++
        }
      }
    }
  })
  console.log(`✅ Variables d'environnement chargées depuis .env.local (${loadedCount} variables)`)
} else {
  console.log(`⚠️  Fichier .env.local non trouvé à: ${envLocalPath}`)
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim()

// Debug: Afficher les valeurs (masquées pour sécurité)
if (SUPABASE_URL) {
  console.log(`✅ NEXT_PUBLIC_SUPABASE_URL: ${SUPABASE_URL.substring(0, 30)}...`)
} else {
  console.log('❌ NEXT_PUBLIC_SUPABASE_URL: manquante')
}

if (SUPABASE_KEY) {
  console.log(`✅ Clé Supabase: ${SUPABASE_KEY.substring(0, 20)}... (${SUPABASE_KEY.length} caractères)`)
} else {
  console.log('❌ Clé Supabase: manquante')
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('\n❌ Erreur: Variables d\'environnement Supabase manquantes')
  console.error(`   NEXT_PUBLIC_SUPABASE_URL: ${SUPABASE_URL ? '✅' : '❌'}`)
  console.error(`   SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅' : '❌'}`)
  console.error(`   NEXT_PUBLIC_SUPABASE_ANON_KEY: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅' : '❌'}`)
  console.error('\n   Vérifiez que:')
  console.error('   1. Le fichier .env.local existe à la racine du projet')
  console.error('   2. Les valeurs ne sont pas vides')
  console.error('   3. Il n\'y a pas d\'espaces avant/après les =')
  process.exit(1)
}

if (!SUPABASE_URL.startsWith('http://') && !SUPABASE_URL.startsWith('https://')) {
  console.error(`❌ Erreur: L'URL Supabase doit commencer par http:// ou https://`)
  console.error(`   URL actuelle: ${SUPABASE_URL}`)
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

interface IngredientRow {
  Code: string
  nom: string
  'Fournisseur principal'?: string
  INCI?: string
  Catégorie?: string
  'Prix au kilo'?: number
  'En stock'?: string | boolean
  '%PPAI'?: number
  '%PPAI Bio'?: number
  '%CPAI'?: number
  '%CPAI Bio'?: number
  Fonctions?: string
  'N°CAS'?: string
  Impuretés?: string
}

interface AllergenRow {
  Code: string
  [allergenName: string]: string | number | undefined
}

async function promptForUserId(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question('Entrez votre User ID (UUID) depuis Supabase Auth: ', (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

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
  
  const rows: IngredientRow[] = XLSX.utils.sheet_to_json(sheet, { defval: null })
  console.log(`   ${rows.length} lignes trouvées`)
  
  // Afficher les colonnes détectées pour debug
  if (rows.length > 0) {
    console.log(`   Colonnes détectées: ${Object.keys(rows[0]).join(', ')}`)
  }

  const ingredients = rows
    .filter((row) => row.Code && row.nom)
    .map((row) => ({
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

  // Import par batch de 1000
  const batchSize = 1000
  let imported = 0
  let errors = 0

  // Test avec un seul ingrédient d'abord
  if (ingredients.length > 0) {
    console.log(`\n   🧪 Test avec le premier ingrédient: ${ingredients[0].code} - ${ingredients[0].nom}`)
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
      console.error(`   Détails:`, JSON.stringify(testError, null, 2))
      console.error(`\n   💡 Vérifiez que:`)
      console.error(`      1. Le schéma SQL a bien été exécuté`)
      console.error(`      2. La clé service_role est correcte`)
      console.error(`      3. Le user_id est valide`)
      return ingredients
    } else {
      console.log(`   ✅ Test réussi! Données insérées:`, testData?.length || 0)
    }
  }

  for (let i = 0; i < ingredients.length; i += batchSize) {
    const batch = ingredients.slice(i, i + batchSize)
    const { data, error } = await supabase.from('ingredients').upsert(batch, {
      onConflict: 'code',
      ignoreDuplicates: false,
    }).select()

    if (error) {
      console.error(`   ❌ Erreur lors de l'import du batch ${Math.floor(i / batchSize) + 1}:`, error.message)
      console.error(`   Code:`, error.code)
      console.error(`   Détails:`, JSON.stringify(error, null, 2))
      errors += batch.length
    } else {
      imported += batch.length
      const insertedCount = data?.length || 0
      console.log(`   ✅ Batch ${Math.floor(i / batchSize) + 1}: ${insertedCount} ingrédients importés (sur ${batch.length} tentés)`)
      if (insertedCount !== batch.length) {
        console.log(`   ⚠️  Attention: ${batch.length - insertedCount} ingrédients n'ont pas été insérés`)
      }
    }
  }

  console.log(`\n   ✅ Total: ${imported} ingrédients importés`)
  if (errors > 0) {
    console.log(`   ⚠️  ${errors} erreurs`)
  }

  return ingredients
}

/**
 * Import des allergènes depuis l'onglet "Allergènes 81".
 *
 * Liaison par code : dans le fichier général (Liste), la colonne Code contient tous les codes
 * des matières premières. L'onglet Allergènes 81 reprend uniquement les codes des matières
 * qui ont des allergènes. Donc seule une matière dont le code apparaît dans Allergènes 81
 * aura des allergènes en base (table allergens, champ ingredient_code = code Liste).
 */
async function importAllergens(sheet: XLSX.WorkSheet, userId: string, ingredients: any[]) {
  console.log('\n🔬 Import des allergènes (liaison par code Liste = code Allergènes 81)...')

  const ingredientCodes = new Set(ingredients.map((i) => i.code))
  const labelToCode = new Map<string, string>()
  for (const i of ingredients) {
    const code = i.code
    if (i.nom) labelToCode.set(String(i.nom).trim().toLowerCase(), code)
    if (i.fournisseur_principal) labelToCode.set(String(i.fournisseur_principal).trim().toLowerCase(), code)
    if (i.inci) labelToCode.set(String(i.inci).trim().toLowerCase(), code)
  }
  console.log(`   ${ingredients.length} ingrédients (codes Liste). Liaison : code Allergènes 81 → ingredient_code.`)
  console.log(`   ${labelToCode.size} libellés (nom/fournisseur/INCI) pour secours si la colonne contient un nom.`)

  /** Priorité 1 : valeur = code existant dans la Liste. Priorité 2 : valeur = nom/fournisseur/INCI. */
  function resolveCode(val: string): string | null {
    const s = String(val || '').trim()
    if (!s) return null
    if (ingredientCodes.has(s)) return s
    const byLabel = labelToCode.get(s.toLowerCase())
    if (byLabel) return byLabel
    return null
  }

  const allergensToInsert: any[] = []
  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][]

  // Format "Allergènes 81" explicite : ligne 2 = noms allergènes, colonne 1 = code, colonnes 7-173 = %, données à partir ligne 6
  const ALLERGEN_NAMES_ROW = 1   // ligne 2 (0-based)
  const CODE_COL = 0             // colonne 1
  const ALLERGEN_COL_START = 6  // colonne 7
  const ALLERGEN_COL_END = 172  // colonne 173
  const DATA_START_ROW = 5      // ligne 6 (0-based)

  if (rawData.length >= 6 && (rawData[ALLERGEN_NAMES_ROW] || []).length > ALLERGEN_COL_START) {
    const headerRow = (rawData[ALLERGEN_NAMES_ROW] || []) as any[]
    const skippedCells: string[] = []

    for (let i = DATA_START_ROW; i < rawData.length; i++) {
      const row = rawData[i] as any[]
      const codeVal = String((row[CODE_COL] ?? '')).trim()
      if (!codeVal || /^\d+$/.test(codeVal)) continue // ignorer lignes vides ou numéros de ligne
      const code = resolveCode(codeVal)
      if (!code) {
        if (skippedCells.length < 10) skippedCells.push(codeVal)
        continue
      }
      const maxCol = Math.min(ALLERGEN_COL_END + 1, Math.max((row || []).length, headerRow.length))
      for (let j = ALLERGEN_COL_START; j < maxCol; j++) {
        const allergenName = String(headerRow[j] ?? '').trim()
        if (!allergenName) continue
        const val = row[j]
        const percentage = parseNumber(val)
        if (percentage !== null && percentage > 0) {
          allergensToInsert.push({
            ingredient_code: code,
            allergen_name: allergenName,
            percentage,
            user_id: userId,
          })
        }
      }
    }
    if (allergensToInsert.length > 0) {
      console.log(`   Format Allergènes 81 (ligne 2=noms, col 1=code, col 7-173=%, données à partir ligne 6): ${allergensToInsert.length} relations`)
      if (skippedCells.length > 0) {
        console.log(`   Exemples de codes non résolus: ${skippedCells.slice(0, 5).join(' | ')}`)
      }
    }
  }

  if (allergensToInsert.length === 0 && rawData.length < 2) {
    // Fallback: format classique (première ligne = en-têtes)
    const rows: AllergenRow[] = XLSX.utils.sheet_to_json(sheet)
    if (rows.length === 0) {
      console.log('   ⚠️  Aucune donnée d\'allergènes trouvée')
      return
    }
    const allergenNames = Object.keys(rows[0]).filter((key) => key !== 'Code')
    console.log(`   Format classique: ${rows.length} lignes, ${allergenNames.length} allergènes`)
    for (const row of rows) {
      const codeVal = String(row.Code ?? row.code ?? row['Référence'] ?? row['Matérie'] ?? '').trim()
      const code = resolveCode(codeVal) ?? (ingredientCodes.has(codeVal) ? codeVal : null)
      if (!code) continue
      for (const allergenName of allergenNames) {
        const percentage = parseNumber(row[allergenName])
        if (percentage !== null && percentage > 0) {
          allergensToInsert.push({
            ingredient_code: code,
            allergen_name: String(allergenName).trim(),
            percentage: percentage,
            user_id: userId,
          })
        }
      }
    }
  }

  if (allergensToInsert.length === 0 && rawData.length >= 2) {
    // Format "Allergènes 81": une ligne = une matière (identifiée par son code, même que dans la Liste)
    // En-têtes sur ligne 0 ou 1 ; colonne "Code" (ou Réf, Matière, etc.) = code matière ; autres colonnes = % allergènes
    let headerRowIndex = 1
    let dataStartIndex = 2
    let headerRow = rawData[1] || rawData[0]
    const matiereHeaderPattern = /code|réf|reference|ref|matière|nom|name|designation|désignation|produit|article|matière première/i
    let codeColIndex = (headerRow as any[]).map((h: any) => String(h || '').trim()).findIndex((h: string) =>
      matiereHeaderPattern.test(h)
    )
    if (codeColIndex < 0) codeColIndex = 0

    const allergenHeaders = (headerRow as any[]).map((h: any) => String(h || '').trim())
    console.log(`   Feuille Allergènes: ${rawData.length} lignes, en-têtes ligne ${headerRowIndex}, col. code/matière: ${codeColIndex}, ${allergenHeaders.length} colonnes`)

    const skippedCells: string[] = []
    for (let i = dataStartIndex; i < rawData.length; i++) {
      const row = rawData[i] as any[]
      const cell = String((row[codeColIndex] ?? '')).trim()
      if (!cell || /^code|réf|matière|nom|designation|désignation$/i.test(cell)) continue
      const code = resolveCode(cell)
      if (!code) {
        if (skippedCells.length < 10) skippedCells.push(cell)
        continue
      }

      for (let j = 0; j < allergenHeaders.length; j++) {
        if (j === codeColIndex) continue
        const allergenName = allergenHeaders[j]
        if (!allergenName) continue
        const val = row[j]
        const percentage = parseNumber(val)
        if (percentage !== null && percentage > 0) {
          allergensToInsert.push({
            ingredient_code: code,
            allergen_name: allergenName,
            percentage: percentage,
            user_id: userId,
          })
        }
      }
    }
    if (skippedCells.length > 0) {
      console.log(`   Exemples de libellés non résolus (vérifiez Liste): ${skippedCells.slice(0, 5).join(' | ')}`)
    }

    // Si rien trouvé avec ligne 1 = en-têtes, réessayer avec ligne 0 = en-têtes, données dès ligne 1
    if (allergensToInsert.length === 0 && rawData.length >= 2) {
      headerRow = rawData[0] as any[]
      const h0 = (headerRow || []).map((h: any) => String(h || '').trim())
      const matierePat = /code|réf|nom|matière|designation|désignation|produit|article/i
      const codeCol0 = h0.findIndex((h: string) => matierePat.test(h))
      const colCode = codeCol0 >= 0 ? codeCol0 : 0
      console.log('   Réessai avec ligne 0 = en-têtes, col. code:', colCode)
      for (let i = 1; i < rawData.length; i++) {
        const row = rawData[i] as any[]
        const cell = String((row[colCode] ?? '')).trim()
        if (!cell) continue
        const code = resolveCode(cell)
        if (!code) continue
        for (let j = 0; j < h0.length; j++) {
          if (j === colCode) continue
          const allergenName = h0[j]
          if (!allergenName) continue
          const val = row[j]
          const percentage = parseNumber(val)
          if (percentage !== null && percentage > 0) {
            allergensToInsert.push({
              ingredient_code: code,
              allergen_name: allergenName,
              percentage: percentage,
              user_id: userId,
            })
          }
        }
      }
    }
  }

  console.log(`   ${allergensToInsert.length} relations allergène-ingrédient à importer`)

  if (allergensToInsert.length === 0) {
    console.log('   ⚠️  Aucune relation allergène à importer')
    return
  }

  // Supprimer les anciens allergènes pour ces ingrédients
  const codes = [...new Set(allergensToInsert.map((a) => a.ingredient_code))]
  await supabase
    .from('allergens')
    .delete()
    .in('ingredient_code', codes)
    .eq('user_id', userId)

  // Import par batch
  const batchSize = 1000
  let imported = 0

  for (let i = 0; i < allergensToInsert.length; i += batchSize) {
    const batch = allergensToInsert.slice(i, i + batchSize)
    const { error } = await supabase.from('allergens').insert(batch)

    if (error) {
      console.error(`   ❌ Erreur lors de l'import du batch:`, error.message)
    } else {
      imported += batch.length
    }
  }

  console.log(`   ✅ ${imported} relations allergène importées`)
}

async function importToxicologyTests(sheet: XLSX.WorkSheet, userId: string, ingredients: any[]) {
  console.log('\n🧪 Import des tests toxicologiques...')
  
  const rows = XLSX.utils.sheet_to_json(sheet)
  console.log(`   ${rows.length} lignes trouvées`)

  if (rows.length === 0) {
    console.log('   ⚠️  Aucune donnée de tests toxicologiques trouvée')
    return
  }

  // Adapter selon la structure de votre feuille
  const testsToInsert: any[] = []
  const ingredientCodes = new Set(ingredients.map((i) => i.code))

  for (const row of rows) {
    const code = String((row as any).Code || '').trim()
    if (!code || !ingredientCodes.has(code)) continue

    // Adapter selon vos colonnes
    testsToInsert.push({
      ingredient_code: code,
      test_name: (row as any).Test || 'Test',
      test_result: (row as any).Résultat || null,
      test_date: (row as any).Date || null,
      notes: (row as any).Notes || null,
      user_id: userId,
    })
  }

  if (testsToInsert.length > 0) {
    // Supprimer les anciens tests pour ces ingrédients
    const codes = [...new Set(testsToInsert.map((t) => t.ingredient_code))]
    await supabase
      .from('toxicology_tests')
      .delete()
      .in('ingredient_code', codes)
      .eq('user_id', userId)

    // Import par batch
    const batchSize = 1000
    let imported = 0

    for (let i = 0; i < testsToInsert.length; i += batchSize) {
      const batch = testsToInsert.slice(i, i + batchSize)
      const { error } = await supabase.from('toxicology_tests').insert(batch)

      if (error) {
        console.error(`   ❌ Erreur lors de l'import du batch:`, error.message)
      } else {
        imported += batch.length
      }
    }

    console.log(`   ✅ ${imported} tests importés`)
  } else {
    console.log('   ⚠️  Aucun test à importer')
  }
}

async function importBabyRange(sheet: XLSX.WorkSheet, userId: string, ingredients: any[]) {
  console.log('\n👶 Import de la gamme bébé...')
  
  const rows = XLSX.utils.sheet_to_json(sheet)
  console.log(`   ${rows.length} lignes trouvées`)

  if (rows.length === 0) {
    console.log('   ⚠️  Aucune donnée de gamme bébé trouvée')
    return
  }

  const babyRangeToInsert: any[] = []
  const ingredientCodes = new Set(ingredients.map((i) => i.code))

  for (const row of rows) {
    const code = String((row as any).Code || '').trim()
    if (!code || !ingredientCodes.has(code)) continue

    babyRangeToInsert.push({
      ingredient_code: code,
      approved: normalizeBoolean((row as any).Approuvé),
      restrictions: (row as any).Restrictions || null,
      notes: (row as any).Notes || null,
      user_id: userId,
    })
  }

  if (babyRangeToInsert.length > 0) {
    const { error } = await supabase.from('baby_range').upsert(babyRangeToInsert, {
      onConflict: 'ingredient_code,user_id',
    })

    if (error) {
      console.error(`   ❌ Erreur:`, error.message)
    } else {
      console.log(`   ✅ ${babyRangeToInsert.length} entrées gamme bébé importées`)
    }
  }
}

async function main() {
  console.log('🚀 Import Excel vers Supabase\n')
  console.log('=' .repeat(50))

  // Vérifier que le fichier existe
  if (!fs.existsSync(EXCEL_FILE)) {
    console.error(`❌ Fichier non trouvé: ${EXCEL_FILE}`)
    console.error('   Placez DonneesMP.xlsx ou DonnéesMP.xlsx dans le dossier scripts/')
    process.exit(1)
  }

  // Demander le User ID
  const userId = await promptForUserId()
  if (!userId) {
    console.error('❌ User ID requis')
    process.exit(1)
  }

  // Lire le fichier Excel
  console.log(`\n📖 Lecture du fichier: ${EXCEL_FILE}`)
  const workbook = XLSX.readFile(EXCEL_FILE)
  const sheetNames = workbook.SheetNames
  console.log(`   Feuilles trouvées: ${sheetNames.join(', ')}`)

  // Importer la feuille "Liste" (ingrédients)
  // Essayer différents noms possibles
  const listeSheet = workbook.Sheets['Liste'] || 
                     workbook.Sheets['liste'] || 
                     workbook.Sheets['LISTE'] ||
                     workbook.Sheets[sheetNames.find(name => name.toLowerCase().includes('liste')) || '']
  
  if (!listeSheet) {
    console.error('❌ Feuille "Liste" non trouvée')
    console.error(`   Feuilles disponibles: ${sheetNames.join(', ')}`)
    process.exit(1)
  }

  const ingredients = await importIngredients(listeSheet, userId)

  // Importer les autres feuilles (avec recherche flexible)
  const findSheet = (name: string) => {
    const exact = workbook.Sheets[name]
    if (exact) return exact
    return workbook.Sheets[sheetNames.find(s => 
      s.toLowerCase().includes(name.toLowerCase())
    ) || '']
  }

  const allergenesSheet = findSheet('Allergènes')
  if (allergenesSheet) {
    await importAllergens(allergenesSheet, userId, ingredients)
  } else {
    console.log('\n⚠️  Feuille "Allergènes" non trouvée, ignorée')
  }

  const testsSheet = findSheet('Tests toxico')
  if (testsSheet) {
    await importToxicologyTests(testsSheet, userId, ingredients)
  } else {
    console.log('\n⚠️  Feuille "Tests toxico" non trouvée, ignorée')
  }

  const babySheet = findSheet('Gamme bébé')
  if (babySheet) {
    await importBabyRange(babySheet, userId, ingredients)
  } else {
    console.log('\n⚠️  Feuille "Gamme bébé" non trouvée, ignorée')
  }

  console.log('\n' + '='.repeat(50))
  console.log('✅ Import terminé avec succès!')
  console.log('\n💡 Note: Supabase est maintenant la source de vérité.')
  console.log('   Utilisez l\'application web pour modifier les données.')
}

main().catch((error) => {
  console.error('❌ Erreur fatale:', error)
  process.exit(1)
})
