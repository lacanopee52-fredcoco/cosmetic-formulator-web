'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export type PackagingItem = { description: string; prix_unitaire: number }

function normalizeForSearch(s: string): string {
  return (s || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
}

interface PackagingAutocompleteProps {
  value: string
  prixUnitaire: number
  onSelect: (item: PackagingItem) => void
  placeholder?: string
}

export default function PackagingAutocomplete({
  value,
  prixUnitaire,
  onSelect,
  placeholder = 'Rechercher…',
}: PackagingAutocompleteProps) {
  const [query, setQuery] = useState(value)
  const [suggestions, setSuggestions] = useState<PackagingItem[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (value) setQuery(value)
  }, [value])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const [searchDone, setSearchDone] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const searchPackaging = async (searchQuery: string) => {
    try {
      setLoadError(null)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: rawData, error } = await supabase
        .from('packaging')
        .select('description, prix_unitaire')
        .eq('user_id', user.id)
        .limit(400)

      if (error) {
        setSuggestions([])
        setShowSuggestions(false)
        setSearchDone(true)
        if (/does not exist|relation.*not found/i.test(String(error.message))) {
          setLoadError('Table "packaging" absente. Exécutez la migration Supabase puis réimportez.')
        } else {
          setLoadError(error.message || 'Erreur chargement')
          console.warn('Recherche emballage:', error.message)
        }
        return
      }

      const list = (rawData || []) as PackagingItem[]
      setSearchDone(true)
      const normalizedQuery = normalizeForSearch(searchQuery)
      const filtered = normalizedQuery
        ? list.filter((i) => normalizeForSearch(i.description || '').includes(normalizedQuery))
        : list
      setSuggestions(filtered.slice(0, 20))
      setShowSuggestions(filtered.length > 0)
      setSelectedIndex(-1)
      if (list.length === 0 && !loadError) {
        setLoadError('Aucune donnée. Importez un Excel avec une feuille "Emballages" (colonnes Description emballage, Prix unitaire) depuis Importer Matières.')
      }
    } catch (err) {
      setSuggestions([])
      setShowSuggestions(false)
      setSearchDone(true)
      setLoadError('Erreur de connexion')
      console.error(err)
    }
  }

  useEffect(() => {
    if (showSuggestions && inputRef.current) {
      const updatePosition = () => {
        if (inputRef.current) {
          const rect = inputRef.current.getBoundingClientRect()
          setPosition({ top: rect.bottom + 4, left: rect.left, width: Math.min(rect.width, 400) })
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

  const handleSelect = (item: PackagingItem) => {
    setQuery(item.description)
    onSelect(item)
    setShowSuggestions(false)
    setSelectedIndex(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelect(suggestions[selectedIndex])
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        break
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            const v = e.target.value
            setQuery(v)
            searchPackaging(v)
          }}
          onFocus={() => {
            setShowSuggestions(true)
            if (suggestions.length === 0 && !searchDone) searchPackaging(query || ' ')
          }}
          onKeyDown={handleKeyDown}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
          placeholder={placeholder}
        />
        {prixUnitaire > 0 && (
          <span className="shrink-0 text-sm font-medium text-gray-700 w-20 text-right">
            {prixUnitaire.toFixed(2)} €
          </span>
        )}
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <div
          className="fixed z-[9999] bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto"
          style={{ top: position.top, left: position.left, width: position.width }}
        >
          {suggestions.map((item, index) => (
            <div
              key={`${item.description}-${index}`}
              className={`px-3 py-2 cursor-pointer text-sm ${
                index === selectedIndex ? 'bg-pink-100' : 'hover:bg-pink-50'
              }`}
              onClick={() => handleSelect(item)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="font-medium text-gray-900">{item.description}</div>
              <div className="text-xs text-gray-500">{item.prix_unitaire.toFixed(2)} €</div>
            </div>
          ))}
        </div>
      )}
      {showSuggestions && searchDone && suggestions.length === 0 && (
        <div
          className="fixed z-[9999] bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-sm text-gray-600 max-w-xs"
          style={{ top: position.top, left: position.left, width: Math.max(position.width, 280) }}
        >
          {loadError || 'Aucun article trouvé. Tapez pour filtrer.'}
        </div>
      )}
    </div>
  )
}
