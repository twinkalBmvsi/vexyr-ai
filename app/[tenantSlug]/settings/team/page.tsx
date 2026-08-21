import { createClient } from '@/utils/supabase/server'
import TeamManagerClient from './TeamManagerClient'

export default async function TeamSettingsPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const resolvedParams = await params
  const supabase = await createClient()

  // 1. Get tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', resolvedParams.tenantSlug)
    .single()

  if (!tenant) return <div>Tenant not found</div>

  // 2. Get current user role
  const { data: { user } } = await supabase.auth.getUser()
  let userRole = 'manager'
  if (user) {
    const { data: roleData } = await supabase
      .from('users')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', tenant.id)
      .single()
    if (roleData) {
      userRole = roleData.role
    }
  }

  // 3. Get all team members for this tenant
  const { data: members } = await supabase
    .from('users')
    .select('id, user_id, full_name, role, access_pages')
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: true })

  // 4. Fetch emails for these members using Admin client
  // @ts-ignore
  const { createAdminClient } = await import('@/utils/supabase/service-role')
  const adminAuthClient = createAdminClient()
  
  const membersWithEmail = await Promise.all(
    (members || []).map(async (member) => {
      const { data: { user: authUser } } = await adminAuthClient.auth.admin.getUserById(member.user_id)
      return {
        ...member,
        email: authUser?.email || ''
      }
    })
  )

  return (
    <TeamManagerClient 
      tenantId={tenant.id} 
      userRole={userRole} 
      initialMembers={membersWithEmail} 
    />
  )
}
