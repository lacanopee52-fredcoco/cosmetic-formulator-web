'use client'

import { useMemo, useState } from 'react'

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [mode, setMode] = useState<'merge' | 'replace'>('merge')
  const [status, setStatus] = useState<'idle' | 'parsing' | 'uploading' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState<string>('')

  const canImport = useMemo(() => !!file && status !== 'parsing' && status !== 'uploading', [file, status])

  const parseNumber = (v: any): number | null => {
    if (v === null || v === undefined || v === '') return null
    if (typeof v === 'number') return Number.isFinite(v) ? v : null
    const s = String(v).trim().replace(',', '.').replace(/\s+/g, '')
    const n = parseFloat(s)
    return Number.isFinite(n) ? n : null
  }

  const normalizeBoolean = (v: any): boolean => {
    if (typeof v === 'boolean') return v
    const s = String(v ?? '').toLowerCase().trim()
    return s === 'oui' || s === 'yes' || s === 'true' || s === '1' || s === 'o'
  }

  const isInciHeader = (h: string) => /\binci\b/i.test(h) || /^inci\b/i.test(h.trim())

  const findSheet = (workbook: any, nameLike: string) => {
    const n = workbook.SheetNames.find((sn: string) => sn.toLowerCase().includes(nameLike.toLowerCase()))
    return n ? workbook.Sheets[n] : null
  }

  const handleImport = async () => {
    if (!file) return
    setStatus('parsing')
    setMessage('Lecture du fichier Excel…')

    try {
      const XLSX = await import('xlsx')
      const buf = await file.arrayBuffer()
      const workbook = XLSX.read(buf, { type: 'array' })

      // --- INGREDIENTS (feuille Liste, Matières premières, Données, etc.)
      const listeSheet =
        workbook.Sheets['Liste'] ||
        workbook.Sheets['liste'] ||
        workbook.Sheets['LISTE'] ||
        workbook.Sheets['Liste MP'] ||
        workbook.Sheets['Matières premières'] ||
        workbook.Sheets['Matieres premieres'] ||
        workbook.Sheets['Données'] ||
        workbook.Sheets['Donnees'] ||
        findSheet(workbook, 'liste') ||
        findSheet(workbook, 'matière') ||
        findSheet(workbook, 'matiere') ||
        findSheet(workbook, 'donnée') ||
        findSheet(workbook, 'donnee')
      if (!listeSheet) {
        const sheetNames = (workbook.SheetNames || []).join(', ') || '(aucune)'
        throw new Error(`Feuille des matières introuvable. Feuilles présentes : ${sheetNames}. Renommez une feuille "Liste" ou "Matières premières".`)
      }

      const rawListe = XLSX.utils.sheet_to_json(listeSheet, { header: 1, defval: '' }) as any[][]
      if (rawListe.length < 2) throw new Error('Feuille des matières vide ou mal formatée (il faut au moins une ligne d\'en-tête et une ligne de données).')

      const headers = (rawListe[0] || []).map((h: any) => String(h ?? '').trim())
      const headersLower = headers.map((h: string) => h.toLowerCase())
      const codeIndex = headersLower.findIndex((h: string) => h.includes('code'))
      // Colonne "nom" : Nom, Matière première, Désignation, Libellé, etc.
      let nomIndex = headersLower.findIndex((h: string) => (h.includes('nom') || h.includes('designation') || h.includes('désignation') || h.includes('libellé') || h.includes('libelle')) && !isInciHeader(h))
      if (nomIndex < 0) {
        const matiereIdx = headersLower.findIndex((h: string) => h.includes('matière') && h.includes('première'))
        if (matiereIdx >= 0) nomIndex = matiereIdx
      }
      if (nomIndex < 0 && codeIndex === 0) nomIndex = 1
      if (nomIndex < 0) nomIndex = 0
      const fournisseurIndex = headers.findIndex((h: string) => h.toLowerCase().includes('fournisseur'))
      const inciIndex = headers.findIndex((h: string) => isInciHeader(h))
      const categorieIndex = headers.findIndex((h: string) => h.toLowerCase().includes('catégorie') || h.toLowerCase().includes('categorie'))
      const prixIndex = headers.findIndex((h: string) => h.toLowerCase().includes('prix'))
      const stockIndex = headers.findIndex((h: string) => h.toLowerCase().includes('stock') || h.toLowerCase().includes('en stock'))
      const fonctionsIndex = headers.findIndex((h: string) => h.toLowerCase().includes('fonction'))
      const casIndex = headers.findIndex((h: string) => h.toLowerCase().includes('cas'))
      const impuretesIndex = headers.findIndex((h: string) => h.toLowerCase().includes('impuret'))
      const ppaiIndex = headers.findIndex((h: string) => h.toLowerCase().includes('%ppai') && !h.toLowerCase().includes('bio'))
      const ppaiBioIndex = headers.findIndex((h: string) => h.toLowerCase().includes('%ppai') && h.toLowerCase().includes('bio'))
      const cpaiIndex = headers.findIndex((h: string) => h.toLowerCase().includes('%cpai') && !h.toLowerCase().includes('bio'))
      const cpaiBioIndex = headers.findIndex((h: string) => h.toLowerCase().includes('%cpai') && h.toLowerCase().includes('bio'))

      const ingredients: any[] = []
      const seen = new Set<string>()
      for (let i = 1; i < rawListe.length; i++) {
        const row = rawListe[i] || []
        const code = codeIndex >= 0 ? String(row[codeIndex] ?? '').trim() : ''
        const nom = nomIndex >= 0 ? String(row[nomIndex] ?? '').trim() : ''
        if (!code || !nom || seen.has(code)) continue
        seen.add(code)
        ingredients.push({
          code,
          nom,
          fournisseur_principal: fournisseurIndex >= 0 ? String(row[fournisseurIndex] ?? '').trim() || null : null,
          inci: inciIndex >= 0 ? String(row[inciIndex] ?? '').trim() || null : null,
          categorie: categorieIndex >= 0 ? String(row[categorieIndex] ?? '').trim() || null : null,
          prix_au_kilo: prixIndex >= 0 ? parseNumber(row[prixIndex]) : null,
          en_stock: stockIndex >= 0 ? normalizeBoolean(row[stockIndex]) : false,
          pourcentage_ppai: ppaiIndex >= 0 ? parseNumber(row[ppaiIndex]) : null,
          pourcentage_ppai_bio: ppaiBioIndex >= 0 ? parseNumber(row[ppaiBioIndex]) : null,
          pourcentage_cpai: cpaiIndex >= 0 ? parseNumber(row[cpaiIndex]) : null,
          pourcentage_cpai_bio: cpaiBioIndex >= 0 ? parseNumber(row[cpaiBioIndex]) : null,
          fonctions: fonctionsIndex >= 0 ? String(row[fonctionsIndex] ?? '').trim() || null : null,
          numero_cas: casIndex >= 0 ? String(row[casIndex] ?? '').trim() || null : null,
          impuretes: impuretesIndex >= 0 ? String(row[impuretesIndex] ?? '').trim() || null : null,
        })
      }

      if (ingredients.length === 0) {
        throw new Error(
          'Aucune matière première trouvée. Vérifiez que la feuille contient une ligne d\'en-tête avec au moins une colonne "Code" et une colonne "Nom" (ou "Matière première", "Désignation") et des lignes de données avec code et nom renseignés.'
        )
      }

      // --- ALLERGENS (feuille Allergènes / Allergènes 81)
      const allergSheet =
        workbook.Sheets['Allergènes 81'] ||
        workbook.Sheets['Allergenes 81'] ||
        workbook.Sheets['Allergènes'] ||
        workbook.Sheets['Allergenes'] ||
        findSheet(workbook, 'allerg')
      const allergens: any[] = []
      if (allergSheet) {
        const ingredientCodes = new Set(ingredients.map((i) => i.code))
        const raw = XLSX.utils.sheet_to_json(allergSheet, { header: 1, defval: '' }) as any[][]
        // Format Allergènes 81: ligne 2 = noms allergènes, col 1=code, col 7.. = %, données dès ligne 6
        const ALLERGEN_NAMES_ROW = 1
        const CODE_COL = 0
        const ALLERGEN_COL_START = 6
        const DATA_START_ROW = 5
        if (raw.length >= DATA_START_ROW + 1) {
          const headerRow = (raw[ALLERGEN_NAMES_ROW] || []) as any[]
          for (let r = DATA_START_ROW; r < raw.length; r++) {
            const row = raw[r] || []
            const codeVal = String(row[CODE_COL] ?? '').trim()
            if (!codeVal || /^\d+$/.test(codeVal)) continue
            const code = ingredientCodes.has(codeVal) ? codeVal : null
            if (!code) continue
            const maxCol = Math.max(row.length, headerRow.length)
            for (let c = ALLERGEN_COL_START; c < maxCol; c++) {
              const allergenName = String(headerRow[c] ?? '').trim()
              if (!allergenName) continue
              const pct = parseNumber(row[c])
              if (pct !== null && pct > 0) {
                allergens.push({ ingredient_code: code, allergen_name: allergenName, percentage: pct })
              }
            }
          }
        }
      }

      // --- TOXICOLOGY TESTS (feuille Tests toxico)
      const toxSheet = workbook.Sheets['Tests toxico'] || workbook.Sheets['Tests toxico.'] || findSheet(workbook, 'toxico')
      const toxicology_tests: any[] = []
      if (toxSheet) {
        const rows = XLSX.utils.sheet_to_json(toxSheet, { defval: '' }) as any[]
        // Attendu: colonnes type Code / Test / Résultat / Date / Notes (tolérance)
        for (const row of rows) {
          const code = String(row.Code ?? row.code ?? row['ingredient_code'] ?? '').trim()
          const test_name = String(row['Test'] ?? row['test_name'] ?? row['Nom du test'] ?? '').trim()
          if (!code || !test_name) continue
          toxicology_tests.push({
            ingredient_code: code,
            test_name,
            test_result: row['Résultat'] ?? row['result'] ?? row['test_result'] ?? null,
            test_date: row['Date'] ?? row['test_date'] ?? null,
            notes: row['Notes'] ?? row['notes'] ?? null,
          })
        }
      }

      // --- BABY RANGE (feuille Gamme bébé)
      const babySheet = workbook.Sheets['Gamme bébé'] || workbook.Sheets['Gamme bebe'] || findSheet(workbook, 'gamme')
      const baby_range: any[] = []
      if (babySheet) {
        const rows = XLSX.utils.sheet_to_json(babySheet, { defval: '' }) as any[]
        for (const row of rows) {
          const code = String(row.Code ?? row.code ?? row['ingredient_code'] ?? '').trim()
          if (!code) continue
          const approved = normalizeBoolean(row.Approved ?? row.approved ?? row['Validé'] ?? row['Approuvé'] ?? row['OK'] ?? false)
          baby_range.push({
            ingredient_code: code,
            approved,
            restrictions: (row.Restrictions ?? row.restrictions ?? row['Restriction'] ?? null) || null,
            notes: (row.Notes ?? row.notes ?? null) || null,
          })
        }
      }

      // --- IFRA (feuille IFRA)
      // 2F = libellé "categories", 2G à 2W = numéros de catégories (1, 2, 3, 5A, 5B, …), 3G à 3W = descriptions.
      // À partir de la ligne 4 : colonne A = code matière, colonnes G, H, I… = % limite par catégorie (même sans libellé %).
      const IFRA_COL_START = 6 // G en Excel (index 0 = A), jusqu'à W (index 22)
      const ifraSheet =
        workbook.Sheets['IFRA'] ||
        workbook.Sheets['ifra'] ||
        findSheet(workbook, 'ifra')
      const ifra_limits: { category_number: string; description: string; ingredient_code: string; limit_percent: number }[] = []
      if (ifraSheet) {
        const rawIfra = XLSX.utils.sheet_to_json(ifraSheet, { header: 1, defval: '' }) as any[][]
        if (rawIfra.length >= 4) {
          const rowCategories = (rawIfra[1] || []) as any[]   // ligne 2 : catégories (col. G, H, I...)
          const rowDescriptions = (rawIfra[2] || []) as any[] // ligne 3 : descriptions (col. G, H, I...)
          for (let r = 3; r < rawIfra.length; r++) {
            const row = rawIfra[r] || []
            const ingredient_code = String(row[0] ?? '').trim() // colonne A = code matière première
            if (!ingredient_code) continue
            for (let c = IFRA_COL_START; c < Math.max(row.length, rowCategories.length, rowDescriptions.length); c++) {
              const category_number = String(rowCategories[c] ?? '').trim()
              const description = String(rowDescriptions[c] ?? '').trim()
              if (!category_number) continue
              const limit_percent = parseNumber(row[c])
              if (limit_percent !== null && limit_percent >= 0) {
                ifra_limits.push({ category_number, description, ingredient_code, limit_percent })
              }
            }
          }
        }
      }

      // --- EMBALLAGES (feuille Emballages ou code emballage : Description emballage, Prix unitaire)
      const emballageSheet =
        workbook.Sheets['Emballages'] ||
        workbook.Sheets['emballages'] ||
        workbook.Sheets['code emballage'] ||
        workbook.Sheets['Code emballage'] ||
        findSheet(workbook, 'emballage')
      const packaging: any[] = []
      if (emballageSheet) {
        const raw = XLSX.utils.sheet_to_json(emballageSheet, { header: 1, defval: '' }) as any[][]
        if (raw.length >= 2) {
          const headers = (raw[0] || []).map((h: any) => String(h ?? '').trim().toLowerCase())
          const descCol =
            headers.findIndex((h: string) => h.includes('description emballage')) >= 0
              ? headers.findIndex((h: string) => h.includes('description emballage'))
              : headers.findIndex((h: string) => h.includes('description')) >= 0
                ? headers.findIndex((h: string) => h.includes('description'))
                : 0
          const prixCol =
            headers.findIndex((h: string) => h.includes('prix') && (h.includes('unitaire') || h.includes('unit'))) >= 0
              ? headers.findIndex((h: string) => h.includes('prix') && (h.includes('unitaire') || h.includes('unit')))
              : headers.findIndex((h: string) => h.includes('prix')) >= 0
                ? headers.findIndex((h: string) => h.includes('prix'))
                : 1
          for (let i = 1; i < raw.length; i++) {
            const row = raw[i] || []
            const description = String(row[descCol] ?? '').trim()
            const prix_unitaire = parseNumber(row[prixCol]) ?? 0
            if (!description) continue
            packaging.push({ description, prix_unitaire })
          }
        }
      }

      setStatus('uploading')
      setMessage(`Import en cours… (ingrédients: ${ingredients.length}, allergènes: ${allergens.length}, IFRA: ${ifra_limits.length})`)

      const res = await fetch('/api/import/excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients, allergens, toxicology_tests, baby_range, packaging, ifra_limits, mode }),
      })
      const json = await res.json()
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || 'Erreur import')
      }

      setStatus('done')
      setMessage(
        `Import terminé. Ingrédients: ${json.counts.ingredients}, Allergènes: ${json.counts.allergens}, Tests toxico: ${json.counts.toxicology_tests}, Gamme bébé: ${json.counts.baby_range}, Emballages: ${json.counts.packaging ?? 0}, IFRA: ${json.counts.ifra_limits ?? 0}.`
      )
    } catch (e) {
      setStatus('error')
      setMessage(e instanceof Error ? e.message : 'Erreur inconnue')
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-pink-600 mb-6">
          📥 Importer Matières
        </h1>

        <div className="bg-pink-50 border border-pink-200 rounded-lg p-6 space-y-4">
          <div className="text-gray-700">
            Import complet depuis un fichier Excel. Matières premières : feuille <strong>Liste</strong>, <strong>Matières premières</strong> ou <strong>Données</strong> (colonnes Code + Nom ou Matière première). Optionnel : <strong>Allergènes</strong>, <strong>Tests toxico</strong>, <strong>Gamme bébé</strong>, <strong>Emballages</strong>, <strong>IFRA</strong> (ligne 2 à partir de col. G = catégories, ligne 3 à partir de G = descriptions, à partir de la ligne 4 = une ligne par matière en col. A, % en G, H, I…).
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Fichier Excel</label>
            <div className="flex flex-wrap items-center gap-3">
              <label className="cursor-pointer px-4 py-2 rounded-lg border-2 border-dashed border-pink-300 bg-pink-50 text-pink-700 hover:bg-pink-100 transition-colors text-sm font-medium">
                Choisir un fichier…
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="sr-only"
                />
              </label>
              <span className="text-sm text-gray-600">
                {file ? `Sélectionné : ${file.name}` : 'Aucun fichier choisi'}
              </span>
            </div>
            {!file && (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                Le bouton « Importer » s&apos;activera une fois un fichier Excel sélectionné.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Mode</label>
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="radio" checked={mode === 'merge'} onChange={() => setMode('merge')} />
                Mettre à jour / compléter (recommandé)
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="radio" checked={mode === 'replace'} onChange={() => setMode('replace')} />
                Remplacer (supprime vos données puis réimporte)
              </label>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={!canImport}
              onClick={handleImport}
              className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                canImport ? 'bg-pink-600 text-white hover:bg-pink-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              {status === 'parsing' ? 'Lecture…' : status === 'uploading' ? 'Import…' : 'Importer'}
            </button>
            {status !== 'idle' && (
              <div className={`text-sm ${status === 'error' ? 'text-red-700' : 'text-gray-700'}`}>{message}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
