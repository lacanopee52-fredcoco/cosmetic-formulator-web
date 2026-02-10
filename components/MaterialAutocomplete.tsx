'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Ingredient } from '@/types'
import { createClient } from '@/lib/supabase/client'

/** Retourne la chaîne sans accents pour recherche insensible aux accents (ex: "émulsifiant" → "emulsifiant") */
function normalizeForSearch(s: string): string {
  return (s || '')
    .trim()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
}

/** Pour la recherche par code : enlever tirets, espaces, pour matcher "ECHAMB" avec "ECH-AMB002" */
function normalizeCodeForSearch(s: string): string {
  return normalizeForSearch(s).replace(/[\s\-_\.]/g, '')
}

/** Correspondance exacte sur le code (après normalisation) pour prioriser dans les suggestions */
function codeMatchesExactly(code: string | null | undefined, query: string): boolean {
  if (!query.trim()) return false
  const a = normalizeCodeForSearch(code || '')
  const b = normalizeCodeForSearch(query)
  return a.length > 0 && (a === b || a.startsWith(b) || b.startsWith(a))
}

interface MaterialAutocompleteProps {
  value: string
  onSelect: (material: Ingredient) => void
  onCodeClick?: () => void
  refreshTrigger?: number
  /** Mode compact pour tableau : champs moins hauts */
  compact?: boolean
  /** Masquer le badge code à droite (afficher uniquement le nom) */
  hideCodeBadge?: boolean
  /** Afficher ce code à droite du nom (prioritaire sur l'extraction depuis value) */
  displayCode?: string
}

