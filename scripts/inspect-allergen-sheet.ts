/**
 * Affiche la structure de l'onglet Allergènes de DonnéesMP.xlsx
 * Usage: npx tsx scripts/inspect-allergen-sheet.ts
 */

import XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// Priorité au fichier sans accent (DonneesMP.xlsx), souvent plus complet avec l'onglet Allergènes 81
const EXCEL_FILE = (() => {
  const sansAccent = path.join(__dirname, 'DonneesMP.xlsx')
  const avecAccent = path.join(__dirname, 'DonnéesMP.xlsx')
  if (fs.existsSync(sansAccent)) return sansAccent
  return avecAccent
})()

async function main() {
  const workbook = XLSX.readFile(EXCEL_FILE)
  const sheetNames = workbook.SheetNames

  const name = sheetNames.find((n) =>
    n.toLowerCase().includes('allergène') || n.toLowerCase().includes('allergenes')
  )
  if (!name) {
    console.log('Aucun onglet Allergènes trouvé. Feuilles:', sheetNames.join(', '))
    return
  }

  const sheet = workbook.Sheets[name]
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][]

  console.log('Onglet:', name)
  console.log('Nombre de lignes:', raw.length)
  console.log('')
  console.log('--- 8 premières lignes (brut) ---')
  for (let i = 0; i < Math.min(8, raw.length); i++) {
    console.log(`Ligne ${i}:`, JSON.stringify(raw[i]))
  }
  console.log('')
  if (raw.length >= 1) {
    const row0 = (raw[0] || []) as any[]
    console.log('Ligne 0 (première ligne) - nombre de colonnes:', row0.length)
    row0.forEach((c, j) => console.log(`  Col ${j}: "${String(c ?? '').trim()}"`))
  }
  if (raw.length >= 2) {
    const row1 = (raw[1] || []) as any[]
    console.log('Ligne 1 - nombre de colonnes:', row1.length)
    row1.forEach((c, j) => console.log(`  Col ${j}: "${String(c ?? '').trim()}"`))
  }
  // Chercher "He Romarin" ou "Romarin" dans les données pour repérer la structure
  const searchTerms = ['He Romarin', 'Romarin', 'romarin']
  for (const term of searchTerms) {
    for (let i = 0; i < raw.length; i++) {
      const row = (raw[i] || []) as any[]
      for (let j = 0; j < row.length; j++) {
        const cell = String(row[j] ?? '').trim()
        if (cell.toLowerCase().includes(term.toLowerCase())) {
          console.log('')
          console.log(`📍 Trouvé "${term}" → Ligne ${i}, Col ${j}: "${cell}"`)
        }
      }
    }
  }
}

main().catch(console.error)
