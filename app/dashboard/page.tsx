import { redirect } from 'next/navigation'

export default function DashboardPage() {
  // Rediriger vers la page de formulation par défaut
  redirect('/dashboard/formulation')
}
