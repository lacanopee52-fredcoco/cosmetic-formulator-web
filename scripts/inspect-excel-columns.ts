/**
 * Inspecte le fichier Excel pour afficher les en-têtes et le contenu
 * des colonnes INCI et Fournisseur (telles que lues par l'import).
 * Usage: npx tsx scripts/inspect-excel-columns.ts
 */

import XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const EXCEL_FILE = (() => {
  const sansAccent = path.join(__dirname, 'DonneesMP.xlsx')
  const avecAccent = path.join(__dirname, 'DonnéesMP.xlsx')
  if (fs.existsSync(sansAccent)) return sansAccent
  if (fs.existsSync(avecAccent)) return avecAccent
  return null
})()

if (!EXCEL_FILE) {
  console.error('❌ Aucun fichier DonnéesMP.xlsx ou DonneesMP.xlsx trouvé dans scripts/')
  process.exit(1)
}

const workbook = XLSX.readFile(EXCEL_FILE)
const listeSheetName = workbook.SheetNames.find((n: string) => n.toLowerCase().includes('liste')) || workbook.SheetNames[0]
const sheet = workbook.Sheets[listeSheetName]
const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][]

if (data.length < 2) {
  console.error('❌ Fichier vide ou pas assez de lignes')
  process.exit(1)
}

const headers = data[0].map((h: any) => String(h ?? '').trim())

// Même logique que auto-import
// IMPORTANT: ne pas détecter "inci" dans "prINCIpal" (Fournisseur principal)
const isInciHeader = (h: string) => /\binci\b/i.test(h) || /^inci\b/i.test(h.trim())
const codeIndex = headers.findIndex((h: string) => h.toLowerCase().includes('code'))
const nomIndex = headers.findIndex((h: string) => h.toLowerCase().includes('nom') && !isInciHeader(h))
const fournisseurIndex = headers.findIndex((h: string) => h.toLowerCase().includes('fournisseur'))
const inciIndex = headers.findIndex((h: string) => isInciHeader(h))

console.log('📋 En-têtes (index → libellé):')
headers.forEach((h, i) => console.log(`   ${i}: "${h}"`))
console.log('')
console.log('📍 Colonnes utilisées par l’import:')
console.log(`   code → index ${codeIndex} "${headers[codeIndex] ?? ''}"`)
console.log(`   nom → index ${nomIndex} "${headers[nomIndex] ?? ''}"`)
console.log(`   fournisseur_principal (DB) → index ${fournisseurIndex} "${headers[fournisseurIndex] ?? ''}"`)
console.log(`   inci (DB) → index ${inciIndex} "${headers[inciIndex] ?? ''}"`)
console.log('')
console.log('📄 Exemple 5 premières lignes (valeurs envoyées en base):')
for (let i = 1; i <= Math.min(5, data.length - 1); i++) {
  const row = data[i]
  const code = codeIndex >= 0 ? String(row[codeIndex] ?? '').trim() : ''
  const nom = nomIndex >= 0 ? String(row[nomIndex] ?? '').trim() : ''
  const valFournisseur = fournisseurIndex >= 0 ? String(row[fournisseurIndex] ?? '').trim() : ''
  const valInci = inciIndex >= 0 ? String(row[inciIndex] ?? '').trim() : ''
  console.log(`   Ligne ${i + 1} | code="${code}" | nom="${nom}"`)
  console.log(`      → inci (DB)="${valInci}"`)
  console.log(`      → fournisseur_principal (DB)="${valFournisseur}"`)
  console.log('')
}
