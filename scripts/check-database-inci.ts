/**
 * Script pour vérifier les données INCI dans la base de données Supabase
 * 
 * Usage: npx tsx scripts/check-database-inci.ts
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Erreur: NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY doivent être définis dans .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkDatabase() {
  console.log('🔍 Vérification de la base de données...\n')

  // 1. Vérifier la structure de la table ingredients
  console.log('1️⃣ Structure de la table ingredients:')
  const { data: structure, error: structureError } = await supabase
    .from('ingredients')
    .select('*')
    .limit(1)
    .maybeSingle()

  if (structureError) {
    console.error('❌ Erreur lors de la vérification de la structure:', structureError.message)
    return
  }

  if (structure && structure.length > 0) {
    const firstRow = structure[0]
    console.log('   Colonnes disponibles:', Object.keys(firstRow).join(', '))
    console.log('   Colonne "inci" existe:', 'inci' in firstRow)
    console.log('   Colonne "fournisseur_principal" existe:', 'fournisseur_principal' in firstRow)
  } else {
    console.log('   ⚠️  Aucune donnée dans la table ingredients')
  }

  // 2. Compter les ingrédients avec INCI rempli
  console.log('\n2️⃣ Statistiques sur les données INCI:')
  console.log('   (Vérification SANS filtre user_id pour voir toutes les données)')
  const { data: allIngredients, error: countError } = await supabase
    .from('ingredients')
    .select('code, nom, inci, fournisseur_principal, user_id')

  if (countError) {
    console.error('❌ Erreur lors du comptage:', countError.message)
    return
  }

  if (!allIngredients || allIngredients.length === 0) {
    console.log('   ⚠️  Aucun ingrédient trouvé dans la base de données')
    return
  }

  const total = allIngredients.length
  const withInci = allIngredients.filter(i => i.inci && String(i.inci).trim() !== '').length
  const withFournisseur = allIngredients.filter(i => i.fournisseur_principal && String(i.fournisseur_principal).trim() !== '').length
  const withBoth = allIngredients.filter(i => 
    i.inci && String(i.inci).trim() !== '' && 
    i.fournisseur_principal && String(i.fournisseur_principal).trim() !== ''
  ).length

  console.log(`   Total d'ingrédients: ${total}`)
  console.log(`   Avec INCI rempli: ${withInci} (${((withInci/total)*100).toFixed(1)}%)`)
  console.log(`   Avec Fournisseur rempli: ${withFournisseur} (${((withFournisseur/total)*100).toFixed(1)}%)`)
  console.log(`   Avec les deux remplis: ${withBoth} (${((withBoth/total)*100).toFixed(1)}%)`)

  // 3. Afficher quelques exemples
  console.log('\n3️⃣ Exemples de données (5 premiers ingrédients):')
  const examples = allIngredients.slice(0, 5)
  examples.forEach((ing, idx) => {
    console.log(`\n   ${idx + 1}. Code: ${ing.code}`)
    console.log(`      Nom: ${ing.nom}`)
    console.log(`      INCI: ${ing.inci || '(vide)'}`)
    console.log(`      Fournisseur: ${ing.fournisseur_principal || '(vide)'}`)
  })

  // 4. Vérifier si les colonnes sont inversées (INCI contient des noms de fournisseurs)
  console.log('\n4️⃣ Vérification d\'éventuelle inversion des colonnes:')
  const inciWithAt = allIngredients.filter(i => 
    i.inci && String(i.inci).includes('@')
  ).length
  const fournisseurWithAt = allIngredients.filter(i => 
    i.fournisseur_principal && String(i.fournisseur_principal).includes('@')
  ).length

  console.log(`   INCI contenant "@" (probablement un email/fournisseur): ${inciWithAt}`)
  console.log(`   Fournisseur contenant "@": ${fournisseurWithAt}`)

  if (inciWithAt > fournisseurWithAt) {
    console.log('   ⚠️  ATTENTION: Il semble que les colonnes INCI et Fournisseur soient inversées!')
    console.log('   → Utilisez le bouton "inverser" dans l\'interface pour corriger l\'affichage')
  }

  // 5. Vérifier les ingrédients utilisés dans les formules
  console.log('\n5️⃣ Vérification des ingrédients utilisés dans les formules:')
  const { data: formulas, error: formulasError } = await supabase
    .from('formulas')
    .select('id, name, lines:formula_lines(ingredient_code)')

  if (formulasError) {
    console.error('❌ Erreur lors de la récupération des formules:', formulasError.message)
    return
  }

  if (formulas && formulas.length > 0) {
    const allCodes = new Set<string>()
    formulas.forEach((f: any) => {
      if (f.lines) {
        f.lines.forEach((l: any) => {
          if (l.ingredient_code) allCodes.add(l.ingredient_code)
        })
      }
    })

    console.log(`   Codes d'ingrédients utilisés dans les formules: ${allCodes.size}`)
    
    const codesArray = Array.from(allCodes)
    const { data: usedIngredients } = await supabase
      .from('ingredients')
      .select('code, nom, inci, fournisseur_principal')
      .in('code', codesArray)

    if (usedIngredients) {
      const withInciUsed = usedIngredients.filter(i => i.inci && String(i.inci).trim() !== '').length
      console.log(`   Parmi ceux-ci, ${withInciUsed} ont un INCI rempli`)
      
      if (withInciUsed < usedIngredients.length) {
        console.log('\n   ⚠️  Ingrédients utilisés SANS INCI:')
        usedIngredients
          .filter(i => !i.inci || String(i.inci).trim() === '')
          .forEach(i => console.log(`      - ${i.code}: ${i.nom}`))
      }
    }
  }

  console.log('\n✅ Vérification terminée!')
}

checkDatabase().catch(console.error)
