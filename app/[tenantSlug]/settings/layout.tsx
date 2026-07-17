import SettingsSidebar from './SettingsSidebar'

import { createClient } from '@/utils/supabase/server'
import { headers } from 'next/headers'

export default async function SettingsLayout({ children, params }: { children: React.ReactNode, params: Promise<{ tenantSlug: string }> }) {
  const resolvedParams = await params
  const supabase = await createClient()
  let userRole = 'manager'

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', resolvedParams.tenantSlug)
    .single()

  if (tenant) {
    const { data: { user } } = await supabase.auth.getUser()
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
  }

  return (
    <div>
      <div className="dash-header">
        <h1 className="dash-title">Settings</h1>
        <p className="dash-subtitle">Configure your workspace and preferences.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '2rem', alignItems: 'start' }}>
        <SettingsSidebar userRole={userRole} />

        <div className="dash-card" style={{ padding: '3rem', width: '100%', boxSizing: 'border-box' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
