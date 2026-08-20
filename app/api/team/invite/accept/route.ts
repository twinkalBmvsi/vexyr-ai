import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/service-role'

export async function POST(request: Request) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ error: 'Invite token is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'You must be logged in to accept an invite' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // 1. Verify the invite
    const { data: invite, error: inviteError } = await adminClient
      .from('team_invites')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .single()

    if (inviteError || !invite) {
      return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 400 })
    }

    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This invitation has expired' }, { status: 400 })
    }

    if (invite.email.toLowerCase() !== user.email?.toLowerCase()) {
      return NextResponse.json({ error: 'This invitation was sent to a different email address' }, { status: 403 })
    }

    // 2. Check if the user is already a member
    const { data: existingMember } = await adminClient
      .from('users')
      .select('id')
      .eq('user_id', user.id)
      .eq('tenant_id', invite.tenant_id)
      .maybeSingle()

    if (existingMember) {
      // Mark as accepted anyway if they are already in the team somehow
      await adminClient.from('team_invites').update({ status: 'accepted' }).eq('id', invite.id)
      return NextResponse.json({ message: 'You are already a member of this workspace', tenantId: invite.tenant_id })
    }

    // 3. Add to the team
    const { error: insertError } = await adminClient
      .from('users')
      .insert({
        user_id: user.id,
        tenant_id: invite.tenant_id,
        role: invite.role,
        full_name: invite.name || user.user_metadata?.full_name || user.email?.split('@')[0],
      })

    if (insertError) {
      return NextResponse.json({ error: 'Failed to join the team: ' + insertError.message }, { status: 500 })
    }

    // 4. Mark invite as accepted
    await adminClient.from('team_invites').update({ status: 'accepted' }).eq('id', invite.id)

    return NextResponse.json({ message: 'Invitation accepted successfully', tenantId: invite.tenant_id })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
