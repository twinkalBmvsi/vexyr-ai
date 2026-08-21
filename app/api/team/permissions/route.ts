import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/service-role'

export async function PUT(request: Request) {
  try {
    const { memberId, tenantId, accessPages } = await request.json()

    if (!memberId || !tenantId || !Array.isArray(accessPages)) {
      return NextResponse.json({ error: 'Missing required fields or invalid format' }, { status: 400 })
    }

    const supabase = await createClient()

    // 1. Verify the current user is an owner of the tenant
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminAuthClient = createAdminClient()

    const { data: userRole, error: roleError } = await adminAuthClient
      .from('users')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', tenantId)
      .single()

    if (roleError || !userRole || userRole.role !== 'owner') {
      return NextResponse.json({ error: 'Only owners can manage permissions' }, { status: 403 })
    }

    // 2. Prevent modifying owner's permissions (Owners always have full access)
    const { data: targetMember } = await adminAuthClient
      .from('users')
      .select('role')
      .eq('id', memberId)
      .eq('tenant_id', tenantId)
      .single()

    if (!targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    if (targetMember.role === 'owner') {
      return NextResponse.json({ error: 'Cannot modify permissions of an owner' }, { status: 400 })
    }

    // 3. Update access_pages
    const { error: updateError } = await adminAuthClient
      .from('users')
      .update({ access_pages: accessPages })
      .eq('id', memberId)
      .eq('tenant_id', tenantId)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update permissions: ' + updateError.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Permissions updated successfully' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
