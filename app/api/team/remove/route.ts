import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/service-role'

async function removeTeamMember(targetMemberId: string, tenantId: string) {
  if (!targetMemberId || !tenantId) {
    return { error: 'Member ID and tenant ID are required', status: 400 }
  }

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized', status: 401 }
  }

  const adminAuthClient = createAdminClient()

  const { data: userRole, error: roleError } = await adminAuthClient
    .from('users')
    .select('id, role')
    .eq('user_id', user.id)
    .eq('tenant_id', tenantId)
    .single()

  if (roleError || !userRole || userRole.role !== 'owner') {
    return { error: 'Only owners can remove team members', status: 403 }
  }

  // First try to find in team_invites
  const { data: invite } = await adminAuthClient
    .from('team_invites')
    .select('id, status')
    .eq('id', targetMemberId)
    .eq('tenant_id', tenantId)
    .single()

  if (invite) {
    const { error: deleteInviteError } = await adminAuthClient
      .from('team_invites')
      .delete()
      .eq('id', invite.id)
      
    if (deleteInviteError) {
      return { error: deleteInviteError.message, status: 500 }
    }
    return { memberId: targetMemberId, message: 'Invitation removed successfully' }
  }

  // If not an invite, look for active user
  const { data: member, error: memberError } = await adminAuthClient
    .from('users')
    .select('id, user_id, role')
    .eq('tenant_id', tenantId)
    .or(`id.eq.${targetMemberId},user_id.eq.${targetMemberId}`)
    .single()

  if (memberError || !member) {
    return { error: 'Team member or invitation not found', status: 404 }
  }

  if (member.user_id === user.id || member.id === userRole.id) {
    return { error: 'Cannot remove yourself', status: 400 }
  }

  if (member.role === 'owner') {
    return { error: 'Cannot remove another owner', status: 400 }
  }

  const { error: deleteError } = await adminAuthClient
    .from('users')
    .delete()
    .eq('id', member.id)
    .eq('tenant_id', tenantId)

  if (deleteError) {
    return { error: deleteError.message, status: 500 }
  }

  return { memberId: member.id, message: 'Team member removed successfully' }
}

export async function DELETE(request: Request) {
  try {
    const { memberId, userId, tenantId } = await request.json()
    const result = await removeTeamMember(memberId || userId, tenantId)

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const memberId = formData.get('memberId')
    const tenantId = formData.get('tenantId')

    const result = await removeTeamMember(
      typeof memberId === 'string' ? memberId : '',
      typeof tenantId === 'string' ? tenantId : ''
    )

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const referer = request.headers.get('referer')
    return NextResponse.redirect(referer || '/', { status: 303 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