export default function MaterialAutocomplete({ value, onSelect, onCodeClick, refreshTrigger, compact, hideCodeBadge, displayCode }: MaterialAutocompleteProps) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Ingredient[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [isSample, setIsSample] = useState(false)
  const [enStock, setEnStock] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (value) {
      setQuery(value)
    }
  }, [value])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const searchMaterials = async (searchQuery: string) => {
    const trimmed = (searchQuery || '').trim()
    if (trimmed.length < 1) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    try {
      const supabase = createClient()
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        if (userError) console.error('Erreur authentification:', userError)
        return
      }

      // Deux requêtes (code + nom) puis fusion : évite les pièges du .or() avec pattern
      const pattern = `%${trimmed}%`
      const [resCode, resNom] = await Promise.all([
        supabase.from('ingredients').select('*').ilike('code', pattern).order('code', { ascending: true }).limit(80),
        supabase.from('ingredients').select('*').ilike('nom', pattern).order('nom', { ascending: true }).limit(80),
      ])
      if (resCode.error) {
        console.error('❌ Erreur recherche matières (code):', resCode.error)
        setSuggestions([])
        setShowSuggestions(false)
        return
      }
      if (resNom.error) {
        console.error('❌ Erreur recherche matières (nom):', resNom.error)
        setSuggestions([])
        setShowSuggestions(false)
        return
      }
      const byCode = (resCode.data || []) as Ingredient[]
      const byNom = (resNom.data || []) as Ingredient[]
      const seen = new Set<string>()
      const list: Ingredient[] = []
      for (const i of [...byCode, ...byNom]) {
        const key = `${(i as Record<string, unknown>)['organization_id'] ?? ''}-${i.code ?? ''}`
        if (!seen.has(key)) {
          seen.add(key)
          list.push(i)
        }
      }

      const normalizedQueryCode = normalizeCodeForSearch(trimmed)
      const looksLikeCode = /^[A-Za-z0-9\-_\s\.]+$/.test(trimmed) && trimmed.length >= 2

      // Quand la saisie ressemble à un code (ex. MP5) : d’abord les codes qui commencent par la saisie, triés par code (MP500, MP501…), puis le reste par nom
      let data: Ingredient[]
      if (looksLikeCode && normalizedQueryCode.length >= 2) {
        const codeStarts = list.filter((i) => normalizeCodeForSearch((i.code || '').trim()).startsWith(normalizedQueryCode))
        const rest = list.filter((i) => !normalizeCodeForSearch((i.code || '').trim()).startsWith(normalizedQueryCode))
        const sortedCodeStarts = [...codeStarts].sort((a, b) => {
          const ca = (a.code || '').trim()
          const cb = (b.code || '').trim()
          return ca.localeCompare(cb, undefined, { numeric: true })
        })
        const sortedRest = [...rest].sort((a, b) => (a.nom || '').localeCompare(b.nom || '', undefined, { sensitivity: 'base' }))
        data = [...sortedCodeStarts, ...sortedRest].slice(0, 50)
      } else {
        const sorted = [...list].sort((a, b) => {
          const codeA = (a.code || '').trim()
          const codeB = (b.code || '').trim()
          const exactA = codeMatchesExactly(codeA, trimmed)
          const exactB = codeMatchesExactly(codeB, trimmed)
          if (exactA && !exactB) return -1
          if (!exactA && exactB) return 1
          return (a.nom || '').localeCompare(b.nom || '', undefined, { sensitivity: 'base' })
        })
        data = sorted.slice(0, 50)
      }

      setSuggestions(data)
      setShowSuggestions(data.length > 0)
      setSelectedIndex(-1)

      // Une seule matière avec code exact : sélection automatique (reconnaissance directe)
      const exactCodeMatch = data.find(
        (i) => normalizeCodeForSearch((i.code || '').trim()) === normalizeCodeForSearch(trimmed)
      )
      if (exactCodeMatch) {
        setQuery(hideCodeBadge ? exactCodeMatch.nom : `${exactCodeMatch.nom} (${exactCodeMatch.code})`)
        onSelect(exactCodeMatch)
        setShowSuggestions(false)
      }
    } catch (error) {
      console.error('❌ Erreur recherche matières:', error)
    }
  }

  /** Tente de reconnaître la saisie comme un code (suggestions puis API) et appelle onSelect si trouvé. */
  const resolveByCode = useCallback(async (trimmedInput: string) => {
    const trimmed = (trimmedInput || '').trim()
    if (!trimmed) return false
    const normQuery = normalizeCodeForSearch(trimmed)
    const fromSuggestions = suggestions.find(
      (i) => normalizeCodeForSearch((i.code || '').trim()) === normQuery
    )
    if (fromSuggestions) {
      setQuery(hideCodeBadge ? fromSuggestions.nom : `${fromSuggestions.nom} (${fromSuggestions.code})`)
      onSelect(fromSuggestions)
      setShowSuggestions(false)
      return true
    }
    try {
      const res = await fetch(`/api/ingredients/resolve-code?code=${encodeURIComponent(trimmed)}`)
      const json = await res.json()
      if (json.found && json.ingredient) {
        const ingredient = json.ingredient as Ingredient
        setQuery(hideCodeBadge ? ingredient.nom : `${ingredient.nom} (${ingredient.code})`)
        onSelect(ingredient)
        setShowSuggestions(false)
        return true
      }
    } catch (err) {
      if (typeof window !== 'undefined') console.warn('[Matière] Erreur recherche:', err)
    }
    setShowSuggestions(false)
    return false
  }, [suggestions, hideCodeBadge, onSelect])

  const handleBlur = async () => {
    const trimmed = (query || '').trim()
    if (!trimmed) return
    if (!hideCodeBadge && /\([^)]+\)$/.test(query)) return
    const normQuery = normalizeCodeForSearch(trimmed)
    if (displayCode && normalizeCodeForSearch(displayCode) === normQuery) return
    await resolveByCode(trimmed)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value
    setQuery(newQuery)
    
    if (newQuery.length >= 1) {
      searchMaterials(newQuery)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }

  // Afficher les suggestions quand elles arrivent
  useEffect(() => {
    if (suggestions.length > 0 && query.length >= 1) {
      setShowSuggestions(true)
    }
  }, [suggestions, query])

  // Mettre à jour la position du menu déroulant (position: fixed = coordonnées viewport, sans scroll)
  useEffect(() => {
    if (showSuggestions && inputRef.current) {
      const updatePosition = () => {
        if (inputRef.current) {
          const rect = inputRef.current.getBoundingClientRect()
          setPosition({
            top: rect.bottom + 4,
            left: rect.left,
            width: Math.min(rect.width, 500)
          })
        }
      }
      
      updatePosition()
      window.addEventListener('scroll', updatePosition, true)
      window.addEventListener('resize', updatePosition)
      
      return () => {
        window.removeEventListener('scroll', updatePosition, true)
        window.removeEventListener('resize', updatePosition)
      }
    }
  }, [showSuggestions, suggestions])

  const handleSelect = (material: Ingredient) => {
    setQuery(hideCodeBadge ? material.nom : `${material.nom} (${material.code})`)
    onSelect(material)
    setShowSuggestions(false)
    setSelectedIndex(-1)
  }

  const looksLikeCode = (s: string) => /^[A-Za-z0-9\-_\s\.]+$/.test((s || '').trim()) && (s || '').trim().length >= 2

  const [resolving, setResolving] = useState(false)
  const handleValidateCode = async () => {
    const t = (query || '').trim()
    if (!t || t.length < 2) return
    setResolving(true)
    try {
      await resolveByCode(t)
    } finally {
      setResolving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        if (showSuggestions && suggestions.length > 0) {
          e.preventDefault()
          setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev))
        }
        break
      case 'ArrowUp':
        if (showSuggestions && suggestions.length > 0) {
          e.preventDefault()
          setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1))
        }
        break
      case 'Enter': {
        e.preventDefault()
        if (showSuggestions && suggestions.length > 0 && selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelect(suggestions[selectedIndex])
          return
        }
        const trimmed = (query || '').trim()
        if (trimmed && looksLikeCode(trimmed)) {
          resolveByCode(trimmed)
        }
        break
      }
      case 'Escape':
        setShowSuggestions(false)
        break
    }
  }

  const handleCodeClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onCodeClick) {
      onCodeClick()
    }
  }

  // Extraire le code depuis la valeur affichée, ou utiliser displayCode
  const displayValue = value || query
  const codeMatch = displayValue.match(/\(([^)]+)\)$/)
  const codeFromValue = codeMatch ? codeMatch[1] : null
  const code = displayCode ?? codeFromValue

  // Charger l'information en_stock quand le code change
  useEffect(() => {
    const loadMaterialInfo = async () => {
      if (code) {
        try {
          const supabase = createClient()
          const { data: { user } } = await supabase.auth.getUser()

          if (!user) return

          const { data } = await supabase
            .from('ingredients')
            .select('en_stock')
            .eq('code', code)
            .single()

          setEnStock(data?.en_stock || false)
          setIsSample(false) // TODO: Ajouter is_sample dans la table ingredients si nécessaire
        } catch (error) {
          setIsSample(false)
          setEnStock(false)
        }
      } else {
        setIsSample(false)
        setEnStock(false)
      }
    }
    loadMaterialInfo()
  }, [code, refreshTrigger])

  const inputPad = compact ? 'py-1 text-sm' : 'py-2'
  const badgePad = compact ? 'px-2 py-0.5 text-xs' : 'px-3 py-2 text-sm'

  return (
    <div className="relative" ref={containerRef}>
      <div className={`flex items-center gap-2 ${compact ? 'gap-1' : ''}`}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (query.length >= 1 && suggestions.length > 0) {
              setShowSuggestions(true)
            }
          }}
          className={`flex-1 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent ${inputPad}`}
          placeholder="Rechercher une matière première..."
        />
        {(query || '').trim().length >= 1 && !(displayCode && normalizeCodeForSearch((query || '').trim()) === normalizeCodeForSearch(displayCode)) && (
          <button
            type="button"
            onClick={handleValidateCode}
            disabled={resolving || (query || '').trim().length < 2}
            className={`shrink-0 min-w-[5rem] rounded-lg font-medium transition-colors ${compact ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'} bg-pink-600 text-white hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed`}
            title="Reconnaître la matière par ce code (ex. MP500)"
          >
            {resolving ? '…' : 'Valider le code'}
          </button>
        )}
        {(code || displayCode) && !hideCodeBadge && (
          <span 
            className={`shrink-0 rounded-lg font-mono cursor-pointer transition-colors ${badgePad} ${
              isSample 
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                : enStock 
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={handleCodeClick}
            title="Cliquer pour voir la fiche"
          >
            {displayCode ?? code}
          </span>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div 
          ref={suggestionsRef}
          className="fixed z-[9999] bg-white border border-gray-300 rounded-lg shadow-2xl max-h-60 overflow-y-auto"
          style={{ 
            top: `${position.top}px`,
            left: `${position.left}px`,
            width: `${position.width}px`
          }}
        >
          {suggestions.map((material, index) => (
            <div
              key={material.code}
              className={`px-4 py-2 cursor-pointer hover:bg-pink-50 ${
                index === selectedIndex ? 'bg-pink-100' : ''
              }`}
              onClick={() => handleSelect(material)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="font-medium text-gray-900">{material.nom}</div>
              <div className="text-sm text-gray-500">{material.code}</div>
            </div>
          ))}
        </div>
      )}

      {showSuggestions && suggestions.length === 0 && query.length >= 1 && (
        <div 
          className="fixed z-[9999] bg-white border border-gray-300 rounded-lg shadow-2xl"
          style={{ 
            top: `${position.top}px`,
            left: `${position.left}px`,
            width: `${position.width}px`
          }}
        >
          <div className="px-4 py-2 text-gray-500 text-center">
            Aucune matière première trouvée
          </div>
        </div>
      )}
    </div>
  )
}
