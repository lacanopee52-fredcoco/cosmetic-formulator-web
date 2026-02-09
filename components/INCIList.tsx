'use client'

import { useState, useEffect, useRef } from 'react'
import { FormulaLine } from '@/types'
import { createClient } from '@/lib/supabase/client'

interface INCIListProps {
  formulaLines: FormulaLine[]
}

interface INCILine {
  inci: string
  percent: number
  materials: Array<{ name: string; code: string; percent: number }>
  phase?: string
}

interface ParsedINCI {
  name: string
  percent: number
}

function parseINCIString(inciString: string): ParsedINCI[] {
  const trimmed = inciString.trim()
  if (!trimmed) return []

  const results: ParsedINCI[] = []
  
  // D'abord, séparer par retours à la ligne (chaque ligne = une matière potentielle)
  const lines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0)
  
  // Si une seule ligne sans séparateurs, la traiter comme une seule matière
  if (lines.length === 1 && !trimmed.includes(',') && !trimmed.includes('%') && !trimmed.includes('(') && !trimmed.includes(':')) {
    return [{ name: trimmed, percent: 100 }]
  }
  
  // Traiter chaque ligne séparément (chaque ligne = une matière avec son pourcentage)
  for (const line of lines) {
    // Format: "Nom (XX%)" ou "Nom: XX%" ou "Nom XX%"
    const matchParentheses = line.match(/^(.+?)\s*\(([\d.,]+)\s*%\)$/i)
    if (matchParentheses) {
      const name = matchParentheses[1].trim()
      const percent = parseFloat(matchParentheses[2].replace(',', '.'))
      if (name && !isNaN(percent)) {
        results.push({ name, percent })
        continue
      }
    }
    
    const matchColon = line.match(/^(.+?)\s*:\s*([\d.,]+)\s*%$/i)
    if (matchColon) {
      const name = matchColon[1].trim()
      const percent = parseFloat(matchColon[2].replace(',', '.'))
      if (name && !isNaN(percent)) {
        results.push({ name, percent })
        continue
      }
    }
    
    // Format: "Nom XX%" (le plus courant pour les retours à la ligne)
    const matchSpace = line.match(/^(.+?)\s+([\d.,]+)\s*%$/i)
    if (matchSpace) {
      const name = matchSpace[1].trim()
      const percent = parseFloat(matchSpace[2].replace(',', '.'))
      if (name && !isNaN(percent)) {
        results.push({ name, percent })
        continue
      }
    }
    
    // Si la ligne contient des virgules, la diviser aussi
    if (line.includes(',')) {
      const commaParts = line.split(',').map(p => p.trim()).filter(p => p.length > 0)
      for (const part of commaParts) {
        // Essayer les mêmes formats pour chaque partie séparée par virgule
        const partMatchParentheses = part.match(/^(.+?)\s*\(([\d.,]+)\s*%\)$/i)
        if (partMatchParentheses) {
          const name = partMatchParentheses[1].trim()
          const percent = parseFloat(partMatchParentheses[2].replace(',', '.'))
          if (name && !isNaN(percent)) {
            results.push({ name, percent })
            continue
          }
        }
        
        const partMatchSpace = part.match(/^(.+?)\s+([\d.,]+)\s*%$/i)
        if (partMatchSpace) {
          const name = partMatchSpace[1].trim()
          const percent = parseFloat(partMatchSpace[2].replace(',', '.'))
          if (name && !isNaN(percent)) {
            results.push({ name, percent })
            continue
          }
        }
        
        // Si pas de pourcentage trouvé, ajouter sans pourcentage (sera calculé plus tard)
        if (part.length > 0) {
          results.push({ name: part, percent: 0 })
        }
      }
      continue
    }
    
    // Si aucun format n'est reconnu mais que la ligne n'est pas vide
    if (line.length > 0) {
      results.push({ name: line, percent: 0 })
    }
  }
  
  // Si aucun pourcentage n'a été trouvé, répartir équitablement
  const hasPercentages = results.some(r => r.percent > 0)
  if (!hasPercentages && results.length > 0) {
    const equalPercent = 100 / results.length
    results.forEach(r => r.percent = equalPercent)
  }
  
  return results
}

