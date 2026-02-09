'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function OnboardingForm() {
  const searchParams = useSearchParams()
  const [companyName, setCompanyName] = useState('')
  const [fullName, setFullName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const invite = searchParams.get('invite')?.trim()
    if (invite) setInviteCode(invite)
  }, [searchParams])

  const isJoining = inviteCode.trim().length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const payload: { fullName?: string; companyName?: string; inviteCode?: string } = {
        fullName: fullName.trim() || undefined,
      }
      if (isJoining) {
        payload.inviteCode = inviteCode.trim()
      } else {
        payload.companyName = companyName.trim() || 'Mon organisation'
      }
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Une erreur est survenue')
        return
      }
      router.refresh()
    } catch (err) {
      setError('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto py-12">
      <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Bienvenue</h2>
        <p className="text-gray-600 mb-6">
          {isJoining
            ? 'Un collègue vous a partagé un code pour rejoindre sa société. Saisissez-le ci-dessous pour accéder aux mêmes formules et données.'
            : 'Indiquez le nom de votre société pour créer votre organisation, ou saisissez un code d\'invitation si un collègue vous en a donné un.'}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
              Votre nom
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ex. Jean Dupont"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="inviteCode" className="block text-sm font-medium text-gray-700 mb-1">
              Code d&apos;invitation <span className="text-gray-400 font-normal">(optionnel)</span>
            </label>
            <input
              id="inviteCode"
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Ex. a1b2c3d4"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent font-mono"
            />
          </div>
          {!isJoining && (
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
                Nom de votre société
              </label>
              <input
                id="companyName"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Ex. La Canopée"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>
          )}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-pink-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? (isJoining ? 'Connexion en cours...' : 'Création en cours...')
              : isJoining
                ? 'Rejoindre l\'organisation'
                : 'Continuer'}
          </button>
        </form>
      </div>
    </div>
  )
}
