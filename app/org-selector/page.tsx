import { headers } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { ChevronRight, LogOut, Building2, Plus } from 'lucide-react'
import { createOrganization } from '@/app/auth/actions'

type UserTenantRecord = {
  role: string
  tenants: TenantRecord | TenantRecord[] | null
}

type TenantRecord = {
  id: string
  name: string
  slug: string
}

export default async function OrgSelectorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string }>
}) {
  const supabase = await createClient()
  const { error: pageError, created } = await searchParams

  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  
  if (sessionError || !session) {
    redirect('/login')
  }

  // Fetch the user's assigned tenants
  const { data: userRecordsData, error: dbError } = await supabase
    .from('users')
    .select(`
      role,
      tenants (
        id,
        name,
        slug
      )
    `)
    .eq('user_id', session.user.id)

  const userRecords = (userRecordsData || []) as unknown as UserTenantRecord[]
  const memberships = userRecords
    .map((record) => ({
      role: record.role,
      tenant: Array.isArray(record.tenants) ? record.tenants[0] : record.tenants,
    }))
    .filter((membership): membership is { role: string; tenant: TenantRecord } => Boolean(membership.tenant))
  const tenantIds = memberships
    .map((membership) => membership.tenant.id)
    .filter((tenantId): tenantId is string => Boolean(tenantId))

  const headersList = await headers()
  const host = headersList.get('host') || 'localhost:3000'
  const protocol = host.includes('localhost') || host.includes('localtest.me') ? 'http' : 'https'
  
  // Use localtest.me for local development on Windows instead of localhost to support subdomains
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || (host.includes('localhost') ? 'localtest.me' : host.split(':')[0])
  const port = host.includes(':') ? `:${host.split(':')[1]}` : ''
  const activeTenantIds = new Set<string>()

  if (tenantIds.length > 0) {
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('tenant_id')
      .in('tenant_id', tenantIds)
      .eq('status', 'active')

    subscriptions?.forEach((subscription) => {
      if (subscription.tenant_id) {
        activeTenantIds.add(subscription.tenant_id)
      }
    })
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        
        <div className="auth-header">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--gold)]/10 text-[var(--gold)] mb-4">
             <Building2 size={24} />
          </div>
          <h1 className="auth-title">Select Workspace</h1>
          <p className="auth-subtitle">Choose an organization or create your own.</p>
        </div>

        {pageError && (
          <div style={{ color: '#ef4444', fontSize: '0.8rem', textAlign: 'center', marginBottom: '1rem' }}>
            {pageError}
          </div>
        )}

        {created && (
          <div style={{ color: '#10b981', fontSize: '0.8rem', textAlign: 'center', marginBottom: '1rem' }}>
            Organization created. Select it to choose a plan and finish setup.
          </div>
        )}

        {dbError && (
          <div style={{ color: '#ef4444', fontSize: '0.8rem', textAlign: 'center', marginBottom: '1rem' }}>
            Could not load organizations. Please refresh and try again.
          </div>
        )}

        <div className="flex flex-col gap-4 mb-8 w-full">
            {memberships.length === 0 && (
              <div style={{ padding: '1rem', border: '1px dashed var(--border-strong)', borderRadius: '8px', color: 'var(--muted)', fontSize: '0.9rem', textAlign: 'center' }}>
                You are not enrolled in any organization right now.
              </div>
            )}

            {memberships.map(({ role, tenant }) => {
              const hasActiveSubscription = activeTenantIds.has(tenant.id)
              const href = hasActiveSubscription
                ? `${protocol}://${tenant.slug}.${rootDomain}${port}/auth/handoff?access_token=${session.access_token}&refresh_token=${session.refresh_token}`
                : `/select-plan?tenantId=${tenant.id}`
              
              return (
                <a 
                  key={tenant.id}
                  href={href}
                  className="group relative flex items-center p-5 bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[var(--border)] overflow-hidden no-underline transition-all duration-300 hover:shadow-[0_8px_30px_rgba(12,12,12,0.08)] hover:-translate-y-0.5 hover:border-[var(--gold)]/40"
                >
                  {/* Soft gold glow on the left */}
                  <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-28 h-28 bg-[var(--gold)]/15 blur-2xl rounded-full z-0 transition-all duration-300 group-hover:bg-[var(--gold)]/25" />
                  
                  {/* Icon container */}
                  <div className="relative z-10 flex-shrink-0 w-12 h-12 bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-black/5 flex items-center justify-center text-[var(--gold)] transition-transform duration-300 group-hover:scale-105">
                    <Building2 size={22} strokeWidth={1.5} />
                  </div>
                  
                  {/* Text Content */}
                  <div className="relative z-10 flex flex-col justify-center ml-5 flex-grow">
                    <span className="text-[1.05rem] font-semibold text-[var(--ink)] group-hover:text-[var(--gold)] transition-colors duration-300">{tenant.name}</span>
                    <span className="text-[0.85rem] text-[var(--muted)] capitalize mt-0.5">
                      {role} - {hasActiveSubscription ? 'Active' : 'Payment required'}
                    </span>
                  </div>
                  
                  {/* Right chevron */}
                  <div className="relative z-10 flex-shrink-0 text-black/20 group-hover:text-[var(--gold)] transition-all duration-300 group-hover:translate-x-1 ml-4">
                    <ChevronRight size={22} strokeWidth={1.5} />
                  </div>
                </a>
              )
            })}
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={18} color="var(--gold)" />
            Create Organization
          </h2>
          <form action={createOrganization} className="auth-form">
            <div className="form-group">
              <label className="form-label" htmlFor="businessName">Organization Name</label>
              <input
                id="businessName"
                name="businessName"
                type="text"
                className="form-input"
                placeholder="Glamour Studio"
                required
              />
            </div>
            <button type="submit" className="auth-btn">Create Organization</button>
          </form>
        </div>

        <div className="text-center mt-6">
          <form action="/auth/signout" method="post">
            <button className="inline-flex items-center bg-transparent border-none font-mono text-xs tracking-[0.1em] uppercase text-[var(--muted)] cursor-pointer transition-colors hover:text-[var(--ink)]">
              <LogOut size={14} className="mr-2" />
              Sign out of all accounts
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
