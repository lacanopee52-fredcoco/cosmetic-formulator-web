/**
 * Script pour vérifier les données INCI dans la base de données
 * 
 * Usage: npx tsx scripts/check-inci-data.ts
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

async function checkINCIData() {
  console.log('🔍 Vérification des données INCI dans la base de données...\n')

  // Récupérer quelques exemples d'ingrédients
  const { data: ingredients, error } = await supabase
    .from('ingredients')
    .select('code, nom, inci, fournisseur_principal')
    .limit(10)

  if (error) {
    console.error('❌ Erreur:', error.message)
    return
  }

  if (!ingredients || ingredients.length === 0) {
    console.log('⚠️  Aucun ingrédient trouvé')
    return
  }

  console.log(`📊 ${ingredients.length} ingrédients trouvés\n`)
  console.log('Exemples de données:\n')
  console.log('─'.repeat(80))

  for (const ing of ingredients) {
    console.log(`\nCode: ${ing.code}`)
    console.log(`Nom: ${ing.nom}`)
    console.log(`Colonne 'inci': ${ing.inci || '(vide)'}`)
    console.log(`Colonne 'fournisseur_principal': ${ing.fournisseur_principal || '(vide)'}`)
    console.log('─'.repeat(80))
  }

  // Vérifier si les colonnes semblent inversées
  console.log('\n\n🔍 Analyse:\n')
  
  const fournisseursConnus = ['Cauvin', 'Greentech', 'Diffusions Aromatiques', 'Gattefossé', 'Symrise']
  let inciContientFournisseur = 0
  let fournisseurContientINCI = 0

  for (const ing of ingredients) {
    if (ing.inci) {
      const ressembleFournisseur = fournisseursConnus.some(f => 
        ing.inci.toLowerCase().includes(f.toLowerCase())
      )
      if (ressembleFournisseur) {
        inciContientFournisseur++
      }
    }
    
    if (ing.fournisseur_principal) {
      // Les noms INCI contiennent souvent des mots comme "Oil", "Extract", "Water", etc.
      const ressembleINCI = /(oil|extract|water|acid|alcohol|glycerin|paraffin|wax|butter)/i.test(ing.fournisseur_principal)
      if (ressembleINCI) {
        fournisseurContientINCI++
      }
    }
  }

  console.log(`Ingrédients où 'inci' ressemble à un fournisseur: ${inciContientFournisseur}/${ingredients.length}`)
  console.log(`Ingrédients où 'fournisseur_principal' ressemble à un INCI: ${fournisseurContientINCI}/${ingredients.length}`)

  if (inciContientFournisseur > ingredients.length / 2) {
    console.log('\n⚠️  ATTENTION: La colonne "inci" semble contenir des noms de fournisseurs!')
    console.log('   Les colonnes sont probablement inversées dans la base de données.')
  }
}

checkINCIData().catch(console.error)
