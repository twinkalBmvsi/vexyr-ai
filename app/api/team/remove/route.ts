import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function DELETE(request: Request) {
  try {
    const { userId, tenantId } = await request.json()

    if (!userId || !tenantId) {
      return NextResponse.json({ error: 'User ID and tenant ID are required' }, { status: 400 })
    }

    const supabase = await createClient()

    // 1. Verify the current user is an owner of the tenant
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Cannot remove yourself
    if (user.id === userId) {
      return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 })
    }

    const { data: userRole, error: roleError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .eq('tenant_id', tenantId)
      .single()

    if (roleError || !userRole || userRole.role !== 'owner') {
      return NextResponse.json({ error: 'Only owners can remove team members' }, { status: 403 })
    }

    const adminAuthClient = createAdminClient()

    // 2. Remove the user's access from the tenant by deleting the record in `public.users`
    // Since `id` is a primary key and corresponds to auth.users, and the user only belongs to one tenant,
    // this removes their access to the app. 
    const { error: deleteError } = await adminAuthClient
      .from('users')
      .delete()
      .eq('id', userId)
      .eq('tenant_id', tenantId)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    // Optional: If the user only exists in this tenant, we could also delete their auth.users record.
    // For now, revoking tenant access is sufficient to block them from logging into this tenant.

    return NextResponse.json({ message: 'Team member removed successfully' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
