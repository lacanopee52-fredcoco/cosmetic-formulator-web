'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'

interface DashboardNavProps {
  user: User
}

const DEFAULT_COMPANY_NAME = 'La Canopée'

export default function DashboardNav({ user }: DashboardNavProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()
  const companyName = (user?.user_metadata?.company_name as string)?.trim() || DEFAULT_COMPANY_NAME
  const [editingCompany, setEditingCompany] = useState(false)
  const [companyInput, setCompanyInput] = useState(companyName)
  const [savingCompany, setSavingCompany] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const handleCreateNewAccount = async () => {
    await supabase.auth.signOut()
    router.push('/signup')
    router.refresh()
  }

  const handleSaveCompanyName = async () => {
    const value = companyInput.trim() || DEFAULT_COMPANY_NAME
    setSavingCompany(true)
    try {
      await supabase.auth.updateUser({
        data: { ...user?.user_metadata, company_name: value },
      })
      setEditingCompany(false)
      setCompanyInput(value)
      router.refresh()
    } catch (_) {}
    setSavingCompany(false)
  }

  // Lien Produit fini : garder l'id de la formule si on est déjà sur une formule ouverte
  const produitFiniHref =
    pathname === '/dashboard/formulation' && searchParams.get('id')
      ? `/dashboard/formulation?id=${searchParams.get('id')}&section=produit-fini`
      : '/dashboard/formulation?section=produit-fini'

  const navLinks = [
    { href: '/dashboard/formulation', label: '✏️ Nouvelle Formule', icon: '✏️' },
    { href: '/dashboard/formulas', label: '📋 Formules', icon: '📋' },
    { href: '/dashboard/import', label: '📥 Importer Matières', icon: '📥' },
    { href: produitFiniHref, label: '📦 Produit fini', icon: '📦' },
  ]

  return (
    <nav className="bg-white shadow-md border-b border-pink-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-pink-600">🧪 Cosmetic Formulator</h1>
              <div className="flex items-center gap-1">
                {editingCompany ? (
                  <>
                    <input
                      type="text"
                      value={companyInput}
                      onChange={(e) => setCompanyInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveCompanyName()}
                      placeholder={DEFAULT_COMPANY_NAME}
                      className="text-sm text-gray-700 px-2 py-0.5 border border-pink-300 rounded focus:ring-2 focus:ring-pink-500 focus:border-pink-500 w-40"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleSaveCompanyName}
                      disabled={savingCompany}
                      className="text-xs px-2 py-0.5 bg-pink-600 text-white rounded hover:bg-pink-700 disabled:opacity-50"
                    >
                      {savingCompany ? '…' : 'OK'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEditingCompany(false); setCompanyInput(companyName) }}
                      className="text-xs px-2 py-0.5 text-gray-500 hover:text-gray-700"
                    >
                      Annuler
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-sm text-gray-600">{companyName}</span>
                    <button
                      type="button"
                      onClick={() => { setEditingCompany(true); setCompanyInput(companyName) }}
                      className="text-xs text-gray-400 hover:text-pink-600 transition-colors"
                      title="Modifier le nom de la société"
                    >
                      ✏️
                    </button>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex space-x-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname === link.href
                      ? 'bg-pink-100 text-pink-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={() => {
                if (pathname === '/dashboard/formulation') {
                  window.dispatchEvent(new CustomEvent('print-formula'))
                } else {
                  window.print()
                }
              }}
              className="px-4 py-2 text-sm font-medium text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
            >
              🖨️ Imprimer
            </button>
            <span className="text-sm text-gray-600">{user.email}</span>
            <button
              type="button"
              onClick={handleCreateNewAccount}
              className="px-4 py-2 text-sm text-pink-600 hover:text-pink-700 hover:bg-pink-50 rounded-lg transition-colors"
            >
              Créer un nouveau compte
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
