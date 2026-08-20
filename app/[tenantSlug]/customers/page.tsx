import CustomersClient from './CustomersClient'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export default async function CustomersPage({
  params
}: {
  params: Promise<{ tenantSlug: string }>
}) {
  const resolvedParams = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return <div>Not authenticated</div>
  }

  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', resolvedParams.tenantSlug)
    .single()

  if (!tenant) {
    return <div>Tenant not found or access denied</div>
  }

  const { data: membership } = await supabase
    .from('users')
    .select('role')
    .eq('user_id', user.id)
    .eq('tenant_id', tenant.id)
    .single()

  if (!membership) {
    return <div>Not a member of this tenant</div>
  }

  let customers: any[] = []
  if (tenant) {
    const adminSupabase = createAdminClient()
    const { data, error } = await adminSupabase
      .from('customers')
      .select('id, name, email, phone, created_at')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })
      
    if (error) {
      console.error('Error fetching customers:', error)
    }

    if (data) {
      customers = data.map((c: any) => ({
        id: c.id,
        name: c.name || 'Unknown',
        email: c.email || c.phone || 'No contact',
        status: 'Active', // Default status for now
        joined: new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      }))
    }
  }

  return (
    <div>
      <div className="dash-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="dash-title">Customers</h1>
            <p className="dash-subtitle">View and manage your customer database.</p>
          </div>
          <button className="btn-primary">Export CSV</button>
        </div>
      </div>

      <CustomersClient initialCustomers={customers} />
    </div>
  )
}
