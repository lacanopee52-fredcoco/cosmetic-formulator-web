'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Formula, FormulaLine, Ingredient } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { useOrganizationId } from '@/contexts/OrganizationContext'
import MaterialAutocomplete from '@/components/MaterialAutocomplete'
import PackagingAutocomplete from '@/components/PackagingAutocomplete'
import INCIList from '@/components/INCIList'
import AllergenTracker from '@/components/AllergenTracker'
import StabilityTracker from '@/components/StabilityTracker'
import NotesResultsMenu from '@/components/NotesResultsMenu'
import { printInPage, escapeHtmlContent } from '@/lib/printExport'
import { IMPROVEMENT_GOAL_OPTIONS } from '@/lib/improvementGoals'
import { IFRA_CATEGORY_ORDER, getIfraCategoryDescription } from '@/lib/ifraDescriptions'

export default function FormulationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const organizationId = useOrganizationId()
  const [formulaId, setFormulaId] = useState<number | null>(null)
  
  const initialFormula: Formula = {
    name: '',
    version: '',
    formulator: '',
    total_weight: 1000,
    improvement_goal: '',
    stability: {
      start_date: undefined,
      days: []
    },
    notes: {
      protocole: '',
      aspect: '',
      odeur: '',
      ph: '',
      microscope: '',
      remarque: '',
      conditionnement: '',
      conclusion: ''
    },
    lines: []
  }
  
  const [formula, setFormula] = useState<Formula>(initialFormula)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [lastSavedSignature, setLastSavedSignature] = useState<string>('')
  const [hasBaselineSignature, setHasBaselineSignature] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [selectedMaterialCode, setSelectedMaterialCode] = useState<string | null>(null)
  const [materialRefreshTrigger, setMaterialRefreshTrigger] = useState(0)
  // Garder la chaîne en cours de saisie pour les champs % (ex: "1." ou "1,5") pour ne pas perdre le point/virgule
  const [percentInputOverrides, setPercentInputOverrides] = useState<Record<number, string>>({})
  const [gramsInputOverrides, setGramsInputOverrides] = useState<Record<number, string>>({})
  /** Carré stock devant matière : rouge=pas en stock, vert=en stock, bleu=échantillon, neutre=non défini. Cliquable pour changer. */
  const [stockIndicators, setStockIndicators] = useState<Record<number, 'rouge' | 'vert' | 'bleu' | 'neutre'>>({})
  const [lineEnStockByCode, setLineEnStockByCode] = useState<Record<string, boolean>>({})
  /** Nom INCI par code matière (colonne INCI de l'Excel / table ingredients) */
  const [lineInciByCode, setLineInciByCode] = useState<Record<string, string>>({})
  /** Fournisseur principal par code matière (table ingredients) */
  const [lineFournisseurByCode, setLineFournisseurByCode] = useState<Record<string, string>>({})
  /** Si true : colonne INCI affiche fournisseur_principal (DB), colonne Fournisseur affiche inci (DB). À activer si ta base a les colonnes inversées. */
  const [swapInciFournisseur, setSwapInciFournisseur] = useState(false)
  /** Version de la formule au chargement : si l'utilisateur change la version et enregistre, on crée une nouvelle formule (nouvelle version) au lieu d'écraser l'ancienne. */
  const [originalLoadedVersion, setOriginalLoadedVersion] = useState<string | null>(null)
  /** Section Produit fini (coût formule + emballages + total) */
  const [openProduitFini, setOpenProduitFini] = useState(false)
  const [produitFiniGrams, setProduitFiniGrams] = useState<number>(100)
  const [produitFiniItems, setProduitFiniItems] = useState<Array<{ description: string; prix_unitaire: number }>>(() => Array(6).fill(null).map(() => ({ description: '', prix_unitaire: 0 })))
  /** Formule choisie pour le coût (null = formule en cours) */
  const [produitFiniSelectedFormula, setProduitFiniSelectedFormula] = useState<{ id: number; name: string; version: string; prixAuKg: number } | null>(null)
  const [produitFiniFormulasList, setProduitFiniFormulasList] = useState<Array<{ id: number; name: string; version: string }>>([])
  const [produitFiniFormulaQuery, setProduitFiniFormulaQuery] = useState('')
  const [produitFiniFormulaDropdownOpen, setProduitFiniFormulaDropdownOpen] = useState(false)
  const [produitFiniFormulaLoading, setProduitFiniFormulaLoading] = useState(false)
  const produitFiniFormulaRef = useRef<HTMLDivElement>(null)
  const produitFiniListRef = useRef<HTMLDivElement>(null)
  const produitFiniDropdownRef = useRef<HTMLDivElement>(null)
  const [openProduitFiniDropdown, setOpenProduitFiniDropdown] = useState(false)
  /** Liste des produits finis enregistrés */
  const [produitFiniSavedList, setProduitFiniSavedList] = useState<Array<{
    id: number
    name: string | null
    formula_id: number | null
    formula_name: string
    formula_version: string
    grams: number
    total_price: number
    items: Array<{ label: string; description: string; prix_unitaire: number }>
    created_at: string
  }>>([])
  const [produitFiniSaving, setProduitFiniSaving] = useState(false)
  const [produitFiniListLoading, setProduitFiniListLoading] = useState(false)
  const [produitFiniSaveError, setProduitFiniSaveError] = useState<string | null>(null)
  const [produitFiniShowTableHelp, setProduitFiniShowTableHelp] = useState(false)
  /** En édition : id du produit fini ouvert, nom affiché, nom d’origine (pour savoir si mise à jour ou nouveau) */
  const [produitFiniEditingId, setProduitFiniEditingId] = useState<number | null>(null)
  const [produitFiniEditingName, setProduitFiniEditingName] = useState('')
  const [produitFiniEditingOriginalName, setProduitFiniEditingOriginalName] = useState('')
  const [settingActive, setSettingActive] = useState(false)
  const [openExportDropdown, setOpenExportDropdown] = useState(false)
  const exportBarRef = useRef<HTMLDivElement>(null)
  const printContainerRef = useRef<HTMLDivElement>(null)
  const produitFiniPrefilledForOpenRef = useRef(false)

  const PRODUIT_FINI_LABELS = ['Flacon', 'Etiquette flacon', 'Bouchon', 'Etui', 'Etiquette Etui', 'Main d\'œuvre']

  const computeSignature = (f: Formula) => {
    // Signature "métier" : ignore id/created_at/updated_at, pour détecter les modifications utilisateur
    const payload = {
      name: f.name || '',
      version: f.version || '',
      formulator: f.formulator || '',
      total_weight: f.total_weight ?? 0,
      notes: f.notes || {},
      stability: f.stability || { days: [] },
      image: f.image || null,
      is_active: f.is_active ?? false,
      improvement_goal: f.improvement_goal ?? '',
      lines: (f.lines || []).map((l) => ({
        phase: l.phase || '',
        ingredient_code: l.ingredient_code || '',
        ingredient_name: l.ingredient_name || '',
        percent: Number.isFinite(l.percent) ? l.percent : 0,
        grams: Number.isFinite(l.grams) ? l.grams : 0,
        notes: l.notes || '',
        is_qsp: !!l.is_qsp,
        prix_au_kilo: l.prix_au_kilo ?? null,
        stock_indicator: l.stock_indicator ?? null,
      })),
    }
    return JSON.stringify(payload)
  }

  // Réinitialiser les overrides de saisie quand le nombre de lignes change (ajout/suppression)
  useEffect(() => {
    setPercentInputOverrides({})
    setGramsInputOverrides({})
  }, [formula.lines?.length])

  // Détecter les modifications : si la formule diffère de la dernière sauvegarde, bouton rouge
  useEffect(() => {
    if (!hasBaselineSignature) return
    const sig = computeSignature(formula)
    setIsDirty(sig !== lastSavedSignature)
  }, [formula, hasBaselineSignature, lastSavedSignature])

  // Lire la préférence "inverser INCI / Fournisseur" au montage (base ayant les colonnes inversées)
  useEffect(() => {
    try {
      const v = localStorage.getItem('formulation_swap_inci_fournisseur') === '1'
      setSwapInciFournisseur(v)
    } catch (_) {}
  }, [])

  // Ouvrir / fermer la section Produit fini selon l'URL
  useEffect(() => {
    if (searchParams.get('section') === 'produit-fini') {
      setOpenProduitFini(true)
    } else {
      setOpenProduitFini(false)
    }
  }, [searchParams])

  // Quand on ouvre Produit fini avec une formule chargée : préremplir la première ligne (nom, formule, 100 g)
  useEffect(() => {
    if (!openProduitFini) {
      produitFiniPrefilledForOpenRef.current = false
      return
    }
    const formulaTitle = `${formula.name || ''}${formula.version ? ` v${formula.version}` : ''}`.trim()
    if (produitFiniSelectedFormula == null && formulaTitle) {
      setProduitFiniFormulaQuery(formulaTitle)
    }
    // Préremplir une seule fois à l'ouverture (nom + 100 g) en mode "nouveau", sans écraser la saisie ensuite
    if (produitFiniEditingId == null && formulaTitle && !produitFiniPrefilledForOpenRef.current) {
      produitFiniPrefilledForOpenRef.current = true
      setProduitFiniEditingName(formulaTitle)
      setProduitFiniGrams(100)
    }
  }, [openProduitFini, formula.name, formula.version, produitFiniSelectedFormula, produitFiniEditingId])

  // Charger la liste des formules quand on ouvre Produit fini (pour recherche "coût formule")
  useEffect(() => {
    if (!openProduitFini) return
    let cancelled = false
    const load = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || cancelled) return
        const { data } = await supabase
          .from('formulas')
          .select('id, name, version')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(200)
        if (!cancelled && data) {
          setProduitFiniFormulasList(data.map((f: any) => ({ id: f.id, name: f.name || '', version: f.version || '' })))
        }
      } catch (_) {}
    }
    load()
    return () => { cancelled = true }
  }, [openProduitFini])

  const selectFormulaForProduitFini = async (id: number) => {
    setProduitFiniFormulaLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('formulas')
        .select('id, name, version')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()
      if (!data) return
      const { data: lines } = await supabase
        .from('formula_lines')
        .select('percent, prix_au_kilo')
        .eq('formula_id', id)
      const prixAuKg = (lines || []).reduce((sum: number, line: any) => {
        if (line.prix_au_kilo != null && line.percent > 0) return sum + (line.prix_au_kilo * line.percent / 100)
        return sum
      }, 0)
      setProduitFiniSelectedFormula({ id: data.id, name: data.name || '', version: data.version || '', prixAuKg })
      setProduitFiniFormulaQuery(`${data.name || ''} ${data.version || ''}`.trim())
      setProduitFiniFormulaDropdownOpen(false)
    } catch (_) {}
    setProduitFiniFormulaLoading(false)
  }

  // Charger la liste des produits finis enregistrés quand on ouvre la section ou le menu déroulant
  useEffect(() => {
    if (!openProduitFini && !openProduitFiniDropdown) return
    let cancelled = false
    setProduitFiniListLoading(true)
    const load = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || cancelled) return
        const { data } = await supabase
          .from('produit_fini')
          .select('id, name, formula_id, formula_name, formula_version, grams, total_price, items, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100)
        if (!cancelled && data) {
          setProduitFiniSavedList((data as any[]).map((r) => ({
            id: r.id,
            name: r.name ?? null,
            formula_id: r.formula_id ?? null,
            formula_name: r.formula_name ?? '',
            formula_version: r.formula_version ?? '',
            grams: Number(r.grams) ?? 0,
            total_price: Number(r.total_price) ?? 0,
            items: Array.isArray(r.items) ? r.items : [],
            created_at: r.created_at ?? '',
          })))
        }
      } catch (_) {}
      finally {
        if (!cancelled) setProduitFiniListLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [openProduitFini, openProduitFiniDropdown])

  const saveProduitFini = async () => {
    setProduitFiniSaving(true)
    setProduitFiniSaveError(null)
    try {
      if (!organizationId) {
        setProduitFiniSaveError('Organisation introuvable. Rechargez la page.')
        return
      }
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setProduitFiniSaveError('Utilisateur non authentifié.')
        return
      }
      const formulaName = produitFiniSelectedFormula?.name ?? formula.name ?? ''
      const formulaVersion = produitFiniSelectedFormula?.version ?? formula.version ?? ''
      const formulaIdToSave = produitFiniSelectedFormula?.id ?? formulaId
      const grams = produitFiniGrams || 0
      const totalPrice =
        (produitFiniPrixAuKg / 1000) * grams +
        produitFiniItems.reduce((s, i) => s + (i?.prix_unitaire ?? 0), 0)
      const items = PRODUIT_FINI_LABELS.map((label, idx) => ({
        label,
        description: produitFiniItems[idx]?.description ?? '',
        prix_unitaire: produitFiniItems[idx]?.prix_unitaire ?? 0,
      }))
      const autoName = `${formulaName}${formulaVersion ? ` v${formulaVersion}F` : formulaName ? `${formulaName} F` : 'F'}`.trim() || null
      const nameToSave = produitFiniEditingName.trim() || autoName
      const nameOriginal = produitFiniEditingOriginalName.trim() || autoName
      const isUpdate = produitFiniEditingId != null && nameToSave === nameOriginal

      if (isUpdate) {
        const { data: updated, error } = await supabase
          .from('produit_fini')
          .update({
            name: nameToSave || null,
            formula_id: formulaIdToSave ?? null,
            formula_name: formulaName,
            formula_version: formulaVersion,
            grams,
            total_price: totalPrice,
            items,
          })
          .eq('id', produitFiniEditingId)
          .eq('user_id', user.id)
          .select('id, name, formula_id, formula_name, formula_version, grams, total_price, items, created_at')
          .single()
        if (error) {
          const msg = error.message || (error as any).details || (error as any).hint || JSON.stringify(error) || 'Erreur inconnue'
          setProduitFiniSaveError(msg)
          if (/produit_fini|schema cache|could not find.*table/i.test(String(msg))) {
            setProduitFiniShowTableHelp(true)
          }
          return
        }
        setProduitFiniShowTableHelp(false)
        if (updated) {
          setProduitFiniSavedList((prev) =>
            prev.map((r) =>
              r.id === produitFiniEditingId
                ? {
                    id: updated.id,
                    name: updated.name ?? null,
                    formula_id: updated.formula_id ?? null,
                    formula_name: updated.formula_name ?? '',
                    formula_version: updated.formula_version ?? '',
                    grams: Number(updated.grams) ?? 0,
                    total_price: Number(updated.total_price) ?? 0,
                    items: Array.isArray(updated.items) ? updated.items : [],
                    created_at: updated.created_at ?? '',
                  }
                : r
            )
          )
          setProduitFiniEditingOriginalName(nameToSave || '')
        }
      } else {
        const { data: inserted, error } = await supabase
          .from('produit_fini')
          .insert({
            organization_id: organizationId!,
            user_id: user.id,
            name: nameToSave || null,
            formula_id: formulaIdToSave ?? null,
            formula_name: formulaName,
            formula_version: formulaVersion,
            grams,
            total_price: totalPrice,
            items,
          })
          .select('id, name, formula_id, formula_name, formula_version, grams, total_price, items, created_at')
          .single()
        if (error) {
          const msg = error.message || (error as any).details || (error as any).hint || JSON.stringify(error) || 'Erreur inconnue'
          setProduitFiniSaveError(msg)
          if (/produit_fini|schema cache|could not find.*table/i.test(String(msg))) {
            setProduitFiniShowTableHelp(true)
          }
          return
        }
        setProduitFiniShowTableHelp(false)
        if (inserted) {
          setProduitFiniSavedList((prev) => [
            {
              id: inserted.id,
              name: inserted.name ?? null,
              formula_id: inserted.formula_id ?? null,
              formula_name: inserted.formula_name ?? '',
              formula_version: inserted.formula_version ?? '',
              grams: Number(inserted.grams) ?? 0,
              total_price: Number(inserted.total_price) ?? 0,
              items: Array.isArray(inserted.items) ? inserted.items : [],
              created_at: inserted.created_at ?? '',
            },
            ...prev,
          ])
          if (produitFiniEditingId != null) {
            setProduitFiniEditingId(inserted.id)
            setProduitFiniEditingName(nameToSave || '')
            setProduitFiniEditingOriginalName(nameToSave || '')
          }
        }
      }
    } catch (e: any) {
      const msg = e?.message || e?.error_description || (e && typeof e === 'object' && 'message' in e ? String((e as any).message) : null) || JSON.stringify(e) || 'Erreur inconnue'
      setProduitFiniSaveError(msg)
      console.error('Produit fini save exception:', e?.message, e)
    }
    setProduitFiniSaving(false)
  }

  const handleSetAsActive = async () => {
    if (!formulaId || !formula.name?.trim()) return
    setSettingActive(true)
    setMessage(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setMessage({ type: 'error', text: 'Utilisateur non authentifié' })
        return
      }
      const nameTrim = (formula.name || '').trim()
      await supabase
        .from('formulas')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('name', nameTrim)
      const { error } = await supabase
        .from('formulas')
        .update({ is_active: true })
        .eq('id', formulaId)
        .eq('user_id', user.id)
      if (error) throw new Error(error.message)
      setFormula(prev => ({ ...prev, is_active: true }))
      const sig = computeSignature({ ...formula, is_active: true })
      setLastSavedSignature(sig)
      setMessage({ type: 'success', text: 'Cette version est maintenant la formule active (choisie pour la fabrication).' })
      setTimeout(() => setMessage(null), 4000)
    } catch (err) {
      console.error('Erreur set active:', err)
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erreur lors de la mise à jour' })
    } finally {
      setSettingActive(false)
    }
  }

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (exportBarRef.current && !exportBarRef.current.contains(e.target as Node)) {
        setOpenExportDropdown(false)
      }
    }
    if (openExportDropdown) {
      document.addEventListener('mousedown', onMouseDown)
    }
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [openExportDropdown])

  const formulaTitle = `${(formula.name || '').trim() || 'Sans nom'}${formula.version ? ` v${formula.version}` : ''}`.trim()

  // Données à jour pour l'impression (bouton Imprimer du bandeau)
  const printFormulaDataRef = useRef({ formula, swapInciFournisseur, lineInciByCode, lineFournisseurByCode })
  printFormulaDataRef.current = { formula, swapInciFournisseur, lineInciByCode, lineFournisseurByCode }

  useEffect(() => {
    const onPrintFormula = () => {
      if (!printContainerRef.current) return
      const { formula: f, swapInciFournisseur: swap, lineInciByCode: inciByCode, lineFournisseurByCode: fournisseurByCode } = printFormulaDataRef.current
      const title = `${(f.name || '').trim() || 'Sans nom'}${f.version ? ` v${f.version}` : ''}`.trim()
      const inciCol = swap ? 'Fournisseur' : 'INCI'
      const fournisseurCol = swap ? 'INCI' : 'Fournisseur'
      const lines = f.lines || []
      const phaseBgColors: Record<string, string> = {
        '1': '#dbeafe', '2': '#d1fae5', '3': '#fef3c7', '4': '#e9d5ff', '5': '#cffafe', '6': '#fce7f3',
        '7': '#fef9c3', '8': '#ddd6fe', '9': '#fed7aa',
      }
      const rows = lines.map((line) => {
        const phaseTrim = (line.phase || '').trim()
        const rowBg = line.is_qsp
          ? (phaseTrim ? (phaseBgColors[phaseTrim] ?? '#fce7f3') : '#fce7f3')
          : (phaseBgColors[phaseTrim] ?? '#ffffff')
        const phaseCell = line.is_qsp ? (`QSP${phaseTrim ? ` (${phaseTrim})` : ''}`) : (line.phase || '')
        const inci = line.ingredient_code ? (swap ? fournisseurByCode[line.ingredient_code] : inciByCode[line.ingredient_code]) || '—' : '—'
        const fournisseur = line.ingredient_code ? (swap ? inciByCode[line.ingredient_code] : fournisseurByCode[line.ingredient_code]) || '—' : '—'
        const cout = line.prix_au_kilo && line.percent ? (line.prix_au_kilo * line.percent / 100).toFixed(2) : '—'
        return `<tr style="background-color:${rowBg}"><td style="background-color:${rowBg};font-weight:${line.is_qsp ? '600' : 'inherit'};color:${line.is_qsp ? '#db2777' : 'inherit'}">${escapeHtmlContent(phaseCell)}</td><td style="background-color:${rowBg}">${escapeHtmlContent(line.ingredient_name || '')}</td><td style="background-color:${rowBg}">${escapeHtmlContent(inci)}</td><td style="background-color:${rowBg}">${escapeHtmlContent(fournisseur)}</td><td style="background-color:${rowBg}">${line.percent?.toFixed(2) ?? ''} %</td><td style="background-color:${rowBg}">${line.grams?.toFixed(2) ?? ''} g</td><td style="background-color:${rowBg}">${line.prix_au_kilo != null ? line.prix_au_kilo.toFixed(2) : '—'} €/kg</td><td style="background-color:${rowBg}">${cout} €</td></tr>`
      }).join('')

      const totalPercentNonQsp = lines.filter(l => !l.is_qsp).reduce((s, l) => s + (l.percent || 0), 0)
      const qspLine = lines.find(l => l.is_qsp)
      const qspPercent = qspLine ? Math.max(0, 100 - totalPercentNonQsp) : 0
      const totalPercent = totalPercentNonQsp + qspPercent
      const prixAuKg = lines.reduce((s, l) => (l.prix_au_kilo != null && l.percent ? s + l.prix_au_kilo * l.percent / 100 : s), 0)
      const totalWeight = Number(f.total_weight) || 0

      const phaseMap = new Map<string, { percent: number; grams: number; count: number; hasQsp: boolean }>()
      lines.forEach(line => {
        const phase = (line.phase || '').trim()
        if (phase || line.is_qsp) {
          const phaseKey = line.is_qsp ? (phase || 'QSP') : phase
          if (!phaseMap.has(phaseKey)) phaseMap.set(phaseKey, { percent: 0, grams: 0, count: 0, hasQsp: false })
          const d = phaseMap.get(phaseKey)!
          d.percent += line.percent || 0
          d.grams += line.grams || 0
          d.count += 1
          if (line.is_qsp) d.hasQsp = true
        }
      })
      const phaseTotals = Array.from(phaseMap.entries())
        .map(([phase, data]) => ({ phase, ...data }))
        .sort((a, b) => {
          if (a.phase === 'QSP') return -1
          if (b.phase === 'QSP') return 1
          const na = /^\d$/.test(a.phase) ? parseInt(a.phase, 10) : 9999
          const nb = /^\d$/.test(b.phase) ? parseInt(b.phase, 10) : 9999
          return na - nb
        })

      const totalColor = totalPercent > 100 ? '#dc2626' : totalPercent === 100 ? '#16a34a' : '#ca8a04'
      const summaryRows = [
        `<tr><td>Total % de la formule :</td><td style="font-weight:600;color:${totalColor}">${totalPercent.toFixed(2)}%</td></tr>`,
        qspLine ? `<tr><td>QSP % :</td><td style="font-weight:600;color:#db2777">${qspPercent.toFixed(2)}%</td></tr>` : '',
        `<tr><td>Prix au kg :</td><td style="font-weight:600;color:#db2777">${prixAuKg.toFixed(2)} €/kg</td></tr>`,
        `<tr><td>Poids total de la formule :</td><td style="font-weight:600;color:#db2777">${totalWeight.toFixed(2)} g</td></tr>`,
      ].filter(Boolean).join('')

      const phaseParts = phaseTotals.map(({ phase, percent, grams, count, hasQsp }) =>
        `${hasQsp ? 'QSP' : `Phase ${phase}`} : ${percent.toFixed(2)}% (${grams.toFixed(2)} g) (${count} matière${count > 1 ? 's' : ''})`
      ).join(' • ')

      const improvementGoal = (f.improvement_goal || '').trim()
      const headerParts = [
        `Nom : ${escapeHtmlContent(f.name || '—')}`,
        `Version : ${escapeHtmlContent(f.version || '—')}`,
        `Formulateur : ${escapeHtmlContent(f.formulator || '—')}`,
        `Poids total final (g) : ${totalWeight.toFixed(2)}`,
        ...(improvementGoal ? [`Objectif d'amélioration : ${escapeHtmlContent(improvementGoal)}`] : []),
      ]
      const headerBlock = `<p class="print-formula-header-oneline">${headerParts.join(' · ')}</p>`
      const body = `
        <h1>Formule — ${escapeHtmlContent(title)}</h1>
        ${headerBlock}
        <table class="print-formula-table">
          <thead><tr style="background-color:#fce7f3"><th>Phase</th><th>Matière première</th><th>${inciCol}</th><th>${fournisseurCol}</th><th>%</th><th>Poids (g)</th><th>Prix/kg (€)</th><th>Coût (€)</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="section print-summary">
          <h2>Résumé</h2>
          <table class="print-summary-table">
            <tbody>${summaryRows}</tbody>
          </table>
          ${phaseTotals.length > 0 ? `<p class="print-phase-totals"><strong>Totaux par phase :</strong> ${escapeHtmlContent(phaseParts)}</p>` : ''}
        </div>
      `
      printInPage(printContainerRef.current, `Formule - ${title}`, body)
    }
    window.addEventListener('print-formula', onPrintFormula)
    return () => window.removeEventListener('print-formula', onPrintFormula)
  }, [])

  const handleExportListeMP = () => {
    setOpenExportDropdown(false)
    const inciCol = swapInciFournisseur ? 'Fournisseur' : 'INCI'
    const fournisseurCol = swapInciFournisseur ? 'INCI' : 'Fournisseur'
    const lines = formula.lines || []
    const rows = lines.map((line) => {
      const inci = line.ingredient_code ? (swapInciFournisseur ? lineFournisseurByCode[line.ingredient_code] : lineInciByCode[line.ingredient_code]) || '—' : '—'
      const fournisseur = line.ingredient_code ? (swapInciFournisseur ? lineInciByCode[line.ingredient_code] : lineFournisseurByCode[line.ingredient_code]) || '—' : '—'
      const cout = line.prix_au_kilo && line.percent ? (line.prix_au_kilo * line.percent / 100).toFixed(2) : '—'
      return `<tr><td>${escapeHtmlContent(line.phase || '')}</td><td>${escapeHtmlContent(line.ingredient_name || '')}</td><td>${escapeHtmlContent(inci)}</td><td>${escapeHtmlContent(fournisseur)}</td><td>${line.percent?.toFixed(2) ?? ''} %</td><td>${line.grams?.toFixed(2) ?? ''} g</td><td>${line.prix_au_kilo != null ? line.prix_au_kilo.toFixed(2) : '—'} €/kg</td><td>${cout} €</td></tr>`
    }).join('')
    const body = `
      <h1>Liste matières premières — ${escapeHtmlContent(formulaTitle)}</h1>
      <p class="meta">Poids total : ${formula.total_weight} g · Formulateur : ${escapeHtmlContent(formula.formulator || '—')}</p>
      <table>
        <thead><tr><th>Phase</th><th>Matière première</th><th>${inciCol}</th><th>${fournisseurCol}</th><th>%</th><th>Poids (g)</th><th>Prix/kg (€)</th><th>Coût (€)</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `
    if (printContainerRef.current) printInPage(printContainerRef.current, `Liste MP - ${formulaTitle}`, body)
  }

  const handleExportListeINCI = () => {
    setOpenExportDropdown(false)
    const lines = formula.lines?.filter((l) => (l.ingredient_code || l.ingredient_name)) || []
    const inciMap = new Map<string, number>()
    for (const line of lines) {
      // Utiliser uniquement l'INCI en base (colonne inci / fournisseur_principal selon préférence), pas le nom du produit
      const inciFromDb = line.ingredient_code
        ? (swapInciFournisseur ? lineFournisseurByCode[line.ingredient_code] : lineInciByCode[line.ingredient_code])
        : null
      const inci = (inciFromDb != null && String(inciFromDb).trim() !== '') ? String(inciFromDb).trim() : ''
      if (!inci) continue
      inciMap.set(inci, (inciMap.get(inci) ?? 0) + (line.percent ?? 0))
    }
    const rows = Array.from(inciMap.entries()).sort((a, b) => b[1] - a[1]).map(([name, pct]) => `<tr><td>${escapeHtmlContent(name)}</td><td>${pct.toFixed(2)} %</td></tr>`).join('')
    const body = `
      <h1>Liste INCI — ${escapeHtmlContent(formulaTitle)}</h1>
      <p class="meta">Poids total : ${formula.total_weight} g</p>
      <table>
        <thead><tr><th>Composant INCI</th><th>%</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `
    if (printContainerRef.current) printInPage(printContainerRef.current, `Liste INCI - ${formulaTitle}`, body)
  }

  const handleExportAllergenes = async () => {
    setOpenExportDropdown(false)
    const allergenMap = new Map<string, { totalPercent: number; materials: Array<{ name: string; percent: number; allergenPercent: number }> }>()
    for (const line of formula.lines || []) {
      const code = (line.ingredient_code || '').trim()
      if (!code || line.is_qsp) continue
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) continue
        const { data: allergens } = await supabase.from('allergens').select('allergen_name, percentage').eq('ingredient_code', code).eq('user_id', user.id)
        if (allergens?.length) {
          const percentInFormula = line.percent || 0
          for (const a of allergens) {
            const name = a.allergen_name
            const allergenPercent = a.percentage || 0
            const contribution = (percentInFormula * allergenPercent) / 100
            if (!allergenMap.has(name)) allergenMap.set(name, { totalPercent: 0, materials: [] })
            const entry = allergenMap.get(name)!
            entry.totalPercent += contribution
            entry.materials.push({ name: line.ingredient_name || code, percent: percentInFormula, allergenPercent })
          }
        }
      } catch (_) {}
    }
    const rows = Array.from(allergenMap.entries()).sort((a, b) => b[1].totalPercent - a[1].totalPercent).map(([allergen, data]) =>
      `<tr><td>${escapeHtmlContent(allergen)}</td><td>${data.totalPercent.toFixed(2)} %</td><td>${data.materials.map((m) => escapeHtmlContent(`${m.name} (${m.percent}% × ${m.allergenPercent}%)`)).join(', ')}</td></tr>`
    ).join('')
    const body = `
      <h1>Allergènes — ${escapeHtmlContent(formulaTitle)}</h1>
      <p class="meta">Concentrations calculées dans la formule.</p>
      <table>
        <thead><tr><th>Allergène</th><th>% dans la formule</th><th>Origine (matière × % allergène)</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `
    if (printContainerRef.current) printInPage(printContainerRef.current, `Allergènes - ${formulaTitle}`, body)
  }

  const handleExportNotesResultats = (withPhotos: boolean) => {
    setOpenExportDropdown(false)
    const n = formula.notes || {}
    const stability = formula.stability?.days || []
    const noteRows = [
      ['Protocole', n.protocole],
      ['Aspect', n.aspect],
      ['Odeur', n.odeur],
      ['pH', n.ph],
      ['Microscope', n.microscope],
      ['Remarque', n.remarque],
      ['Conditionnement', n.conditionnement],
      ['Conclusion', n.conclusion],
    ].filter(([, v]) => v != null && String(v).trim() !== '').map(([label, val]) => `<tr><th style="width:140px">${escapeHtmlContent(label!)}</th><td>${escapeHtmlContent(String(val || ''))}</td></tr>`).join('')
    const stabilityRows = stability.map((d) => `<tr><td>${escapeHtmlContent(d.day)}</td><td>${escapeHtmlContent(d.notes || '—')}</td></tr>`).join('')
    const photos = n.photos || {}
    const photoEntries = withPhotos
      ? (['aspect', 'microscope'] as const).filter((k) => photos[k]?.trim()).map((k) => ({ label: k === 'aspect' ? 'Aspect' : 'Microscope', src: photos[k]! }))
      : []
    const photosSection =
      photoEntries.length > 0
        ? `<div class="section notes-photos-section"><h2>Photos</h2>${photoEntries.map(({ label, src }) => `<div class="notes-photo-block"><strong>${escapeHtmlContent(label)}</strong><br/><img src="${src.replace(/"/g, '&quot;')}" alt="${escapeHtmlContent(label)}" class="notes-photo-img"/></div>`).join('')}</div>`
        : ''
    const body = `
      <h1>Notes et résultats — ${escapeHtmlContent(formulaTitle)}</h1>
      <p class="meta">Formulateur : ${escapeHtmlContent(formula.formulator || '—')} · Poids total : ${formula.total_weight} g</p>
      ${noteRows ? `<div class="section"><h2>Notes</h2><table><tbody>${noteRows}</tbody></table></div>` : ''}
      ${photosSection}
      ${stabilityRows ? `<div class="section"><h2>Mise en stabilité</h2><table><thead><tr><th>Jour</th><th>Notes</th></tr></thead><tbody>${stabilityRows}</tbody></table></div>` : ''}
      ${!noteRows && !stabilityRows && !photosSection ? '<p>Aucune note ni résultat de stabilité renseigné.</p>' : ''}
    `
    if (printContainerRef.current) printInPage(printContainerRef.current, `Notes et résultats - ${formulaTitle}`, body)
  }

  const handleExportIFRA = async () => {
    setOpenExportDropdown(false)
    const codes = (formula.lines || []).filter((l) => !l.is_qsp && (l.ingredient_code || '').trim()).map((l) => (l.ingredient_code || '').trim())
    const uniqueCodes = [...new Set(codes)].filter(Boolean)
    if (uniqueCodes.length === 0) {
      setMessage({ type: 'error', text: 'Aucune matière dans la formule pour l\'export IFRA.' })
      setTimeout(() => setMessage(null), 4000)
      return
    }
    const normalizeCode = (c: string) => (c || '').trim().toLowerCase()
    const codeSetNormalized = new Set(uniqueCodes.map(normalizeCode))
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setMessage({ type: 'error', text: 'Utilisateur non authentifié' })
        return
      }
      const { data: rows, error } = await supabase
        .from('ifra_limits')
        .select('category_number, description, ingredient_code, limit_percent')
        .eq('user_id', user.id)
        .limit(5000)
      if (error) throw new Error(error.message)
      const rawLimits = (rows || []) as { category_number: string; description: string; ingredient_code: string; limit_percent: number }[]
      const limits = rawLimits.filter((r) => codeSetNormalized.has(normalizeCode(r.ingredient_code)))
      const codesInIfraNormalized = new Set(limits.map((r) => normalizeCode(r.ingredient_code)))
      const codesToShow = uniqueCodes.filter((c) => codesInIfraNormalized.has(normalizeCode(c)))
      const byCategory = new Map<string, { description: string; limits: Map<string, number> }>()
      for (const r of limits) {
        const key = String(r.category_number ?? '').trim()
        if (!key) continue
        if (!byCategory.has(key)) byCategory.set(key, { description: r.description || '', limits: new Map() })
        const entry = byCategory.get(key)!
        entry.limits.set(normalizeCode(r.ingredient_code), r.limit_percent ?? 0)
      }
      if (codesToShow.length === 0) {
        setMessage({
          type: 'error',
          text: `Aucune donnée IFRA pour les matières de cette formule (codes : ${uniqueCodes.join(', ')}). Vérifiez que l'onglet IFRA a été importé et que les codes en colonne A correspondent exactement à ceux de la Liste (ex. MP501B).`,
        })
        setTimeout(() => setMessage(null), 8000)
        return
      }
      // Toujours afficher toutes les catégories IFRA (1, 2, 3, … 12) ; si pas de % pour une catégorie, laisser vide
      const tableRows = IFRA_CATEGORY_ORDER.map((catNum) => {
        const entry = byCategory.get(catNum)
        const percents = entry ? codesToShow.map((code) => entry.limits.get(normalizeCode(code))).filter((v): v is number => v != null) : []
        const concentrationMax = percents.length > 0 ? Math.min(...percents) : null
        const pctStr = concentrationMax != null && Number.isFinite(concentrationMax) ? concentrationMax.toFixed(2) + ' %' : ''
        return `<tr><td>${escapeHtmlContent(catNum)}</td><td>${pctStr}</td></tr>`
      })
      const annexeRows = IFRA_CATEGORY_ORDER.map((catNum) => {
        const desc = getIfraCategoryDescription(catNum)
        return `<tr><td class="cat-num">${escapeHtmlContent(catNum)}</td><td class="cat-desc">${escapeHtmlContent(desc)}</td></tr>`
      })
      const body = `
        <h1>CERTIFICAT IFRA — ${escapeHtmlContent(formulaTitle)}</h1>
        <p class="meta">Nous certifions que le produit ci-après a été fabriqué conformément aux critères formulés dans le code des Bons Usages de l'IFRA-RIFM et que sa qualité a été contrôlée selon ces critères, pour une utilisation maximale (% P/P).</p>
        <p class="meta">Limites calculées à partir des matières de la formule présentes dans l'onglet IFRA (${codesToShow.length} matière${codesToShow.length > 1 ? 's' : ''}).</p>
        <table class="ifra-main-table">
          <thead><tr><th>Classe IFRA</th><th>Concentration maximale d'utilisation (en %)</th></tr></thead>
          <tbody>${tableRows.join('')}</tbody>
        </table>
        <h2 class="annexe-title">ANNEXE : Définition des classes IFRA</h2>
        <p class="annexe-intro">Classe IFRA — Types de produits finis</p>
        <table class="ifra-annexe-table">
          <thead><tr><th>Classe IFRA</th><th>Types de produits finis</th></tr></thead>
          <tbody>${annexeRows.join('')}</tbody>
        </table>
        <p class="meta ifra-footer">Information certifiée exacte dans l'état actuel de nos connaissances et dans la limite de détection à la date d'impression. Document produit et géré informatiquement.</p>
      `
      if (printContainerRef.current) printInPage(printContainerRef.current, `IFRA - ${formulaTitle}`, body)
    } catch (err) {
      console.error('Export IFRA:', err)
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erreur export IFRA. Vérifiez que l\'onglet IFRA a été importé.' })
      setTimeout(() => setMessage(null), 5000)
    }
  }

  const deleteProduitFini = async (id: number) => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('produit_fini').delete().eq('id', id).eq('user_id', user.id)
      setProduitFiniSavedList((prev) => prev.filter((r) => r.id !== id))
    } catch (_) {}
  }

  const openProduitFiniSaved = (r: (typeof produitFiniSavedList)[0]) => {
    setOpenProduitFiniDropdown(false)
    setOpenProduitFini(true)
    setProduitFiniEditingId(r.id)
    setProduitFiniEditingName(r.name ?? '')
    setProduitFiniEditingOriginalName(r.name ?? '')
    setProduitFiniGrams(r.grams)
    const itemsFromSaved = (r.items || []).slice(0, 6)
    const filled = PRODUIT_FINI_LABELS.map((_, idx) => ({
      description: itemsFromSaved[idx]?.description ?? '',
      prix_unitaire: itemsFromSaved[idx]?.prix_unitaire ?? 0,
    }))
    setProduitFiniItems(filled)
    if (r.formula_id) {
      selectFormulaForProduitFini(r.formula_id)
    } else {
      setProduitFiniFormulaQuery(`${r.formula_name || ''}${r.formula_version ? ` v${r.formula_version}` : ''}`.trim())
      setProduitFiniSelectedFormula(null)
    }
  }

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (produitFiniDropdownRef.current && !produitFiniDropdownRef.current.contains(e.target as Node)) {
        setOpenProduitFiniDropdown(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  // Prix au kg de la formule en cours (utilisé aussi pour Produit fini si aucune formule sélectionnée)
  const prixAuKg = (formula.lines || []).reduce((sum, line) => {
    if (line.prix_au_kilo && line.percent > 0) return sum + (line.prix_au_kilo * line.percent / 100)
    return sum
  }, 0)

  const produitFiniPrixAuKg = produitFiniSelectedFormula?.prixAuKg ?? prixAuKg
  const normalizeForFormulaSearch = (s: string) => (s || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
  const produitFiniFilteredFormulas = useMemo(() => {
    const q = normalizeForFormulaSearch(produitFiniFormulaQuery)
    if (!q) return produitFiniFormulasList.slice(0, 15)
    return produitFiniFormulasList.filter(
      (f) =>
        normalizeForFormulaSearch(f.name).includes(q) || normalizeForFormulaSearch(f.version).includes(q)
    ).slice(0, 15)
  }, [produitFiniFormulasList, produitFiniFormulaQuery])

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (produitFiniFormulaRef.current && !produitFiniFormulaRef.current.contains(e.target as Node)) {
        setProduitFiniFormulaDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  const formulaLineCodes = useMemo(
    () => [...new Set((formula.lines || []).map(l => l.ingredient_code).filter(Boolean))].sort().join(','),
    [formula.lines]
  )
  // Récupérer en_stock, inci et fournisseur_principal depuis ingredients pour les codes des lignes
  useEffect(() => {
    const codes = formulaLineCodes ? formulaLineCodes.split(',') : []
    if (codes.length === 0) return
    const fetchIngredientInfo = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('ingredients').select('code, en_stock, inci, fournisseur_principal').in('code', codes)
      if (!data) return
      const stockMap: Record<string, boolean> = {}
      const inciMap: Record<string, string> = {}
      const fournisseurMap: Record<string, string> = {}
      data.forEach((r: { code: string; en_stock: boolean; inci?: string | null; fournisseur_principal?: string | null }) => {
        stockMap[r.code] = !!r.en_stock
        const inciVal = r.inci != null && String(r.inci).trim() !== '' ? String(r.inci).trim() : ''
        const fpVal = r.fournisseur_principal != null && String(r.fournisseur_principal).trim() !== '' ? String(r.fournisseur_principal).trim() : ''
        if (inciVal) inciMap[r.code] = inciVal
        if (fpVal) fournisseurMap[r.code] = fpVal
      })
      setLineEnStockByCode(prev => ({ ...prev, ...stockMap }))
      setLineInciByCode(prev => ({ ...prev, ...inciMap }))
      setLineFournisseurByCode(prev => ({ ...prev, ...fournisseurMap }))
    }
    fetchIngredientInfo()
  }, [formulaLineCodes])

  // Fonction pour réinitialiser le formulaire
  const resetFormula = () => {
    setFormulaId(null)
    setFormula(initialFormula)
    setMessage(null)
    setPercentInputOverrides({})
    setGramsInputOverrides({})
    const sig = computeSignature(initialFormula)
    setLastSavedSignature(sig)
    setHasBaselineSignature(true)
    setIsDirty(false)
    setOpenProduitFini(false)
    setOpenProduitFiniDropdown(false)
    setProduitFiniEditingId(null)
    setProduitFiniEditingName('')
    setProduitFiniEditingOriginalName('')
    // Retirer le paramètre id de l'URL
    router.push('/dashboard/formulation')
  }

  // Charger une formule existante depuis l'URL
  useEffect(() => {
    const loadFormulaFromUrl = async () => {
      const id = searchParams.get('id')
      const section = searchParams.get('section')

      if (id) {
        const formulaIdNum = parseInt(id)
        if (!isNaN(formulaIdNum)) {
          await loadFormula(formulaIdNum)
        }
      } else if (section !== 'produit-fini') {
        // Pas d'ID : réinitialiser sauf si on est sur Produit fini (pour garder la formule en cours)
        setFormulaId(null)
        setFormula(initialFormula)
        setOriginalLoadedVersion(null)
        setMessage(null)
      }
    }

    loadFormulaFromUrl()
  }, [searchParams])

  const loadFormula = async (id: number) => {
    try {
      const res = await fetch(`/api/formulas/${id}`, { credentials: 'include' })
      const body = await res.json().catch(() => ({}))

      if (!res.ok) {
        const msg = body.error ?? res.statusText ?? 'Erreur inconnue'
        if (res.status === 401) {
          setMessage({ type: 'error', text: 'Utilisateur non authentifié' })
          return
        }
        throw new Error(msg)
      }

      const loadedFormula: Formula = body.formula
      if (!loadedFormula) {
        setMessage({ type: 'error', text: 'Formule non trouvée' })
        return
      }

      setFormula(loadedFormula)
      setFormulaId(loadedFormula.id!)
      setOriginalLoadedVersion(loadedFormula.version ?? '')
      const sig = computeSignature(loadedFormula)
      setLastSavedSignature(sig)
      setHasBaselineSignature(true)
      setIsDirty(false)
      setMessage({ type: 'success', text: 'Formule chargée avec succès !' })
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error('Erreur chargement formule:', error)
      setMessage({
        type: 'error',
        text: `Erreur lors du chargement: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
      })
    }
  }

  const handleSave = async () => {
    if (!formula.name.trim()) {
      setMessage({ type: 'error', text: 'Veuillez saisir un nom pour la formule' })
      return
    }
    if (!organizationId) {
      setMessage({ type: 'error', text: 'Organisation introuvable. Rechargez la page.' })
      return
    }

    setSaving(true)
    setMessage(null)

    const versionTrim = (formula.version || '').trim()
    const payload = {
      name: formula.name,
      version: formula.version || null,
      formulator: formula.formulator || null,
      total_weight: formula.total_weight,
      notes: formula.notes || {},
      stability: formula.stability || { days: [] },
      image: formula.image || null,
      is_active: formula.is_active ?? false,
      improvement_goal: formula.improvement_goal?.trim() || null,
      id: formula.id,
      lines: formula.lines?.map((line) => ({
        phase: line.phase,
        ingredient_code: line.ingredient_code,
        ingredient_name: line.ingredient_name,
        percent: line.percent,
        grams: line.grams,
        notes: line.notes || '',
        is_qsp: line.is_qsp || false,
        prix_au_kilo: line.prix_au_kilo ?? null,
        stock_indicator: line.stock_indicator ?? null,
      })),
    }

    try {
      const res = await fetch('/api/formulas/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          payload,
          originalLoadedVersion,
          stockIndicators,
        }),
      })
      const result = await res.json().catch(() => ({ ok: false, error: res.statusText }))

      if (!result.ok) {
        setMessage({
          type: 'error',
          text: `Erreur lors de l'enregistrement: ${result.error ?? res.statusText ?? 'Erreur inconnue'}`,
        })
        return
      }

      const { formulaId, savedWithStock, redirectId } = result
      setFormula((prev) => ({ ...prev, id: formulaId }))
      setFormulaId(formulaId)
      const sig = computeSignature({ ...formula, id: formulaId })
      setLastSavedSignature(sig)
      setHasBaselineSignature(true)
      setIsDirty(false)

      if (redirectId !== undefined) {
        setOriginalLoadedVersion(versionTrim)
        const wasNewVersion =
          Boolean(formula.id && originalLoadedVersion !== null && versionTrim !== (originalLoadedVersion || '').trim())
        if (wasNewVersion) {
          setFormula((prev) => ({ ...prev, stability: { start_date: undefined, days: [] } }))
        }
        router.replace(`/dashboard/formulation?id=${redirectId}`, { scroll: false })
      }

      if (savedWithStock) {
        setMessage({ type: 'success', text: 'Formule enregistrée avec succès !' })
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({
          type: 'success',
          text: 'Formule enregistrée. Pour sauvegarder les carrés de couleur (stock), exécutez dans Supabase → SQL : ALTER TABLE formula_lines ADD COLUMN IF NOT EXISTS stock_indicator TEXT;',
        })
        setTimeout(() => setMessage(null), 10000)
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : (typeof error === 'string' ? error : 'Erreur inconnue')
      console.error('Erreur lors de l\'enregistrement:', error)
      setMessage({ type: 'error', text: `Erreur lors de l'enregistrement: ${errMsg}` })
    } finally {
      setSaving(false)
    }
  }

  const addLine = () => {
    const newLine: FormulaLine = {
      phase: '',
      ingredient_code: '',
      ingredient_name: '',
      percent: 0,
      grams: 0,
      notes: '',
      is_qsp: false
    }
    setFormula(prev => ({ ...prev, lines: [...(prev.lines || []), newLine] }))
  }

  /** Réordonne par phase (1, 2, 3…). Même phase = même bloc ; le QSP est en première position de sa phase (en haut du bloc). */
  const sortLinesByPhase = (lines: FormulaLine[]): FormulaLine[] => {
    return [...lines].sort((a, b) => {
      const pa = (a.phase || '').trim()
      const pb = (b.phase || '').trim()
      const na = /^\d$/.test(pa) ? parseInt(pa, 10) : 0
      const nb = /^\d$/.test(pb) ? parseInt(pb, 10) : 0
      if (na !== nb) return na - nb
      // Même phase : QSP en première position (en haut du bloc)
      if (a.is_qsp && !b.is_qsp) return -1
      if (!a.is_qsp && b.is_qsp) return 1
      return 0
    })
  }

  const moveLineUp = (index: number) => {
    if (index <= 0) return
    const newLines = [...(formula.lines || [])]
    ;[newLines[index - 1], newLines[index]] = [newLines[index], newLines[index - 1]]
    handleLinesChange(newLines)
    setStockIndicators(prev => {
      const a = prev[index - 1]
      const b = prev[index]
      const next = { ...prev }
      if (a !== undefined) next[index] = a
      else delete next[index]
      if (b !== undefined) next[index - 1] = b
      else delete next[index - 1]
      return next
    })
  }

  const moveLineDown = (index: number) => {
    if (index >= (formula.lines?.length ?? 0) - 1) return
    const newLines = [...(formula.lines || [])]
    ;[newLines[index], newLines[index + 1]] = [newLines[index + 1], newLines[index]]
    handleLinesChange(newLines)
    setStockIndicators(prev => {
      const a = prev[index]
      const b = prev[index + 1]
      const next = { ...prev }
      if (a !== undefined) next[index + 1] = a
      else delete next[index + 1]
      if (b !== undefined) next[index] = b
      else delete next[index]
      return next
    })
  }

  const handleLinesChange = (lines: FormulaLine[]) => {
    // Recalculer le QSP si nécessaire
    const qspLineIndex = lines.findIndex(l => l.is_qsp)
    if (qspLineIndex >= 0) {
      const nonQspLines = lines.filter((l, i) => i !== qspLineIndex && !l.is_qsp)
      const totalNonQsp = nonQspLines.reduce((sum, line) => sum + (line.percent || 0), 0)
      const qspPercent = Math.max(0, 100 - totalNonQsp)
      lines[qspLineIndex].percent = qspPercent
      lines[qspLineIndex].grams = (formula.total_weight * qspPercent) / 100
    }
    // Trier par phase (QSP sans phase en tête, QSP avec phase à la fin de son bloc)
    lines = sortLinesByPhase(lines)
    setFormula(prev => ({ ...prev, lines }))
  }

  const handleMaterialSelect = (index: number, material: Ingredient) => {
    const newLines = [...(formula.lines || [])]
    newLines[index].ingredient_code = material.code
    newLines[index].ingredient_name = material.nom
    newLines[index].prix_au_kilo = material.prix_au_kilo
    handleLinesChange(newLines)
    if (material.code != null) {
      setLineEnStockByCode(prev => ({ ...prev, [material.code]: !!material.en_stock }))
    }
  }

  const deleteLine = (index: number) => {
    const newLines = (formula.lines || []).filter((_, i) => i !== index)
    handleLinesChange(newLines)
  }

  const totalPercentNonQsp = useMemo(() => {
    const lines: FormulaLine[] = formula.lines ?? []
    return lines
      .filter(l => !l.is_qsp)
      .reduce((sum, line) => sum + (line.percent || 0), 0)
  }, [formula.lines])

  // Recalculer le QSP quand le poids total change
  useEffect(() => {
    const qspLineIndex = (formula.lines || []).findIndex(l => l.is_qsp)
    if (qspLineIndex >= 0) {
      const newLines = [...(formula.lines || [])]
      const nonQspLines = newLines.filter((l, i) => i !== qspLineIndex && !l.is_qsp)
      const totalNonQsp = nonQspLines.reduce((sum, line) => sum + (line.percent || 0), 0)
      const qspPercent = Math.max(0, 100 - totalNonQsp)
      
      if (Math.abs(newLines[qspLineIndex].percent - qspPercent) > 0.01 || 
          Math.abs(newLines[qspLineIndex].grams - (formula.total_weight * qspPercent) / 100) > 0.01) {
        newLines[qspLineIndex].percent = qspPercent
        newLines[qspLineIndex].grams = (formula.total_weight * qspPercent) / 100
        // Garder QSP en première ligne
        if (qspLineIndex > 0) {
          const [qsp] = newLines.splice(qspLineIndex, 1)
          newLines.unshift(qsp)
        }
        setFormula(prev => ({ ...prev, lines: newLines }))
      }
    }
  }, [formula.total_weight, totalPercentNonQsp])

  const qspLine = (formula.lines || []).find(l => l.is_qsp)
  const qspPercent = qspLine ? (100 - totalPercentNonQsp) : 0
  const totalPercent = totalPercentNonQsp + qspPercent

  // Couleur de fond par phase (phases numériques 1–9) — même phase = même couleur sur toute la ligne
  const phaseBgColors: Record<string, string> = {
    '1': '#dbeafe', '2': '#d1fae5', '3': '#fef3c7', '4': '#e9d5ff', '5': '#cffafe', '6': '#fce7f3',
    '7': '#fef9c3', '8': '#ddd6fe', '9': '#fed7aa',
  }

  // Calculer les totaux par phase
  const phaseTotals = useMemo(() => {
    const phaseMap = new Map<string, { percent: number; grams: number; count: number; hasQsp: boolean }>();
    const lines: FormulaLine[] = formula.lines ?? [];
    lines.forEach(line => {
      const phase = (line.phase || '').trim()
      if (phase || line.is_qsp) {
        // QSP avec une phase intègre cette phase ; QSP sans phase reste "QSP"
        const phaseKey = line.is_qsp ? (phase || 'QSP') : phase
        
        if (!phaseMap.has(phaseKey)) {
          phaseMap.set(phaseKey, { percent: 0, grams: 0, count: 0, hasQsp: false })
        }
        const phaseData = phaseMap.get(phaseKey)!
        phaseData.percent += line.percent || 0
        phaseData.grams += line.grams || 0
        phaseData.count += 1
        if (line.is_qsp) {
          phaseData.hasQsp = true
        }
      }
    })
    
    // Trier : QSP (sans phase) en premier, puis phases 1, 2, 3…
    return Array.from(phaseMap.entries())
      .map(([phase, data]) => ({ phase, ...data }))
      .sort((a, b) => {
        if (a.phase === 'QSP') return -1
        if (b.phase === 'QSP') return 1
        const na = /^\d$/.test(a.phase) ? parseInt(a.phase, 10) : 9999
        const nb = /^\d$/.test(b.phase) ? parseInt(b.phase, 10) : 9999
        return na - nb
      })
  }, [formula.lines])

  return (
    <div className="max-w-7xl mx-auto">
      {/* Conteneur caché pour l'impression (export PDF) — pas de pop-up */}
      <div ref={printContainerRef} className="print-export-root" aria-hidden="true" />
      <div className="bg-white rounded-lg shadow-md p-8">
        {/* Barre EXPORT en haut : rectangle bleu avec menu d'export PDF */}
        <div ref={exportBarRef} className="mb-4">
          <div className="flex items-center justify-between rounded-lg bg-blue-600 px-4 py-2.5 text-white shadow-sm">
            <span className="font-semibold">EXPORT</span>
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenExportDropdown((v) => !v)}
                className="flex items-center gap-2 rounded-md bg-blue-500 px-3 py-1.5 text-sm font-medium hover:bg-blue-400 transition-colors"
                aria-expanded={openExportDropdown}
                aria-haspopup="true"
              >
                Choisir un export
                <span className="text-xs">{openExportDropdown ? '▲' : '▼'}</span>
              </button>
              {openExportDropdown && (
                <div className="absolute right-0 top-full z-50 mt-1 min-w-[260px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                  <button
                    type="button"
                    onClick={handleExportListeMP}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-800 hover:bg-blue-50 transition-colors"
                  >
                    Export Liste MP
                  </button>
                  <button
                    type="button"
                    onClick={handleExportListeINCI}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-800 hover:bg-blue-50 transition-colors"
                  >
                    Export Liste INCI
                  </button>
                  <button
                    type="button"
                    onClick={handleExportAllergenes}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-800 hover:bg-blue-50 transition-colors"
                  >
                    Export Allergènes
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportNotesResultats(true)}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-800 hover:bg-blue-50 transition-colors"
                  >
                    Notes et Résultats (avec photos)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportNotesResultats(false)}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-800 hover:bg-blue-50 transition-colors"
                  >
                    Notes et Résultats (sans photos)
                  </button>
                  <button
                    type="button"
                    onClick={handleExportIFRA}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-800 hover:bg-blue-50 transition-colors"
                  >
                    Export IFRA
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold text-pink-600">
                {formulaId ? '✏️ Modifier Formule' : '✏️ Nouvelle Formule'}
              </h1>
              {formulaId && (
                <>
                  {formula.is_active ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 text-green-800 font-medium text-sm" title="Version choisie pour la fabrication">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-200 text-green-700">✓</span>
                      Formule active
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSetAsActive}
                      disabled={settingActive}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-green-100 hover:text-green-800 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Définir cette version comme formule active (choisie pour la fabrication)"
                    >
                      {settingActive ? '…' : (
                        <>
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border-2 border-green-500 text-green-600">✓</span>
                          Définir comme formule active
                        </>
                      )}
                    </button>
                  )}
                </>
              )}
            </div>
            <button
              onClick={resetFormula}
              className="px-4 py-2 bg-pink-100 text-pink-700 rounded-lg font-medium hover:bg-pink-200 transition-colors shrink-0"
            >
              ➕ Nouvelle Formule
            </button>
          </div>

          {/* Ligne : Nom (réduit) + Version + Formulateur ; bouton Enregistrer à droite, toujours visible */}
          <div className="flex items-center gap-3 mb-4 w-full">
            <input
              type="text"
              placeholder="Nom de la formule"
              value={formula.name}
              onChange={(e) => setFormula(prev => ({ ...prev, name: e.target.value }))}
              className="w-32 sm:w-40 flex-shrink-0 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
            <input
              type="text"
              placeholder="Version"
              value={formula.version}
              onChange={(e) => setFormula(prev => ({ ...prev, version: e.target.value }))}
              className="w-20 sm:w-24 flex-shrink-0 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
            <input
              type="text"
              placeholder="Formulateur"
              value={formula.formulator}
              onChange={(e) => setFormula(prev => ({ ...prev, formulator: e.target.value }))}
              className="w-28 sm:w-32 flex-shrink-0 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
            <div className="flex-1 min-w-2" aria-hidden="true" />
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-shrink-0 px-5 py-2.5 min-w-[160px] rounded-lg font-bold text-base border-2 border-gray-800 shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                color: '#ffffff',
                backgroundColor: saving ? '#6b7280' : isDirty ? '#dc2626' : '#16a34a',
              }}
            >
              {saving ? 'Enregistrement…' : isDirty ? 'ENREGISTRER' : 'ENREGISTRÉ'}
            </button>
          </div>

          {/* Objectif d'amélioration (trace pour les nouvelles versions, visible en comparaison) */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Objectif d&apos;amélioration (but recherché pour cette version)</label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                list="improvement-goal-list"
                placeholder="Choisir ou saisir un objectif…"
                value={formula.improvement_goal || ''}
                onChange={(e) => setFormula(prev => ({ ...prev, improvement_goal: e.target.value }))}
                className="flex-1 min-w-[200px] max-w-xl px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
              <datalist id="improvement-goal-list">
                {IMPROVEMENT_GOAL_OPTIONS.map((opt) => (
                  <option key={opt} value={opt} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:gap-4">
            <label className="flex items-center gap-2">
              <span className="text-gray-700">Poids total final (g) :</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formula.total_weight}
                onChange={(e) => {
                  const newTotal = parseFloat(e.target.value) || 0
                  if (newTotal < 0) return
                  setFormula(prev => {
                    const lines = prev.lines ?? []
                    const newLines = lines.map(line => ({
                      ...line,
                      grams: (newTotal * (line.percent || 0)) / 100
                    }))
                    return { ...prev, total_weight: newTotal, lines: newLines }
                  })
                }}
                className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </label>
          </div>

          {message && (
            <div className={`p-4 rounded-lg mb-4 ${
              message.type === 'success' 
                ? 'bg-green-100 text-green-800 border border-green-300' 
                : 'bg-red-100 text-red-800 border border-red-300'
            }`}>
              {message.text}
            </div>
          )}
        </div>

        {/* Contrôles supérieurs */}
        <div className="mb-4 flex flex-wrap gap-2">
          <div className="relative" ref={produitFiniDropdownRef}>
            <button
              type="button"
              onClick={() => setOpenProduitFiniDropdown((v) => !v)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-1 ${
                openProduitFiniDropdown || openProduitFini ? 'bg-pink-200 text-pink-800' : 'bg-pink-100 text-pink-700 hover:bg-pink-200'
              }`}
            >
              📦 Produits finis enregistrés
              <span className="text-xs">{openProduitFiniDropdown ? '▲' : '▼'}</span>
            </button>
            {openProduitFiniDropdown && (
              <div className="absolute left-0 top-full z-50 mt-1 min-w-[320px] max-w-[420px] max-h-[70vh] overflow-hidden bg-white border-2 border-pink-200 rounded-lg shadow-lg">
                <div className="p-2 border-b border-pink-100">
                  <button
                    type="button"
                    onClick={() => {
                      setOpenProduitFiniDropdown(false)
                      setOpenProduitFini(true)
                      setProduitFiniEditingId(null)
                      setProduitFiniEditingName('')
                      setProduitFiniEditingOriginalName('')
                      produitFiniPrefilledForOpenRef.current = false
                    }}
                    className="w-full px-3 py-2 text-left text-sm font-medium text-pink-700 bg-pink-50 hover:bg-pink-100 rounded-lg"
                  >
                    ➕ Faire un nouveau calcul
                  </button>
                </div>
                <div className="p-2 max-h-[60vh] overflow-y-auto">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2 px-1">Produits finis enregistrés</p>
                  {produitFiniListLoading ? (
                    <p className="text-sm text-gray-500 py-2">Chargement…</p>
                  ) : produitFiniSavedList.length === 0 ? (
                    <p className="text-sm text-gray-500 py-2">Aucun calcul enregistré.</p>
                  ) : (
                    <ul className="space-y-1">
                      {produitFiniSavedList.map((r) => (
                        <li
                          key={r.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => openProduitFiniSaved(r)}
                          onKeyDown={(e) => e.key === 'Enter' && openProduitFiniSaved(r)}
                          className="flex flex-wrap items-center justify-between gap-2 py-2 px-3 bg-gray-50 hover:bg-pink-50 border border-gray-200 rounded-lg text-sm cursor-pointer"
                        >
                          <span className="font-medium text-gray-900 truncate flex-1 min-w-0">
                            {r.name || `${r.formula_name}${r.formula_version ? ` v${r.formula_version}` : ''}`}
                          </span>
                          <span className="text-pink-700 font-semibold shrink-0">{r.total_price.toFixed(2)} €</span>
                          <span className="text-gray-400 text-xs shrink-0">
                            {new Date(r.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteProduitFini(r.id)
                            }}
                            className="text-red-600 hover:underline text-xs shrink-0"
                            title="Supprimer"
                          >
                            Supprimer
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
          <INCIList formulaLines={formula.lines || []} />
          <AllergenTracker formulaLines={formula.lines || []} />
          <StabilityTracker
            stability={formula.stability}
            onChange={(stability) => setFormula(prev => ({ ...prev, stability }))}
          />
          <NotesResultsMenu
            notes={formula.notes}
            onChange={(notes) => setFormula(prev => ({ ...prev, notes }))}
          />
          <button
            onClick={addLine}
            className="px-4 py-2 bg-pink-100 text-pink-700 rounded-lg font-medium hover:bg-pink-200 transition-colors"
          >
            ➕ Ajouter une ligne
          </button>
        </div>

        {/* Section Produit fini (coût formule + emballages + total) */}
        {openProduitFini && (
          <div className="mb-6 p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
            <h2 className="text-lg font-semibold text-pink-700 mb-4">📦 Coût produit fini</h2>
            <p className="text-sm text-gray-600 mb-4">Choisir une formule déjà réalisée ou utiliser la formule en cours. Les produits enregistrés sont dans le menu <strong>« Produits finis enregistrés »</strong> en haut.</p>

            <div ref={produitFiniListRef} className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              <strong>Flacon, Etui, etc. :</strong> choisissez un article dans la liste (après import de la feuille <strong>« Emballages »</strong>) ou saisissez un prix directement dans la cellule <strong>Prix (€)</strong> pour l’ajouter au total.
            </div>
            <div className="grid gap-4 max-w-2xl">
              <div className="flex flex-wrap items-center gap-4">
                <div className="w-48 shrink-0 px-3 py-2.5 bg-pink-50 border border-pink-200 rounded-lg">
                  <span className="text-sm font-bold text-pink-800">Nom du produit fini</span>
                </div>
                <input
                  type="text"
                  value={produitFiniEditingName}
                  onChange={(e) => setProduitFiniEditingName(e.target.value)}
                  placeholder={produitFiniEditingId ? undefined : 'Ex. Crème hydratante v1.0F (laissé vide = nom auto)'}
                  className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 text-sm"
                />
                {produitFiniEditingId && (
                  <span className="text-xs text-gray-500 shrink-0">Même nom = mise à jour · Nouveau nom = nouveau produit</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <div className="w-48 shrink-0 px-3 py-2.5 bg-pink-50 border border-pink-200 rounded-lg">
                  <span className="text-sm font-bold text-pink-800">Coût formule + gr à remplir</span>
                </div>
                <div ref={produitFiniFormulaRef} className="relative flex-1 min-w-[200px]">
                  <input
                    type="text"
                    value={produitFiniFormulaQuery}
                    onChange={(e) => {
                      const v = e.target.value
                      setProduitFiniFormulaQuery(v)
                      if (v.trim() === '') setProduitFiniSelectedFormula(null)
                      setProduitFiniFormulaDropdownOpen(true)
                    }}
                    onFocus={() => setProduitFiniFormulaDropdownOpen(true)}
                    placeholder="Rechercher une formule (nom ou version)…"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 text-sm"
                  />
                  {produitFiniFormulaDropdownOpen && produitFiniFilteredFormulas.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full max-w-md bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {produitFiniFilteredFormulas.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm hover:bg-pink-50 flex justify-between"
                          onClick={() => selectFormulaForProduitFini(f.id)}
                        >
                          <span>{f.name || 'Sans nom'}</span>
                          <span className="text-gray-500">v{f.version || '—'}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={produitFiniGrams || ''}
                  onChange={(e) => setProduitFiniGrams(parseFloat(e.target.value) || 0)}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 text-sm"
                  placeholder="100"
                />
                <span className="text-gray-500">g</span>
                <span className="font-medium text-gray-900">
                  = {((produitFiniPrixAuKg / 1000) * (produitFiniGrams || 0)).toFixed(2)} €
                </span>
                {produitFiniFormulaLoading && <span className="text-sm text-gray-500">Chargement…</span>}
              </div>
              <div className="flex flex-wrap items-center gap-2 -mt-2 text-sm text-gray-600">
                <span>Formule utilisée :</span>
                <span className="font-medium text-gray-900">
                  {produitFiniSelectedFormula
                    ? `${produitFiniSelectedFormula.name}${produitFiniSelectedFormula.version ? ` v${produitFiniSelectedFormula.version}` : ''}`
                    : formula.name || formula.version
                      ? `${formula.name || ''}${formula.version ? ` v${formula.version}` : ''}`.trim() || '—'
                      : 'Formule en cours (non nommée)'}
                </span>
              </div>
              {PRODUIT_FINI_LABELS.map((label, idx) => (
                <div key={idx} className="flex flex-wrap items-center gap-4">
                  <div className="w-48 shrink-0 px-3 py-2.5 bg-pink-50 border border-pink-200 rounded-lg">
                    <span className="text-sm font-bold text-pink-800">{label}</span>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <PackagingAutocomplete
                      value={produitFiniItems[idx]?.description ?? ''}
                      prixUnitaire={produitFiniItems[idx]?.prix_unitaire ?? 0}
                      onSelect={(item) => {
                        setProduitFiniItems((prev) => {
                          const next = [...prev]
                          next[idx] = { description: item.description, prix_unitaire: item.prix_unitaire }
                          return next
                        })
                      }}
                      placeholder={`Rechercher ${label.toLowerCase()}…`}
                    />
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={produitFiniItems[idx]?.prix_unitaire != null ? produitFiniItems[idx]!.prix_unitaire : ''}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value)
                        const num = Number.isFinite(v) && v >= 0 ? v : 0
                        setProduitFiniItems((prev) => {
                          const next = [...prev]
                          next[idx] = { description: next[idx]?.description ?? '', prix_unitaire: num }
                          return next
                        })
                      }}
                      placeholder="0"
                      className="w-20 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 text-sm text-right"
                      title="Prix à ajouter au total (€)"
                    />
                    <span className="text-sm text-gray-500 w-6">€</span>
                  </div>
                </div>
              ))}
              <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-gray-200">
                <div className="w-48 shrink-0 px-3 py-2.5 bg-pink-100 border border-pink-300 rounded-lg">
                  <span className="text-sm font-bold text-pink-900">Total</span>
                </div>
                <div className="flex-1 min-w-[200px]" />
                <div className="flex items-center gap-2 shrink-0 w-[7rem] justify-end">
                  <span className="font-bold text-pink-700 text-lg">
                    {(
                      (produitFiniPrixAuKg / 1000) * (produitFiniGrams || 0) +
                      produitFiniItems.reduce((s, i) => s + (i?.prix_unitaire ?? 0), 0)
                    ).toFixed(2)} €
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={saveProduitFini}
                  disabled={produitFiniSaving}
                  className="px-4 py-2 bg-pink-600 text-white font-semibold rounded-lg hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {produitFiniSaving ? 'Enregistrement…' : 'Enregistrer ce calcul'}
                </button>
                {produitFiniSaveError && (
                  <p className="text-sm text-red-600 mt-2">{produitFiniSaveError}</p>
                )}
                {produitFiniShowTableHelp && (
                  <div className="mt-4 p-4 bg-amber-50 border-2 border-amber-300 rounded-lg text-sm">
                    <p className="font-semibold text-amber-900 mb-2">La table « produit_fini » n’existe pas dans Supabase.</p>
                    <p className="text-amber-800 mb-2">Pour activer l’enregistrement :</p>
                    <ol className="list-decimal list-inside text-amber-800 space-y-1 mb-3">
                      <li>Ouvrez <strong>Supabase</strong> → votre projet → <strong>SQL Editor</strong>.</li>
                      <li>Cliquez sur <strong>+</strong> (New query).</li>
                      <li>Collez tout le script SQL ci-dessous dans l’éditeur.</li>
                      <li>Cliquez sur <strong>Run</strong> (ou ⌘↵).</li>
                      <li>Vérifiez qu’il n’y a pas d’erreur, puis réessayez « Enregistrer ce calcul » ici.</li>
                    </ol>
                    <pre className="p-3 bg-white border border-amber-200 rounded text-xs overflow-x-auto whitespace-pre font-mono text-gray-800">{`CREATE TABLE IF NOT EXISTS produit_fini (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT,
  formula_id BIGINT,
  formula_name TEXT NOT NULL DEFAULT '',
  formula_version TEXT NOT NULL DEFAULT '',
  grams REAL NOT NULL DEFAULT 0,
  total_price REAL NOT NULL DEFAULT 0,
  items JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_produit_fini_user_id ON produit_fini(user_id);
CREATE INDEX IF NOT EXISTS idx_produit_fini_created_at ON produit_fini(created_at DESC);
ALTER TABLE produit_fini ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own produit_fini" ON produit_fini;
DROP POLICY IF EXISTS "Users can insert their own produit_fini" ON produit_fini;
DROP POLICY IF EXISTS "Users can delete their own produit_fini" ON produit_fini;
CREATE POLICY "Users can view their own produit_fini" ON produit_fini FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own produit_fini" ON produit_fini FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own produit_fini" ON produit_fini FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own produit_fini" ON produit_fini FOR DELETE USING (auth.uid() = user_id);`}</pre>
                    <button
                      type="button"
                      onClick={() => setProduitFiniShowTableHelp(false)}
                      className="mt-2 text-amber-700 hover:underline text-xs"
                    >
                      Masquer ces instructions
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tableau */}
        <div className="overflow-x-auto mb-4">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-pink-100">
                <th className="border border-gray-300 px-0 py-1 text-center shrink-0 text-xs" style={{ width: 28 }}>Phase</th>
                <th className="border border-gray-300 px-1 py-1 text-left text-sm min-w-[320px]">Matière première</th>
                <th className="border border-gray-300 px-2 py-1 text-left text-sm min-w-[280px]">INCI</th>
                <th className="border border-gray-300 px-2 py-1 text-left text-sm min-w-[140px]">Fournisseur principal</th>
                <th className="border border-gray-300 px-1 py-1 text-center text-sm shrink-0" style={{ width: 48 }}>%</th>
                <th className="border border-gray-300 px-1 py-1 text-left text-sm shrink-0" style={{ width: 70 }}>Poids (g)</th>
                <th className="border border-gray-300 px-1 py-1 text-left text-sm shrink-0" style={{ width: 90 }}>Prix/kg (€)</th>
                <th className="border border-gray-300 px-2 py-1 text-left text-sm">Coût (€)</th>
                <th className="border border-gray-300 px-2 py-1 text-left text-sm">QSP</th>
                <th className="border border-gray-300 px-0 py-1 text-center text-xs w-20" title="Ordre des matières">↑↓</th>
              </tr>
            </thead>
            <tbody>
              {(formula.lines || []).map((line, index) => {
                const phaseTrim = (line.phase || '').trim()
                const rowBg = line.is_qsp
                  ? (phaseTrim ? (phaseBgColors[phaseTrim] ?? '#fce7f3') : '#fce7f3')
                  : (phaseBgColors[phaseTrim] ?? '#ffffff')
                return (
                <tr key={index} className="text-sm" style={{ backgroundColor: rowBg }}>
                  <td
                    className="border border-gray-300 px-0 py-1 shrink-0 align-middle text-center"
                    style={{
                      width: 28,
                      backgroundColor: rowBg,
                    }}
                  >
                    <input
                      type="text"
                      inputMode="numeric"
                      value={line.phase}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^1-9]/g, '').slice(0, 1)
                        const newLines = [...(formula.lines || [])]
                        newLines[index].phase = value
                        const sorted = sortLinesByPhase(newLines)
                        handleLinesChange(sorted)
                        setStockIndicators(prev => {
                          const next: Record<number, 'rouge' | 'vert' | 'bleu' | 'neutre'> = {}
                          sorted.forEach((l, i) => {
                            if (l.stock_indicator) next[i] = l.stock_indicator
                          })
                          return next
                        })
                      }}
                      onKeyDown={(e) => {
                        const key = e.key
                        if (!/^[1-9]$/.test(key) &&
                            key !== 'Backspace' && key !== 'Delete' &&
                            key !== 'ArrowLeft' && key !== 'ArrowRight' && key !== 'Tab') {
                          e.preventDefault()
                        }
                      }}
                      maxLength={1}
                      placeholder={line.is_qsp ? 'Phase' : '1'}
                      className="w-5 min-w-5 px-0 py-0.5 border border-gray-200 rounded text-center font-semibold text-xs focus:ring-2 focus:ring-pink-500 focus:outline-none"
                      title={line.is_qsp ? 'Phase du QSP (optionnel)' : 'Phase de cette ligne'}
                    />
                  </td>
                  <td className="border border-gray-300 px-1 py-1 align-top">
                    <div className="flex items-center gap-1 min-w-0 flex-wrap">
                      <div className="min-w-0 flex-1 flex items-stretch">
                        <MaterialAutocomplete
                          value={line.ingredient_name || ''}
                          onSelect={(material) => handleMaterialSelect(index, material)}
                          onCodeClick={() => setSelectedMaterialCode(line.ingredient_code)}
                          refreshTrigger={materialRefreshTrigger}
                          compact
                          displayCode={line.ingredient_code || undefined}
                        />
                      </div>
                      {line.is_qsp && (
                        <span className="font-semibold text-pink-600 shrink-0" title="Quantité suffisante pour">QSP</span>
                      )}
                    </div>
                  </td>
                  <td className="border border-gray-300 px-2 py-1 align-top text-gray-700 text-sm min-w-[280px]">
                    {line.ingredient_code ? ((swapInciFournisseur ? lineFournisseurByCode[line.ingredient_code] : lineInciByCode[line.ingredient_code]) || '—') : '—'}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 align-top text-gray-700 text-sm min-w-[140px]">
                    {line.ingredient_code ? ((swapInciFournisseur ? lineInciByCode[line.ingredient_code] : lineFournisseurByCode[line.ingredient_code]) || '—') : '—'}
                  </td>
                  <td className="border border-gray-300 px-0 py-1 align-top shrink-0" style={{ width: 48 }}>
                    {line.is_qsp ? (
                      <span className="font-semibold text-pink-600 block text-center">
                        {line.percent.toFixed(2)}%
                      </span>
                    ) : (
                      <input
                        type="text"
                        inputMode="decimal"
                        value={percentInputOverrides[index] ?? (line.percent === 0 ? '' : String(line.percent))}
                        onFocus={(e) => {
                          setPercentInputOverrides(prev => ({ ...prev, [index]: line.percent === 0 ? '' : String(line.percent) }))
                        }}
                        onChange={(e) => {
                          const raw = e.target.value.replace(',', '.')
                          setPercentInputOverrides(prev => ({ ...prev, [index]: e.target.value }))
                          const num = parseFloat(raw)
                          if (raw === '' || !isNaN(num)) {
                            const newLines = [...(formula.lines || [])]
                            newLines[index].percent = raw === '' ? 0 : num
                            newLines[index].grams = (formula.total_weight * newLines[index].percent) / 100
                            handleLinesChange(newLines)
                          }
                        }}
                        onBlur={() => {
                          setPercentInputOverrides(prev => {
                            const next = { ...prev }
                            delete next[index]
                            return next
                          })
                        }}
                        placeholder="0"
                        className="px-0.5 py-0.5 border border-gray-200 rounded text-sm text-center"
                        style={{ width: 44 }}
                      />
                    )}
                  </td>
                  <td className="border border-gray-300 px-1 py-1 align-top shrink-0" style={{ width: 70 }}>
                    {line.is_qsp ? (
                      <span className="font-semibold text-pink-600">
                        {line.grams.toFixed(2)} g
                      </span>
                    ) : (
                      <input
                        type="text"
                        inputMode="decimal"
                        value={gramsInputOverrides[index] ?? (line.grams === 0 ? '' : String(line.grams))}
                        onFocus={(e) => {
                          setGramsInputOverrides(prev => ({ ...prev, [index]: line.grams === 0 ? '' : String(line.grams) }))
                        }}
                        onChange={(e) => {
                          const raw = e.target.value.replace(',', '.')
                          setGramsInputOverrides(prev => ({ ...prev, [index]: e.target.value }))
                          const num = parseFloat(raw)
                          if (raw === '' || !isNaN(num)) {
                            const newLines = [...(formula.lines || [])]
                            newLines[index].grams = raw === '' ? 0 : num
                            newLines[index].percent = (newLines[index].grams / formula.total_weight) * 100
                            handleLinesChange(newLines)
                          }
                        }}
                        onBlur={() => {
                          setGramsInputOverrides(prev => {
                            const next = { ...prev }
                            delete next[index]
                            return next
                          })
                        }}
                        placeholder="0"
                        className="px-1 py-0.5 border border-gray-200 rounded text-sm text-right"
                        style={{ width: 60 }}
                      />
                    )}
                  </td>
                  <td className="border border-gray-300 px-1 py-1 align-top shrink-0" style={{ width: 90 }}>
                    <input
                      type="number"
                      step="0.01"
                      value={line.prix_au_kilo || ''}
                      onChange={(e) => {
                        const newLines = [...(formula.lines || [])]
                        newLines[index].prix_au_kilo = parseFloat(e.target.value) || undefined
                        handleLinesChange(newLines)
                      }}
                      className="px-1 py-0.5 border border-gray-200 rounded text-sm text-right"
                      style={{ width: 78 }}
                      disabled={line.is_qsp && false}
                    />
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-right align-top">
                    {line.prix_au_kilo && line.percent > 0 ? (
                      <span className={`font-semibold ${line.is_qsp ? 'text-pink-600' : 'text-gray-900'}`}>
                        {(line.prix_au_kilo * line.percent / 100).toFixed(2)} €/kg
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="border border-gray-300 px-1 py-1 text-center align-top">
                    <input
                      type="checkbox"
                      checked={line.is_qsp}
                      onChange={(e) => {
                        const newLines = [...(formula.lines || [])]
                        const wasQsp = line.is_qsp
                        const willBeQsp = e.target.checked
                        
                        // Si on coche QSP, s'assurer qu'il n'y a qu'un seul QSP
                        if (willBeQsp && !wasQsp) {
                          // Décocher tous les autres QSP
                          newLines.forEach((l, i) => {
                            if (i !== index && l.is_qsp) {
                              l.is_qsp = false
                            }
                          })
                        }
                        
                        newLines[index].is_qsp = willBeQsp
                        handleLinesChange(newLines)
                      }}
                    />
                  </td>
                  <td className="border border-gray-300 px-0 py-1 align-middle text-center">
                    <div className="flex items-center justify-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => moveLineUp(index)}
                        disabled={index === 0}
                        className="p-0.5 text-gray-600 hover:text-pink-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Monter la matière"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveLineDown(index)}
                        disabled={index === (formula.lines?.length ?? 0) - 1}
                        className="p-0.5 text-gray-600 hover:text-pink-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Descendre la matière"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteLine(index)}
                        className="p-0.5 text-red-600 hover:text-red-800"
                        title="Supprimer cette ligne"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ); })}
            </tbody>
          </table>
        </div>

        {/* Résumé */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <span className="text-gray-700">Total % de la formule :</span>
              <span className={`ml-2 font-semibold ${
                totalPercent > 100 ? 'text-red-600' : totalPercent === 100 ? 'text-green-600' : 'text-yellow-600'
              }`}>
                {totalPercent.toFixed(2)}%
              </span>
            </div>
            {qspLine && (
              <div>
                <span className="text-gray-700">QSP % :</span>
                <span className="ml-2 font-semibold text-pink-600">{qspPercent.toFixed(2)}%</span>
              </div>
            )}
            <div>
              <span className="text-gray-700">Prix au kg :</span>
              <span className="ml-2 font-semibold text-pink-600">{prixAuKg.toFixed(2)} €/kg</span>
            </div>
            <div>
              <span className="text-gray-700">Poids total de la formule :</span>
              <span className="ml-2 font-semibold text-pink-600">{formula.total_weight.toFixed(2)} g</span>
            </div>
          </div>

          {/* Totaux par phase */}
          {phaseTotals.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-300">
              <div className="flex flex-wrap gap-4 items-center">
                <span className="text-gray-700 font-medium">Totaux par phase :</span>
                {phaseTotals.map(({ phase, percent, grams, count, hasQsp }, index) => (
                  <div key={phase} className="flex items-center gap-2">
                    {index > 0 && <span className="text-gray-400">•</span>}
                    <span className={`font-semibold ${hasQsp ? 'text-pink-600' : 'text-gray-700'}`}>
                      {hasQsp ? 'QSP' : `Phase ${phase}`}:
                    </span>
                    <span className="text-gray-900">
                      {percent.toFixed(2)}% ({grams.toFixed(2)} g)
                    </span>
                    <span className="text-sm text-gray-500">
                      ({count} matière{count > 1 ? 's' : ''})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {totalPercent !== 100 && (formula.lines?.length ?? 0) > 0 && (
            <div className="mt-4 text-yellow-600">
              ⚠️ La somme des pourcentages n'est pas égale à 100% (Total: {totalPercent.toFixed(2)}%)
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
