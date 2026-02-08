'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { Formula, FormulaLine } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { useOrganizationId } from '@/contexts/OrganizationContext'
import Link from 'next/link'

type LineKey = string

/** Identifiant unique d'une ligne (code ou nom) */
function lineKey(l: FormulaLine): LineKey {
  return (l.ingredient_code || '').trim() || (l.ingredient_name || '').trim() || String(l.id ?? '')
}

/** Compare deux lignes (même ingrédient) : true si identiques (phase, %, g) */
function lineEquals(a: FormulaLine, b: FormulaLine): boolean {
  return (
    (a.phase || '').trim() === (b.phase || '').trim() &&
    Number(a.percent) === Number(b.percent) &&
    Number(a.grams) === Number(b.grams) &&
    (a.ingredient_code || '').trim() === (b.ingredient_code || '').trim() &&
    (a.ingredient_name || '').trim() === (b.ingredient_name || '').trim()
  )
}


export default function CompareVersionsPage() {
  const searchParams = useSearchParams()
  const organizationId = useOrganizationId()
  const preselectedName = searchParams.get('name')

  const [formulas, setFormulas] = useState<Formula[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  /** Familles : nom de formule → list de formules (avec au moins 2 versions) */
  const [families, setFamilies] = useState<Map<string, Formula[]>>(new Map())
  /** Nom de formule sélectionné pour le rapport */
  const [selectedName, setSelectedName] = useState<string | null>(null)
  /** Versions sélectionnées (par id) pour la comparaison */
  const [selectedVersionIds, setSelectedVersionIds] = useState<Set<number>>(new Set())
  /** Version de référence (par id) */
  const [referenceVersionId, setReferenceVersionId] = useState<number | null>(null)

  useEffect(() => {
    if (organizationId) loadFormulas()
  }, [organizationId])

  useEffect(() => {
    if (preselectedName && families.has(preselectedName)) {
      setSelectedName(preselectedName)
    }
  }, [preselectedName, families])

  const loadFormulas = async () => {
    try {
      setLoading(true)
      setError(null)
      if (!organizationId) {
        setError('Organisation introuvable')
        return
      }
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Utilisateur non authentifié')
        return
      }
      const { data, error: fetchError } = await supabase
        .from('formulas')
        .select(`*, lines:formula_lines(*)`)
        .eq('organization_id', organizationId)
        .order('updated_at', { ascending: false })

      if (fetchError) throw new Error(fetchError.message)

      const list: Formula[] = (data || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        version: f.version || '',
        formulator: f.formulator || '',
        total_weight: f.total_weight ?? 1000,
        notes: f.notes || {},
        stability: f.stability || { days: [] },
        image: f.image,
        improvement_goal: f.improvement_goal || '',
        lines: (f.lines || []).map((l: any) => ({
          id: l.id,
          phase: l.phase,
          ingredient_code: l.ingredient_code,
          ingredient_name: l.ingredient_name,
          percent: l.percent,
          grams: l.grams,
          notes: l.notes || '',
          is_qsp: l.is_qsp || false,
          prix_au_kilo: l.prix_au_kilo,
        })),
        created_at: f.created_at,
        updated_at: f.updated_at,
      }))

      setFormulas(list)

      const byName = new Map<string, Formula[]>()
      list.forEach((f) => {
        const name = (f.name || '').trim() || 'Sans nom'
        if (!byName.has(name)) byName.set(name, [])
        byName.get(name)!.push(f)
      })
      const multi = new Map<string, Formula[]>()
      byName.forEach((arr, name) => {
        if (arr.length >= 2) {
          const sorted = [...arr].sort((a, b) => {
            const va = (a.version || '').trim()
            const vb = (b.version || '').trim()
            const na = parseInt(va, 10)
            const nb = parseInt(vb, 10)
            if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb
            return (va || '').localeCompare(vb || '')
          })
          multi.set(name, sorted)
        }
      })
      setFamilies(multi)
      if (selectedName === null && multi.size > 0 && !preselectedName) {
        setSelectedName(multi.keys().next().value ?? null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement')
    } finally {
      setLoading(false)
    }
  }

  const versions = selectedName ? (families.get(selectedName) || []) : []
  const familyNames = Array.from(families.keys()).sort()
  const selectedVersions = useMemo(
    () => versions.filter((v) => (v.id ? selectedVersionIds.has(v.id) : false)),
    [versions, selectedVersionIds]
  )

  // Quand on change de formule (famille), sélectionner toutes les versions par défaut
  useEffect(() => {
    if (!selectedName) {
      setSelectedVersionIds(new Set())
      setReferenceVersionId(null)
      return
    }
    const list = families.get(selectedName) || []
    const ids = new Set<number>()
    list.forEach((v) => {
      if (v.id) ids.add(v.id)
    })
    setSelectedVersionIds(ids)
    // Référence par défaut = première version (triée)
    const firstId = list.find((v) => typeof v.id === 'number')?.id ?? null
    setReferenceVersionId(firstId)
  }, [selectedName, families])

  // Si la référence n'est plus sélectionnée, en choisir une autre parmi les versions sélectionnées
  useEffect(() => {
    if (selectedVersions.length === 0) return
    if (referenceVersionId === null) {
      const firstSelected = selectedVersions.find((v) => typeof v.id === 'number')?.id ?? null
      if (firstSelected !== null) setReferenceVersionId(firstSelected)
      return
    }
    const stillSelected = selectedVersionIds.has(referenceVersionId)
    if (!stillSelected) {
      const firstSelected = selectedVersions.find((v) => typeof v.id === 'number')?.id ?? null
      setReferenceVersionId(firstSelected)
    }
  }, [referenceVersionId, selectedVersionIds, selectedVersions])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <Link
              href="/dashboard/formulas"
              className="text-pink-600 hover:text-pink-700 font-medium"
            >
              ← Formules
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">
              Rapport de comparaison des versions
            </h1>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-800 border border-red-300 rounded-lg">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-gray-600">Chargement…</p>
        ) : familyNames.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-gray-600">
            Aucune formule avec plusieurs versions. Créez plusieurs versions d&apos;une même formule (même nom, versions différentes) pour voir le rapport.
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <label className="font-medium text-gray-700">Formule à comparer :</label>
              <select
                value={selectedName ?? ''}
                onChange={(e) => setSelectedName(e.target.value || null)}
                className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              >
                {familyNames.map((name) => (
                  <option key={name} value={name}>
                    {name} ({families.get(name)!.length} version{families.get(name)!.length > 1 ? 's' : ''})
                  </option>
                ))}
              </select>
            </div>

            {versions.length >= 2 && (
              <>
                <div className="mb-6 bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                    <div className="font-medium text-gray-800">Versions à comparer</div>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          const ids = new Set<number>()
                          versions.forEach((v) => {
                            if (v.id) ids.add(v.id)
                          })
                          setSelectedVersionIds(ids)
                        }}
                        className="px-3 py-1.5 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm font-medium"
                      >
                        Tout sélectionner
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedVersionIds(new Set())}
                        className="px-3 py-1.5 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm font-medium"
                      >
                        Tout désélectionner
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {versions.map((v, idx) => {
                      const id = v.id
                      if (!id) return null
                      const checked = selectedVersionIds.has(id)
                      return (
                        <label key={id} className="flex items-center gap-2 px-3 py-2 rounded border border-gray-200 bg-gray-50">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              setSelectedVersionIds((prev) => {
                                const next = new Set(prev)
                                if (e.target.checked) next.add(id)
                                else next.delete(id)
                                return next
                              })
                            }}
                          />
                          <span className="text-sm text-gray-800 font-medium">
                            Version {v.version || idx + 1}
                          </span>
                        </label>
                      )
                    })}
                  </div>

                  {selectedVersions.length < 2 && (
                    <div className="mt-3 text-sm text-red-700">
                      Sélectionnez au moins 2 versions pour afficher la comparaison.
                    </div>
                  )}
                </div>

                {selectedVersions.length >= 2 && (
                  <>
                    <div className="mb-6 bg-white rounded-lg border border-gray-200 p-4">
                      <div className="font-medium text-gray-800 mb-2">Version de référence</div>
                      <div className="flex flex-wrap gap-3">
                        {selectedVersions.map((v, idx) => {
                          const id = v.id
                          if (!id) return null
                          return (
                            <label key={id} className="flex items-center gap-2 px-3 py-2 rounded border border-gray-200 bg-gray-50">
                              <input
                                type="radio"
                                name="referenceVersion"
                                checked={referenceVersionId === id}
                                onChange={() => setReferenceVersionId(id)}
                              />
                              <span className="text-sm text-gray-800 font-medium">
                                Version {v.version || idx + 1}
                              </span>
                            </label>
                          )
                        })}
                      </div>
                      <div className="mt-2 text-sm text-gray-600">
                        Les cellules seront surlignées en <span className="font-semibold text-red-700">rouge</span> lorsqu&apos;elles diffèrent de la version de référence.
                      </div>
                    </div>

                    {referenceVersionId !== null && (
                      <ComparisonReport versions={selectedVersions} referenceVersionId={referenceVersionId} />
                    )}
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function ComparisonReport({ versions, referenceVersionId }: { versions: Formula[]; referenceVersionId: number }) {
  const paramLabels: { key: keyof Formula | string; label: string; get: (f: Formula) => string }[] = [
    { key: 'version', label: 'Version', get: (f) => f.version || '—' },
    { key: 'improvement_goal', label: 'Objectif d\'amélioration', get: (f) => f.improvement_goal || '—' },
    { key: 'formulator', label: 'Formulateur', get: (f) => f.formulator || '—' },
    { key: 'stability', label: 'Début stabilité', get: (f) => (f.stability?.start_date ? new Date(f.stability.start_date).toLocaleDateString('fr-FR') : '—') },
    { key: 'notes.protocole', label: 'Protocole', get: (f) => (f.notes?.protocole || '').slice(0, 80) || '—' },
    { key: 'notes.aspect', label: 'Aspect', get: (f) => (f.notes?.aspect || '').slice(0, 80) || '—' },
    { key: 'notes.ph', label: 'pH', get: (f) => f.notes?.ph || '—' },
  ]

  const ref = versions.find((v) => v.id === referenceVersionId) ?? versions[0]
  if (!ref) {
    return <div className="text-red-600">Erreur : version de référence introuvable</div>
  }

  // Debug temporaire
  if (typeof window !== 'undefined') {
    console.log('ComparisonReport debug:', {
      referenceVersionId,
      refId: ref.id,
      refVersion: ref.version,
      versionsCount: versions.length,
      versions: versions.map(v => ({ id: v.id, version: v.version, name: v.name }))
    })
  }

  const allLineKeys = new Set<LineKey>()
  versions.forEach((f) => {
    (f.lines || []).forEach((l) => allLineKeys.add(lineKey(l)))
  })
  const sortedLineKeys = Array.from(allLineKeys).sort()

  const getLinesMap = (f: Formula) => {
    const m = new Map<LineKey, FormulaLine>()
    ;(f.lines || []).forEach((l) => m.set(lineKey(l), l))
    return m
  }

  const getParamDiffFromRef = (f: Formula, getVal: (x: Formula) => string): boolean => {
    const base = getVal(ref)
    const curr = getVal(f)
    return base !== curr
  }

  /** Vérifie si la valeur change entre les autres versions (non-référence) */
  const getParamDiffBetweenOthers = (f: Formula, getVal: (x: Formula) => string): boolean => {
    const nonRefVersions = versions.filter((v) => v.id !== referenceVersionId)
    if (nonRefVersions.length < 2) return false
    const currVal = getVal(f)
    // Vérifier si cette valeur diffère d'au moins une autre version non-référence
    return nonRefVersions.some((other) => other.id !== f.id && getVal(other) !== currVal)
  }

  return (
    <div className="space-y-8">
      {/* Légende */}
      <div className="flex flex-wrap gap-4 text-sm">
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 rounded bg-green-200" style={{ backgroundColor: '#bbf7d0' }} /> Plus que la référence
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 rounded bg-red-200" style={{ backgroundColor: '#fecaca' }} /> Moins que la référence
        </span>
      </div>

      {/* Paramètres */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Paramètres</h2>
        <div className="overflow-x-auto rounded-lg border border-gray-300 bg-white">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-pink-50">
                <th className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700 w-40">
                  Paramètre
                </th>
                {versions.map((f, i) => (
                  <th key={f.id} className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700 min-w-[120px]">
                    V{f.version || i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paramLabels.map(({ key, label, get }) => (
                <tr key={String(key)}>
                  <td className="border border-gray-300 px-3 py-2 font-medium text-gray-700 bg-gray-50">
                    {label}
                  </td>
                    {versions.map((f) => {
                    const isRef = f.id === referenceVersionId
                    const changed = !isRef && getParamDiffFromRef(f, get)
                    const diffBetweenOthers = !isRef && getParamDiffBetweenOthers(f, get)
                    // Debug temporaire pour le premier paramètre
                    if (key === 'version' && typeof window !== 'undefined') {
                      console.log(`Param ${key}:`, {
                        isRef,
                        changed,
                        refVal: get(ref),
                        currVal: get(f),
                        diffBetweenOthers
                      })
                    }
                    return (
                      <td
                        key={f.id}
                        className={`border border-gray-300 px-3 py-2 ${changed ? 'bg-red-200' : ''} ${isRef ? 'font-semibold' : ''}`}
                        style={changed ? { backgroundColor: '#fecaca' } : {}}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <span>{get(f)}</span>
                          {diffBetweenOthers && (
                            <div className="inline-block w-4 h-4 rounded-full bg-red-600 shadow-md ml-1" title="Diffère aussi entre les autres versions" style={{ backgroundColor: '#dc2626', minWidth: '16px', minHeight: '16px', display: 'inline-block', marginLeft: '4px' }} />
                          )}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Matières */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Matières (ingrédients)</h2>
        <div className="overflow-x-auto rounded-lg border border-gray-300 bg-white">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-pink-50">
                <th className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700 w-48 sticky left-0 bg-pink-50 z-10">
                  Ingrédient
                </th>
                {versions.map((f, i) => (
                  <th key={f.id} className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700 min-w-[140px]">
                    V{f.version || i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedLineKeys.map((key) => {
                const firstLine = versions
                  .map((f) => getLinesMap(f).get(key))
                  .find(Boolean)
                const displayName = firstLine?.ingredient_name || firstLine?.ingredient_code || key || '—'
                const refMap = getLinesMap(ref)
                const refLine = refMap.get(key)
                return (
                  <tr key={key}>
                    <td className="border border-gray-300 px-3 py-2 font-medium text-gray-700 bg-gray-50 sticky left-0 z-10">
                      {displayName}
                    </td>
                    {versions.map((f) => {
                      const currMap = getLinesMap(f)
                      const currLine = currMap.get(key)
                      const isRef = f.id === referenceVersionId
                      const refPercent = refLine ? Number(refLine.percent) : 0
                      const currPercent = currLine ? Number(currLine.percent) : 0
                      // Vert si plus que la référence, rouge si moins (hors colonne référence) ; pas de couleur si matière absente
                      const hasMaterial = Boolean(currLine)
                      const moreThanRef = !isRef && hasMaterial && currPercent > refPercent
                      const lessThanRef = !isRef && hasMaterial && currPercent < refPercent
                      const text = currLine ? `${Number(currLine.percent).toFixed(2)}%` : ''
                      const bgStyle = moreThanRef ? { backgroundColor: '#bbf7d0' } : lessThanRef ? { backgroundColor: '#fecaca' } : {}
                      const bgClass = moreThanRef ? 'bg-green-200' : lessThanRef ? 'bg-red-200' : ''
                      return (
                        <td
                          key={f.id}
                          className={`border border-gray-300 px-3 py-2 ${bgClass} ${isRef ? 'font-semibold' : ''}`}
                          style={bgStyle}
                        >
                          {text}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Liens vers chaque version */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Ouvrir une version</h2>
        <div className="flex flex-wrap gap-2">
          {versions.map((f, i) => (
            <Link
              key={f.id}
              href={`/dashboard/formulation?id=${f.id}`}
              className="px-4 py-2 bg-pink-100 text-pink-800 rounded-lg hover:bg-pink-200 transition-colors text-sm font-medium"
            >
              Version {f.version || i + 1}
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
