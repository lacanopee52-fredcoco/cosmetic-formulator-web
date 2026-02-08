/**
 * Script d'import automatique qui détecte le seul utilisateur et importe les données
 */

import XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
// Priorité au fichier sans accent (DonneesMP.xlsx), souvent plus complet avec l'onglet Allergènes 81
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

async function autoImport() {
  console.log('🔄 Import automatique des données...\n')

  try {
    // Vérifier que le fichier existe
    if (!fs.existsSync(EXCEL_FILE)) {
      console.error(`❌ Fichier Excel non trouvé: ${EXCEL_FILE}`)
      console.log('💡 Copiez DonneesMP.xlsx ou DonnéesMP.xlsx dans le dossier scripts/')
      return
    }

    // Récupérer le seul utilisateur
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
      console.log('⚠️  Plusieurs utilisateurs trouvés. Utilisez import-with-user.ts avec un user_id spécifique.')
      return
    }

    const userId = users[0].id
    console.log(`👤 Utilisateur: ${users[0].email} (${userId.substring(0, 8)}...)\n`)

    // Lire le fichier Excel
    console.log('📖 Lecture du fichier Excel...')
    console.log(`   Fichier utilisé: ${path.basename(EXCEL_FILE)}`)
    const workbook = XLSX.readFile(EXCEL_FILE)
    const sheetNames = workbook.SheetNames

    console.log(`📋 Feuilles trouvées: ${sheetNames.join(', ')}\n`)

    // Trouver la feuille "Liste"
    const listeSheetName = sheetNames.find(name => 
      name.toLowerCase().includes('liste') || name === 'Liste'
    ) || sheetNames[0]

    console.log(`📄 Utilisation de la feuille: ${listeSheetName}`)
    const sheet = workbook.Sheets[listeSheetName]
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][]

    if (data.length < 2) {
      console.error('❌ Le fichier Excel semble vide ou mal formaté')
      return
    }

    // Parser les en-têtes
    const headers = data[0].map((h: any) => String(h).trim())
    console.log(`📊 ${data.length - 1} lignes de données trouvées\n`)

    // Mapper les colonnes
    // IMPORTANT: ne pas détecter "inci" dans "prINCIpal" (Fournisseur principal)
    const isInciHeader = (h: string) => /\binci\b/i.test(h) || /^inci\b/i.test(h.trim())
    const codeIndex = headers.findIndex(h => h.toLowerCase().includes('code'))
    const nomIndex = headers.findIndex(h => h.toLowerCase().includes('nom') && !isInciHeader(h))
    const fournisseurIndex = headers.findIndex(h => h.toLowerCase().includes('fournisseur'))
    const inciIndex = headers.findIndex(h => isInciHeader(h))
    const categorieIndex = headers.findIndex(h => h.toLowerCase().includes('catégorie') || h.toLowerCase().includes('categorie'))
    const prixIndex = headers.findIndex(h => h.toLowerCase().includes('prix'))
    const stockIndex = headers.findIndex(h => h.toLowerCase().includes('stock') || h.toLowerCase().includes('en stock'))

    // Parser les ingrédients
    const ingredients: any[] = []
    const seenCodes = new Set<string>()

    for (let i = 1; i < data.length; i++) {
      const row = data[i]
      const code = codeIndex >= 0 ? String(row[codeIndex] || '').trim() : ''
      
      if (!code || seenCodes.has(code)) continue
      seenCodes.add(code)

      const nom = nomIndex >= 0 ? String(row[nomIndex] || '').trim() : ''
      if (!nom) continue

      const ingredient: any = {
        code,
        nom,
        user_id: userId,
        fournisseur_principal: fournisseurIndex >= 0 ? String(row[fournisseurIndex] || '').trim() || null : null,
        inci: inciIndex >= 0 ? String(row[inciIndex] || '').trim() || null : null,
        categorie: categorieIndex >= 0 ? String(row[categorieIndex] || '').trim() || null : null,
        prix_au_kilo: prixIndex >= 0 ? (parseFloat(String(row[prixIndex] || '0').replace(',', '.')) || null) : null,
        en_stock: stockIndex >= 0 ? String(row[stockIndex] || '').toLowerCase().includes('oui') : false,
      }

      ingredients.push(ingredient)
    }

    console.log(`✅ ${ingredients.length} ingrédients parsés\n`)

    // Importer par lots
    const BATCH_SIZE = 100
    let imported = 0

    for (let i = 0; i < ingredients.length; i += BATCH_SIZE) {
      const batch = ingredients.slice(i, i + BATCH_SIZE)
      
      // Dédupliquer le batch
      const uniqueBatch = batch.filter((ing, idx, self) => 
        idx === self.findIndex(i => i.code === ing.code)
      )

      // Upsert pour mettre à jour les ingrédients déjà présents (clé = code)
      const { error } = await supabase
        .from('ingredients')
        .upsert(uniqueBatch, { onConflict: 'code' })

      if (error) {
        console.error(`❌ Erreur lors de l'import du lot ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message)
      } else {
        imported += uniqueBatch.length
        console.log(`✅ Lot ${Math.floor(i / BATCH_SIZE) + 1}: ${uniqueBatch.length} ingrédients importés (Total: ${imported}/${ingredients.length})`)
      }
    }

    console.log(`\n🎉 ${imported} ingrédients importés pour ${users[0].email}`)

    // Importer les allergènes depuis l'onglet "Allergènes" ou "Allergènes 81"
    const allergenSheetName = sheetNames.find(name => {
      const n = name.toLowerCase().replace(/\s+/g, ' ')
      return n.includes('allergène') || n.includes('allergenes') || (n.includes('81') && n.includes('allerg'))
    })
    if (!allergenSheetName && sheetNames.length > 0) {
      console.log('\n📋 Noms exacts des onglets dans le fichier:', sheetNames.join(' | '))
    }
    if (allergenSheetName) {
      // Liaison par code : Liste (colonne Code) = Allergènes 81 (colonne Code). Seules les matières dont le code
      // figure dans Allergènes 81 ont des allergènes.
      console.log('\n🔬 Import des allergènes (liaison par code Liste = code Allergènes 81)...')
      console.log('   Onglet:', allergenSheetName)
      const allergenSheet = workbook.Sheets[allergenSheetName]
      const rawAllergen = XLSX.utils.sheet_to_json(allergenSheet, { header: 1, defval: '' }) as any[][]

      const ingredientCodesSet = new Set(ingredients.map((i) => i.code))
      const labelToCode = new Map<string, string>()
      for (const i of ingredients) {
        const code = i.code
        if (i.nom) labelToCode.set(String(i.nom).trim().toLowerCase(), code)
        if (i.fournisseur_principal) labelToCode.set(String(i.fournisseur_principal).trim().toLowerCase(), code)
        if (i.inci) labelToCode.set(String(i.inci).trim().toLowerCase(), code)
      }
      console.log(`   ${ingredients.length} ingrédients (codes Liste). Liaison : code Allergènes 81 → ingredient_code.`)
      function resolveCode(val: string): string | null {
        const s = String(val || '').trim()
        if (!s) return null
        if (ingredientCodesSet.has(s)) return s
        const byLabel = labelToCode.get(s.toLowerCase())
        if (byLabel) return byLabel
        return null
      }

      const allergensToInsert: any[] = []

      // Format "Allergènes 81" explicite : ligne 2 = noms allergènes, colonne 1 = code, colonnes 7-173 = %, données à partir ligne 6
      const ALLERGEN_NAMES_ROW = 1
      const CODE_COL = 0
      const ALLERGEN_COL_START = 6
      const ALLERGEN_COL_END = 172
      const DATA_START_ROW = 5

      if (rawAllergen.length >= 6 && (rawAllergen[ALLERGEN_NAMES_ROW] || []).length > ALLERGEN_COL_START) {
        const headerRow = (rawAllergen[ALLERGEN_NAMES_ROW] || []) as any[]
        const skippedCells: string[] = []
        for (let i = DATA_START_ROW; i < rawAllergen.length; i++) {
          const row = (rawAllergen[i] || []) as any[]
          const codeVal = String((row[CODE_COL] ?? '')).trim()
          if (!codeVal || /^\d+$/.test(codeVal)) continue
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
            const pct = val === '' || val == null ? null : parseFloat(String(val).replace(',', '.').replace(/\s+/g, ''))
            if (pct != null && !isNaN(pct) && pct > 0) {
              allergensToInsert.push({
                ingredient_code: code,
                allergen_name: allergenName,
                percentage: pct,
                user_id: userId,
              })
            }
          }
        }
        if (allergensToInsert.length > 0) {
          console.log(`   Format Allergènes 81 (ligne 2=noms, col 1=code, col 7-173=%, données ligne 6+): ${allergensToInsert.length} relations`)
          if (skippedCells.length > 0) {
            console.log(`   Exemples de codes non résolus: ${skippedCells.slice(0, 5).join(' | ')}`)
          }
        }
      }

      if (allergensToInsert.length === 0 && rawAllergen.length >= 2) {
        let headerRow = rawAllergen[1] || rawAllergen[0]
        let allergenHeaders = (headerRow as any[]).map((h: any) => String(h || '').trim())
        const matierePat = /code|réf|reference|ref|matière|nom|name|designation|désignation|produit|article|matière première/i
        let codeColIndex = allergenHeaders.findIndex((h: string) => matierePat.test(h))
        if (codeColIndex < 0) codeColIndex = 0

        const skippedCells: string[] = []

        for (let i = 2; i < rawAllergen.length; i++) {
          const row = rawAllergen[i] as any[]
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
            const pct = val === '' || val == null ? null : parseFloat(String(val).replace(',', '.').replace(/\s+/g, ''))
            if (pct != null && !isNaN(pct) && pct > 0) {
              allergensToInsert.push({
                ingredient_code: code,
                allergen_name: allergenName,
                percentage: pct,
                user_id: userId,
              })
            }
          }
        }
        if (skippedCells.length > 0) {
          console.log(`   Exemples de libellés non résolus: ${skippedCells.slice(0, 5).join(' | ')}`)
        }

        if (allergensToInsert.length === 0 && rawAllergen.length >= 2) {
          headerRow = rawAllergen[0] as any[]
          allergenHeaders = (headerRow || []).map((h: any) => String(h || '').trim())
          const codeCol0 = allergenHeaders.findIndex((h: string) => /code|réf|nom|matière|designation|désignation|produit|article/i.test(h))
          const colCode = codeCol0 >= 0 ? codeCol0 : 0
          for (let i = 1; i < rawAllergen.length; i++) {
            const row = rawAllergen[i] as any[]
            const cell = String((row[colCode] ?? '')).trim()
            if (!cell) continue
            const code = resolveCode(cell)
            if (!code) continue
            for (let j = 0; j < allergenHeaders.length; j++) {
              if (j === colCode) continue
              const allergenName = allergenHeaders[j]
              if (!allergenName) continue
              const val = row[j]
              const pct = val === '' || val == null ? null : parseFloat(String(val).replace(',', '.').replace(/\s+/g, ''))
              if (pct != null && !isNaN(pct) && pct > 0) {
                allergensToInsert.push({
                  ingredient_code: code,
                  allergen_name: allergenName,
                  percentage: pct,
                  user_id: userId,
                })
              }
            }
          }
        }
      }

      if (allergensToInsert.length > 0) {
        const codesToClear = [...new Set(allergensToInsert.map((a) => a.ingredient_code))]
        await supabase.from('allergens').delete().in('ingredient_code', codesToClear).eq('user_id', userId)

        const ALLERG_BATCH = 500
        let allergImported = 0
        for (let i = 0; i < allergensToInsert.length; i += ALLERG_BATCH) {
          const batch = allergensToInsert.slice(i, i + ALLERG_BATCH)
          const { error: errAllerg } = await supabase.from('allergens').insert(batch)
          if (errAllerg) {
            console.error('   ❌ Erreur import allergènes:', errAllerg.message)
          } else {
            allergImported += batch.length
          }
        }
        console.log(`   ✅ ${allergImported} relations allergène-ingrédient importées`)
      } else if (rawAllergen.length >= 2) {
        console.log('   ⚠️  Aucune relation allergène trouvée (vérifiez les codes matière dans l\'onglet)')
      } else {
        console.log('   ⚠️  Onglet allergènes trop court ou vide')
      }
    } else {
      console.log('\n⚠️  Aucun onglet "Allergènes" / "Allergènes 81" trouvé, allergènes non importés')
    }

    console.log('\n💡 Vous pouvez maintenant vous connecter ; les allergènes apparaîtront dans vos formules si l\'onglet a été importé.')
  } catch (error) {
    console.error('❌ Erreur:', error)
  }
}

autoImport().catch(console.error)
