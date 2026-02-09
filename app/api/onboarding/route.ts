import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createOrganizationForUser, joinOrganizationByCode } from '@/lib/supabase/organization'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const body = await req.json().catch(() => ({}))
    const companyName = typeof body.companyName === 'string' ? body.companyName.trim() : ''
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : null
    const inviteCode = typeof body.inviteCode === 'string' ? body.inviteCode.trim() : ''

    let organizationId: string | null

    if (inviteCode) {
      organizationId = await joinOrganizationByCode(supabase, inviteCode)
      if (!organizationId) {
        return NextResponse.json(
          { error: 'Code d\'invitation invalide ou déjà utilisé. Vous avez peut-être déjà un compte.' },
          { status: 400 }
        )
      }
    } else {
      organizationId = await createOrganizationForUser(supabase, companyName || 'Mon organisation')
      if (!organizationId) {
        return NextResponse.json(
          { error: 'Utilisateur déjà rattaché à une organisation' },
          { status: 400 }
        )
      }
    }

    if (fullName) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('profiles').update({ full_name: fullName }).eq('user_id', user.id)
      }
    }

    return NextResponse.json({ ok: true, organizationId })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue'
    console.error('[api/onboarding]', msg)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
