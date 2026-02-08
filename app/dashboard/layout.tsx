import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardNav from '@/components/DashboardNav'
import { OrganizationProvider } from '@/contexts/OrganizationContext'
import { getOrganizationId } from '@/lib/supabase/organization'
import OnboardingForm from '@/components/OnboardingForm'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const organizationId = await getOrganizationId(supabase)

  // Premier accès : pas encore d'organisation → afficher l'onboarding (nom de la société)
  if (!organizationId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardNav user={user} />
        <main className="container mx-auto px-4 py-8">
          <OnboardingForm />
        </main>
      </div>
    )
  }

  return (
    <OrganizationProvider organizationId={organizationId}>
      <div className="min-h-screen bg-gray-50">
        <DashboardNav user={user} />
        <main className="container mx-auto px-4 py-8">
          {children}
        </main>
      </div>
    </OrganizationProvider>
  )
}
