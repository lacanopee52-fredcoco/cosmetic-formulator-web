import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Route de callback après confirmation d'email (ou OAuth).
 * Supabase redirige ici avec ?code=... ; on échange le code contre une session
 * et on redirige vers le dashboard pour que l'utilisateur soit connecté.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.error('[auth/callback] exchangeCodeForSession:', error.message)
      return NextResponse.redirect(
        `${requestUrl.origin}/login?error=confirmation_echouee`
      )
    }
  }

  return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
}