export default function INCIList({ formulaLines }: INCIListProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [inciData, setInciData] = useState<INCILine[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    const loadINCI = async () => {
      const inciMap = new Map<string, INCILine>()

      for (const line of formulaLines) {
        if (!line.ingredient_code || line.is_qsp) continue

        try {
          const supabase = createClient()
          const { data: { user } } = await supabase.auth.getUser()

          if (!user) continue

          const { data: material } = await supabase
            .from('ingredients')
            .select('inci, fournisseur_principal')
            .eq('code', line.ingredient_code)
            .single()

          if (!material) {
            console.log(`[INCI] Matériau non trouvé pour ${line.ingredient_code}`)
            continue
          }

          try {
            // SOLUTION: Les colonnes sont inversées dans la base de données
            // La colonne 'inci' contient les fournisseurs (ex: "CRODA", "Cauvin", "Greentech")
            // La colonne 'fournisseur_principal' contient les INCI (ex: "Lactic Acid", "Salix Alba Bark Extract")
            // On utilise donc TOUJOURS 'fournisseur_principal' comme source INCI
            
            let inciString: string | null = null
            
            // PRIORITÉ 1: Utiliser fournisseur_principal (qui contient les vrais INCI)
            if (material.fournisseur_principal && material.fournisseur_principal.trim()) {
              inciString = material.fournisseur_principal.trim()
            }
            // PRIORITÉ 2: Si fournisseur_principal est vide, essayer inci (au cas où certaines données seraient correctes)
            else if (material.inci && material.inci.trim()) {
              inciString = material.inci.trim()
            }

            if (inciString) {
              const percentInFormula = line.percent || 0

              if (percentInFormula > 0) {
                const parsedINCIs = parseINCIString(inciString)
              
              if (parsedINCIs.length === 0) {
                const inciName = inciString
                const actualPercent = percentInFormula
                
                if (inciMap.has(inciName)) {
                  const existing = inciMap.get(inciName)!
                  existing.percent += actualPercent
                  existing.materials.push({
                    name: line.ingredient_name || line.ingredient_code,
                    code: line.ingredient_code,
                    percent: actualPercent
                  })
                } else {
                  inciMap.set(inciName, {
                    inci: inciName,
                    percent: actualPercent,
                    materials: [{
                      name: line.ingredient_name || line.ingredient_code,
                      code: line.ingredient_code,
                      percent: actualPercent
                    }],
                    phase: line.phase || undefined
                  })
                }
              } else {
                for (const parsedINCI of parsedINCIs) {
                  const actualPercent = parsedINCI.percent > 0 
                    ? (parsedINCI.percent * percentInFormula / 100)
                    : percentInFormula
                  
                  if (actualPercent > 0) {
                    const inciName = parsedINCI.name.trim()
                    
                    if (inciMap.has(inciName)) {
                      const existing = inciMap.get(inciName)!
                      existing.percent += actualPercent
                      existing.materials.push({
                        name: line.ingredient_name || line.ingredient_code,
                        code: line.ingredient_code,
                        percent: actualPercent
                      })
                    } else {
                      inciMap.set(inciName, {
                        inci: inciName,
                        percent: actualPercent,
                        materials: [{
                          name: line.ingredient_name || line.ingredient_code,
                          code: line.ingredient_code,
                          percent: actualPercent
                        }],
                        phase: line.phase || undefined
                      })
                    }
                  }
                }
              }
            }
          }
          } catch (err) {
            console.error(`Erreur chargement INCI pour ${line.ingredient_code}:`, err)
          }
        } catch (err) {
          console.error('Erreur chargement INCI:', err)
        }
      }

      const sorted = Array.from(inciMap.values()).sort((a, b) => b.percent - a.percent)
      setInciData(sorted)
    }

    loadINCI()
  }, [formulaLines])

  if (inciData.length === 0) {
    return (
      <button className="px-4 py-2 bg-gray-100 text-gray-500 rounded-lg cursor-not-allowed" disabled>
        📝 Liste INCI
      </button>
    )
  }

  return (
    <div className="relative" ref={containerRef}>
      <button 
        className="px-4 py-2 bg-pink-100 text-pink-700 rounded-lg font-medium hover:bg-pink-200 transition-colors flex items-center gap-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>📝</span>
        <span>Liste INCI</span>
        <span className="bg-pink-600 text-white px-2 py-0.5 rounded text-xs">{inciData.length}</span>
        <span>{isOpen ? '▼' : '▶'}</span>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-[600px] bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-h-96 overflow-y-auto">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-pink-600 mb-1">📝 Liste INCI de la Formule</h3>
            <p className="text-sm text-gray-600">Formulation avec les noms INCI et pourcentages</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 text-sm">
              <thead>
                <tr className="bg-pink-100">
                  <th className="border border-gray-300 px-3 py-2 text-left">Phase</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">Nom INCI</th>
                  <th className="border border-gray-300 px-3 py-2 text-right">%</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">Matières contributrices</th>
                </tr>
              </thead>
              <tbody>
                {inciData.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-3 py-2">
                      {item.phase ? (
                        <span className="font-semibold text-gray-700">{item.phase}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="border border-gray-300 px-3 py-2">
                      <span className="font-medium text-gray-900">{item.inci}</span>
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-right">
                      <span className="font-semibold text-pink-600">{item.percent.toFixed(2)}%</span>
                    </td>
                    <td className="border border-gray-300 px-3 py-2">
                      {item.materials.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {item.materials.map((mat, idx) => (
                            <span key={idx} className="text-xs bg-pink-50 text-pink-700 px-2 py-0.5 rounded">
                              {mat.name} ({mat.code}): {mat.percent.toFixed(2)}%
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between">
              <span className="font-medium text-gray-700">Total INCI :</span>
              <span className="font-semibold text-pink-600">
                {inciData.reduce((sum, item) => sum + item.percent, 0).toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
