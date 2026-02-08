/**
 * Diagnostic allergènes : vérifie si un code (ex. MP515B) a des allergènes en base
 * et avec quel user_id. Utile quand l’icône Allergènes affiche "aucun allergène"
 * alors que le code figure dans l’onglet Allergènes 81.
 *
 * Usage: npx tsx scripts/diagnostic-allergenes.ts [CODE]
 * Exemple: npx tsx scripts/diagnostic-allergenes.ts MP515B
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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
  console.error('❌ Variables d\'environnement manquantes (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function main() {
  const codeArg = process.argv[2]?.trim()
  const code = codeArg || 'MP515B'

  console.log('🔍 Diagnostic allergènes\n')
  console.log(`   Code recherché: "${code}"`)
  console.log('')

  // 1) Ce code est-il présent dans ingredients ?
  const { data: ing } = await supabase
    .from('ingredients')
    .select('code, nom, user_id')
    .eq('code', code)
    .limit(1)
    .maybeSingle()

  if (ing) {
    console.log(`✅ Code "${code}" trouvé dans la table ingredients:`)
    console.log(`   nom: ${ing.nom}, user_id: ${ing.user_id || 'NULL'}`)
  } else {
    console.log(`⚠️  Code "${code}" absent de la table ingredients.`)
    console.log('   Vérifiez que la matière est bien importée depuis la Liste (fichier général).')
  }
  console.log('')

  // 2) Allergènes en base pour ce code
  const { data: allergens, error } = await supabase
    .from('allergens')
    .select('ingredient_code, allergen_name, percentage, user_id')
    .eq('ingredient_code', code)

  if (error) {
    console.error('❌ Erreur lecture allergens:', error.message)
    return
  }

  if (!allergens || allergens.length === 0) {
    console.log(`❌ Aucun allergène en base pour le code "${code}".`)
    console.log('')
    console.log('   Causes possibles:')
    console.log('   1) L’import des allergènes (onglet Allergènes 81) n’a pas été exécuté.')
    console.log('   2) Dans l’Excel, la colonne "code" de l’onglet Allergènes 81 contient une autre valeur (espace, casse, typo).')
    console.log('   3) L’import a été fait avec un autre user_id que celui avec lequel vous êtes connecté.')
    console.log('')
    console.log('   À faire:')
    console.log('   - Relancer: npx tsx scripts/auto-import.ts (ou import-excel.ts avec votre User ID)')
    console.log('   - Vérifier la structure: npx tsx scripts/inspect-allergen-sheet.ts')
  } else {
    const byUser = new Map<string, number>()
    for (const a of allergens) {
      const u = String(a.user_id || 'NULL')
      byUser.set(u, (byUser.get(u) || 0) + 1)
    }
    console.log(`✅ ${allergens.length} allergène(s) en base pour le code "${code}":`)
    for (const [uid, n] of byUser) {
      console.log(`   user_id: ${uid} → ${n} ligne(s)`)
    }
    console.log('')
    console.log('   Exemples:')
    allergens.slice(0, 5).forEach((a, i) => {
      console.log(`   ${i + 1}. ${a.allergen_name} = ${a.percentage}% (user_id: ${a.user_id})`)
    })
    console.log('')
    console.log('   Si l’icône Allergènes affiche "aucun allergène", vérifiez que vous êtes connecté avec le même user_id que ci‑dessus.')
    console.log('   (Dans Supabase Dashboard > Authentication > Users, votre utilisateur a un UUID = user_id.)')
  }

  // 3) Résumé global : user_id présents dans allergens
  console.log('')
  console.log('--- Résumé global (tous les allergènes) ---')
  const { data: allAllergens } = await supabase
    .from('allergens')
    .select('user_id, ingredient_code')
    .limit(5000)

  if (allAllergens && allAllergens.length > 0) {
    const users = new Set(allAllergens.map((a) => a.user_id).filter(Boolean))
    const codes = [...new Set(allAllergens.map((a) => a.ingredient_code).filter(Boolean))]
    console.log(`   Total lignes allergens (échantillon): ${allAllergens.length}`)
    console.log(`   user_id distincts: ${users.size}`)
    console.log(`   codes matière concernés (échantillon): ${codes.slice(0, 15).join(', ')}${codes.length > 15 ? '…' : ''}`)
  } else {
    console.log('   Aucune ligne dans la table allergens.')
  }
}

main().catch(console.error)
