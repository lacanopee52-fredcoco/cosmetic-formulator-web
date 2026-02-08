'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Formula } from '@/types'
import { createClient } from '@/lib/supabase/client'

export default function FormulasPage() {
  const [formulas, setFormulas] = useState<Formula[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const router = useRouter()

  useEffect(() => {
    loadFormulas()
  }, [])

  const loadFormulas = async () => {
    try {
      setLoading(true)
      setError(null)

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('Utilisateur non authentifié')
        return
      }

      let query = supabase
        .from('formulas')
        .select(`
          *,
          lines:formula_lines(*)
        `)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      // Appliquer le filtre de recherche si présent
      if (searchQuery.trim()) {
        query = query.or(`name.ilike.%${searchQuery}%,version.ilike.%${searchQuery}%,formulator.ilike.%${searchQuery}%`)
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        throw new Error(fetchError.message)
      }

      // Transformer les données
      const transformedFormulas = (data || []).map((formula: any) => ({
        id: formula.id,
        name: formula.name,
        version: formula.version || '',
        formulator: formula.formulator || '',
        total_weight: formula.total_weight || 1000,
        notes: formula.notes || {},
        stability: formula.stability || { days: [] },
        image: formula.image || undefined,
        is_active: !!formula.is_active,
        improvement_goal: formula.improvement_goal || '',
        lines: (formula.lines || []).map((line: any) => ({
          id: line.id,
          phase: line.phase,
          ingredient_code: line.ingredient_code,
          ingredient_name: line.ingredient_name,
          percent: line.percent,
          grams: line.grams,
          notes: line.notes || '',
          is_qsp: line.is_qsp || false,
          prix_au_kilo: line.prix_au_kilo,
        })),
        created_at: formula.created_at,
        updated_at: formula.updated_at,
      }))

      setFormulas(transformedFormulas)
    } catch (err) {
      console.error('Erreur chargement formules:', err)
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }

  // Recharger quand la recherche change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadFormulas()
    }, 300) // Debounce de 300ms

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  const handleOpenFormula = (formulaId: number) => {
    router.push(`/dashboard/formulation?id=${formulaId}`)
  }

  const handleDeleteFormula = async (formula: Formula) => {
    const name = (formula.name || '').trim() || 'Sans nom'
    const confirmed = typeof window !== 'undefined' && window.confirm(
      `Supprimer la formule « ${name} » ?\n\nCette action est irréversible.`
    )
    if (!confirmed) return

    try {
      setDeletingId(formula.id!)
      setError(null)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('Utilisateur non authentifié')
        return
      }

      const { error: deleteError } = await supabase
        .from('formulas')
        .delete()
        .eq('id', formula.id)
        .eq('user_id', user.id)

      if (deleteError) {
        throw new Error(deleteError.message)
      }

      await loadFormulas()
    } catch (err) {
      console.error('Erreur suppression:', err)
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression')
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const namesWithMultipleVersions = (() => {
    const byName = new Map<string, number>()
    formulas.forEach((f) => {
      const name = (f.name || '').trim() || 'Sans nom'
      byName.set(name, (byName.get(name) ?? 0) + 1)
    })
    return new Set([...byName.entries()].filter(([, count]) => count >= 2).map(([name]) => name))
  })()

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
            <p className="mt-4 text-gray-600">Chargement des formules...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h1 className="text-3xl font-bold text-pink-600">
              📋 Formules
            </h1>
            <button
              type="button"
              onClick={() => {
                // Retourner à la page précédente (formule en cours avec son id) au lieu d'ouvrir une nouvelle formule
                if (typeof window !== 'undefined' && window.history.length > 1) {
                  router.back()
                } else {
                  router.push('/dashboard/formulation')
                }
              }}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              ← Retour à la formule
            </button>
          </div>
          <div className="flex gap-4 mb-6">
            <input
              type="text"
              placeholder="Rechercher par nom, version ou formulateur..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
            <Link
              href="/dashboard/formulation/compare"
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
            >
              📊 Comparer les versions
            </Link>
            <button
              onClick={(e) => {
                e.preventDefault()
                console.log('Bouton "Nouvelle Formule" cliqué')
                try {
                  router.push('/dashboard/formulation')
                } catch (error) {
                  console.error('Erreur navigation:', error)
                  window.location.href = '/dashboard/formulation'
                }
              }}
              className="px-6 py-2 bg-pink-600 text-white rounded-lg font-semibold hover:bg-pink-700 transition-colors cursor-pointer"
            >
              ➕ Nouvelle Formule
            </button>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-100 text-red-800 border border-red-300 rounded-lg">
              {error}
            </div>
          )}
        </div>

        {formulas.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg mb-4">
              {searchQuery ? 'Aucune formule ne correspond à votre recherche' : 'Aucune formule sauvegardée'}
            </p>
            {!searchQuery && (
              <button
                onClick={(e) => {
                  e.preventDefault()
                  console.log('Bouton "Créer votre première formule" cliqué')
                  try {
                    router.push('/dashboard/formulation')
                  } catch (error) {
                    console.error('Erreur navigation:', error)
                    window.location.href = '/dashboard/formulation'
                  }
                }}
                className="px-6 py-2 bg-pink-600 text-white rounded-lg font-semibold hover:bg-pink-700 transition-colors cursor-pointer"
              >
                ➕ Créer votre première formule
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-pink-100">
                  <th className="border border-gray-300 px-2 py-2 text-center w-12" title="Formule active (choisie pour la fabrication)">✓</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Nom</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Version</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Objectif d&apos;amélioration</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Formulateur</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Lignes</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Mise en stabilité</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Modifiée le</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {formulas.map((formula) => (
                    <tr key={formula.id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-2 py-2 text-center align-middle">
                        {formula.is_active ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-100 text-green-700" title="Formule active (choisie pour la fabrication)">
                            ✓
                          </span>
                        ) : (
                          <span className="inline-block w-7 h-7" aria-hidden="true" />
                        )}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 font-medium">
                        {formula.name || 'Sans nom'}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {formula.version || '-'}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700 max-w-[200px]" title={formula.improvement_goal || undefined}>
                        {formula.improvement_goal ? formula.improvement_goal : '—'}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {formula.formulator || '-'}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        {formula.lines?.length || 0}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-sm text-gray-600">
                        {formula.stability?.start_date
                          ? formatDate(formula.stability.start_date)
                          : '—'}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-sm text-gray-600">
                        {formatDate(formula.updated_at)}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() => handleOpenFormula(formula.id!)}
                            className="px-3 py-1 bg-pink-100 text-pink-700 rounded hover:bg-pink-200 transition-colors text-sm"
                            title="Ouvrir"
                          >
                            ✏️ Ouvrir
                          </button>
                          {namesWithMultipleVersions.has((formula.name || '').trim() || 'Sans nom') && (
                            <Link
                              href={`/dashboard/formulation/compare?name=${encodeURIComponent((formula.name || '').trim() || 'Sans nom')}`}
                              className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-sm"
                              title="Comparer les versions"
                            >
                              📊 Comparer
                            </Link>
                          )}
                          <button
                            onClick={() => handleDeleteFormula(formula)}
                            disabled={deletingId === formula.id}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Supprimer la formule"
                          >
                            {deletingId === formula.id ? '…' : '🗑️'}
                          </button>
                        </div>
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {formulas.length > 0 && (
          <div className="mt-4 text-sm text-gray-600">
            Total : {formulas.length} formule{formulas.length > 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  )
}
