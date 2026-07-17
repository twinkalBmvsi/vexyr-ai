import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function POST(request: Request) {
  try {
    const { email, tenantId } = await request.json()

    if (!email || !tenantId) {
      return NextResponse.json({ error: 'Email and tenant ID are required' }, { status: 400 })
    }

    const supabase = await createClient()

    // 1. Verify the current user is an owner of the tenant
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userRole, error: roleError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .eq('tenant_id', tenantId)
      .single()

    if (roleError || !userRole || userRole.role !== 'owner') {
      return NextResponse.json({ error: 'Only owners can invite team members' }, { status: 403 })
    }

    const adminAuthClient = createAdminClient()

    // 2. Invite the user via Supabase Admin API
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost'
    const siteUrl = `http://${rootDomain}:3000`
    
    const { data: inviteData, error: inviteError } = await adminAuthClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${siteUrl}/invite`
    })

    if (inviteError) {
      return NextResponse.json({ error: inviteError.message }, { status: 400 })
    }

    if (!inviteData.user) {
      return NextResponse.json({ error: 'Failed to invite user' }, { status: 500 })
    }

    // 3. Add the user to the public.users table as a manager
    const { error: insertError } = await adminAuthClient
      .from('users')
      .insert({
        id: inviteData.user.id,
        tenant_id: tenantId,
        role: 'manager',
        full_name: email.split('@')[0], // Default name
      })

    if (insertError) {
      // If they already exist in another tenant, we might just update or insert?
      // Wait, public.users has primary key `id`.
      // If a user can be in multiple tenants, public.users needs a composite PK, but in schema.sql:
      // id uuid PRIMARY KEY REFERENCES auth.users(id)
      // This means a user can ONLY belong to one tenant!
      // If they are already in the system, inviteUserByEmail might fail or return existing user.
      // If they exist in public.users, insert will fail with unique constraint.
      if (insertError.code === '23505') {
         return NextResponse.json({ error: 'User is already part of a workspace in this system.' }, { status: 400 })
      }
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Invitation sent successfully' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
