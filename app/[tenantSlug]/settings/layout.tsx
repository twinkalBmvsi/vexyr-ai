import SettingsSidebar from './SettingsSidebar'

import { createClient } from '@/utils/supabase/server'

export default async function SettingsLayout({ children, params }: { children: React.ReactNode, params: Promise<{ tenantSlug: string }> }) {
  const resolvedParams = await params
  const supabase = await createClient()
  let userRole = 'manager'
  let accessPages: string[] = []

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
        .select('role, access_pages')
        .eq('user_id', user.id)
        .eq('tenant_id', tenant.id)
        .single()
      if (roleData) {
        userRole = roleData.role
        accessPages = roleData.access_pages || []
      }
    }
  }

  return (
    <div>
      <div className="dash-header">
        <h1 className="dash-title">Settings</h1>
        <p className="dash-subtitle">Configure your workspace and preferences.</p>
      </div>

      <div className="settings-layout-grid">
        <SettingsSidebar userRole={userRole} tenantSlug={resolvedParams.tenantSlug} accessPages={accessPages} />

        <div style={{ 
          background: 'var(--paper)', 
          border: '1px solid var(--border)', 
          borderRadius: '8px', 
          padding: '3rem', 
          width: '100%', 
          boxSizing: 'border-box' 
        }}>
          {children}
        </div>
      </div>
    </div>
  )
}
