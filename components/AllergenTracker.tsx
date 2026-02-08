'use client'

import { useState, useEffect, useRef } from 'react'
import { FormulaLine } from '@/types'
import { createClient } from '@/lib/supabase/client'

interface AllergenTrackerProps {
  formulaLines: FormulaLine[]
}

interface AllergenSummary {
  name: string
  totalPercent: number
  materials: Array<{ code: string; name: string; percent: number; allergenPercent: number }>
}

const PANEL_MIN_H = 200
const PANEL_MAX_H = 600
const PANEL_DEFAULT_H = 384
const RESIZE_HANDLE_H = 24

export default function AllergenTracker({ formulaLines }: AllergenTrackerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedAllergen, setSelectedAllergen] = useState<string | null>(null)
  const [allergenData, setAllergenData] = useState<AllergenSummary[]>([])
  const [panelHeight, setPanelHeight] = useState(PANEL_DEFAULT_H)
  const containerRef = useRef<HTMLDivElement>(null)
  const resizeStartY = useRef(0)
  const resizeStartH = useRef(PANEL_DEFAULT_H)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Redimensionnement vers le bas : glisser la poignée du bas
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    resizeStartY.current = e.clientY
    resizeStartH.current = panelHeight
    document.body.style.cursor = 'ns-resize'
    document.body.style.userSelect = 'none'
    const onMouseMove = (ev: MouseEvent) => {
      const dy = ev.clientY - resizeStartY.current
      setPanelHeight(Math.max(PANEL_MIN_H, Math.min(PANEL_MAX_H, resizeStartH.current + dy)))
    }
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  useEffect(() => {
    const loadAllergens = async () => {
      // Même logique que la version Mac : pour chaque ligne de formule, on récupère les allergènes
      // de la matière, puis on cumule : contribution = (percentInFormula * allergenPercent) / 100
      const allergenMap = new Map<string, AllergenSummary>()

      for (const line of formulaLines) {
        const code = (line.ingredient_code || '').trim()
        if (!code || line.is_qsp) continue

        try {
          const supabase = createClient()
          const { data: { user } } = await supabase.auth.getUser()

          if (!user) continue

          // Récupérer les allergènes pour cet ingrédient (liaison par code = code Allergènes 81)
          const { data: allergens } = await supabase
            .from('allergens')
            .select('allergen_name, percentage')
            .eq('ingredient_code', code)
            .eq('user_id', user.id)

          if (allergens && allergens.length > 0) {
            const percentInFormula = line.percent || 0

            for (const allergen of allergens) {
              const allergenName = allergen.allergen_name
              const allergenPercent = allergen.percentage || 0

              if (!allergenMap.has(allergenName)) {
                allergenMap.set(allergenName, {
                  name: allergenName,
                  totalPercent: 0,
                  materials: []
                })
              }

              const summary = allergenMap.get(allergenName)!
              const contribution = (percentInFormula * allergenPercent) / 100

              summary.totalPercent += contribution
              summary.materials.push({
                code,
                name: line.ingredient_name,
                percent: percentInFormula,
                allergenPercent: allergenPercent
              })
            }
          }
        } catch (err) {
          console.error('Erreur chargement allergènes:', err)
        }
      }

      const sorted = Array.from(allergenMap.values())
        .filter(a => a.totalPercent > 0)
        .sort((a, b) => b.totalPercent - a.totalPercent)

      setAllergenData(sorted)
    }

    loadAllergens()
  }, [formulaLines])

  const selectedData = allergenData.find(a => a.name === selectedAllergen)
  const hasAllergens = allergenData.length > 0

  return (
    <div className="relative" ref={containerRef}>
      <button 
        type="button"
        className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
          hasAllergens 
            ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' 
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>⚠️</span>
        <span>Allergènes</span>
        {hasAllergens && (
          <span className="bg-yellow-600 text-white px-2 py-0.5 rounded text-xs">{allergenData.length}</span>
        )}
        <span>{isOpen ? '▼' : '▶'}</span>
      </button>

      {isOpen && (
        <div
          className="absolute z-50 mt-2 w-96 bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden"
          style={{ height: panelHeight }}
        >
          <div
            className="overflow-y-auto p-4 bg-white"
            style={{ height: panelHeight - RESIZE_HANDLE_H }}
          >
            <div className="mb-4">
              <h3 className="text-lg font-bold text-yellow-700 mb-1">⚠️ Allergènes dans la Formule</h3>
              <p className="text-sm text-gray-600">Pourcentages cumulés par allergène</p>
            </div>

            {!hasAllergens ? (
            <div className="text-gray-500 text-sm py-4 space-y-2">
              <p>
                Aucun allergène détecté dans cette formule.
              </p>
              <p>
                Les allergènes viennent de l’onglet « Allergènes 81 » (liaison par code matière). Si une matière (ex. MP515B) figure dans Allergènes 81 mais n’apparaît pas ici :
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
                <li>Vérifiez que l’import a été fait pour <strong>votre compte</strong> (même user que la session).</li>
                <li>Dans un terminal : <code className="bg-gray-100 px-1 rounded">npx tsx scripts/diagnostic-allergenes.ts MP515B</code></li>
              </ul>
            </div>
          ) : (
          <div className="space-y-2">
            {allergenData.map((allergen) => (
              <div
                key={allergen.name}
                className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                  selectedAllergen === allergen.name
                    ? 'border-yellow-500 bg-yellow-50'
                    : 'border-gray-200 hover:border-yellow-300 hover:bg-yellow-50'
                }`}
                onClick={() => setSelectedAllergen(
                  selectedAllergen === allergen.name ? null : allergen.name
                )}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{allergen.name}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {allergen.materials.length} matière{allergen.materials.length > 1 ? 's' : ''} concernée{allergen.materials.length > 1 ? 's' : ''}
                    </div>
                  </div>
                  <span className="font-bold text-yellow-700 ml-2">
                    {allergen.totalPercent.toFixed(3)}%
                  </span>
                </div>
                
                {selectedAllergen === allergen.name && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="text-xs font-medium text-gray-700 mb-2">Matières premières :</div>
                    <div className="space-y-1">
                      {allergen.materials.map((mat, idx) => (
                        <div key={idx} className="text-xs text-gray-600">
                          • {mat.name} ({mat.code}): {mat.percent.toFixed(2)}% dans formule × {mat.allergenPercent.toFixed(2)}% = {(mat.percent * mat.allergenPercent / 100).toFixed(3)}%
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          )}
          </div>
          <div
            role="separator"
            aria-label="Redimensionner la fenêtre"
            onMouseDown={handleResizeStart}
            className="w-full cursor-ns-resize border-t border-gray-300 bg-gray-100 hover:bg-yellow-100 flex items-center justify-center flex-shrink-0 text-gray-500 text-xs select-none"
            style={{ height: RESIZE_HANDLE_H }}
          >
            ⋮ Glisser pour agrandir
          </div>
        </div>
      )}
    </div>
  )
}
