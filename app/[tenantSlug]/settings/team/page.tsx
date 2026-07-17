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
      .eq('id', user.id)
      .eq('tenant_id', tenant.id)
      .single()
    if (roleData) {
      userRole = roleData.role
    }
  }

  // 3. Get all team members for this tenant
  const { data: members, error } = await supabase
    .from('users')
    .select('id, full_name, role')
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: true })

  return (
    <TeamManagerClient 
      tenantId={tenant.id} 
      userRole={userRole} 
      initialMembers={members || []} 
    />
  )
}
