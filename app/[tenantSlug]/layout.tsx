import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import Sidebar from '@/components/dashboard/Sidebar'
import RoleGuard from '@/components/dashboard/RoleGuard'
import SubscriptionBanner from '@/components/dashboard/SubscriptionBanner'

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ tenantSlug: string }>
}) {
  const resolvedParams = await params
  const supabase = await createClient()

  // 1. Get the authenticated user (Middleware already ensures this exists, but we double check)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost'
    redirect(`http://${rootDomain}:3000/login`)
  }

  let companyName = resolvedParams.tenantSlug

  // 2. Authorize the user against the tenant they selected in the URL.
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name')
    .eq('slug', resolvedParams.tenantSlug)
    .single()

  if (!tenant) {
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost'
    redirect(`http://${rootDomain}:3000/login`)
  }

  const { data: userRecord } = await supabase
    .from('users')
    .select('tenant_id, role, access_pages')
    .eq('user_id', user.id)
    .eq('tenant_id', tenant.id)
    .single()

  if (!userRecord) {
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost'
    redirect(`http://${rootDomain}:3000/org-selector`)
  }

  companyName = tenant.name || resolvedParams.tenantSlug

  // 3. Fetch subscription to determine banner status based on module expirations
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status, current_period_end, modules')
    .eq('tenant_id', tenant.id)
    .maybeSingle()

  const subStatus = subscription?.status || 'active'
  const subModules = subscription?.modules || {}
  const subEnd = subscription?.current_period_end || null

  const removeBrandingMod = (subModules as any)?.removeBranding
  const hasBrandingRemoved = !!removeBrandingMod && (
    removeBrandingMod === true ||
    (typeof removeBrandingMod === 'object' && removeBrandingMod.expires_at && new Date(removeBrandingMod.expires_at) > new Date())
  )

  return (
    <div className="dashboard-layout">
      <Sidebar 
        tenantSlug={resolvedParams.tenantSlug} 
        companyName={companyName} 
        userRole={userRecord.role}
        accessPages={userRecord.access_pages || []}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <SubscriptionBanner 
          status={subStatus} 
          modules={subModules}
          tenantSlug={resolvedParams.tenantSlug} 
        />
        <main className="dashboard-main" style={{ flex: 1, overflowY: 'auto' }}>
          <RoleGuard 
            userRole={userRecord.role}
            accessPages={userRecord.access_pages || []}
            tenantSlug={resolvedParams.tenantSlug}
          >
            {children}
          </RoleGuard>
        </main>
        {!hasBrandingRemoved && (
          <div style={{
            position: 'fixed',
            bottom: 0,
            left: '280px',
            right: 0,
            zIndex: 50,
            textAlign: 'center',
            padding: '0.45rem 1rem',
            borderTop: '1px solid var(--border)',
            background: 'var(--surface, #0e0e0e)',
            backdropFilter: 'blur(8px)',
          }}>
            <a
              href="https://vexyr.ai"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '0.7rem',
                color: 'var(--muted)',
                textDecoration: 'none',
                opacity: 0.45,
                letterSpacing: '0.04em',
              }}
            >
              Powered by Vexyr AI
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
