import { headers } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { ChevronRight, LogOut, Building2, Plus, Sparkles } from 'lucide-react'
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
  
  // Use localhost for local development
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || (host.includes('localhost') ? 'localhost' : host.split(':')[0])
  const port = host.includes(':') ? `:${host.split(':')[1]}` : ''
  const isVercelDomain = rootDomain.endsWith('.vercel.app')
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
    <>
      <style>{`
        .premium-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          background-color: #0c0c0c;
          background-image: radial-gradient(circle at 50% -20%, #1a160f 0%, #0c0c0c 60%);
          font-family: 'DM Sans', sans-serif;
          color: #f5f2ec;
          position: relative;
          overflow: hidden;
        }

        /* Abstract glowing orbs in background */
        .premium-container::before {
          content: '';
          position: absolute;
          width: 50vw;
          height: 50vw;
          background: radial-gradient(circle, rgba(201, 168, 76, 0.05) 0%, transparent 60%);
          top: -25vw;
          left: -10vw;
          border-radius: 50%;
          pointer-events: none;
        }
        
        .premium-container::after {
          content: '';
          position: absolute;
          width: 60vw;
          height: 60vw;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.02) 0%, transparent 60%);
          bottom: -30vw;
          right: -10vw;
          border-radius: 50%;
          pointer-events: none;
        }

        .premium-card {
          width: 100%;
          max-width: 440px;
          background: rgba(18, 18, 18, 0.4);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-top: 1px solid rgba(201, 168, 76, 0.3);
          border-radius: 24px;
          padding: 3rem;
          box-shadow: 0 40px 80px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1);
          position: relative;
          z-index: 10;
          animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .premium-header {
          text-align: center;
          margin-bottom: 2.5rem;
        }

        .premium-icon-wrapper {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 56px;
          height: 56px;
          border-radius: 18px;
          background: linear-gradient(145deg, #1f1c14 0%, #12100b 100%);
          border: 1px solid rgba(201, 168, 76, 0.2);
          color: #c9a84c;
          margin-bottom: 1.5rem;
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.05);
        }

        .premium-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 2.2rem;
          font-weight: 400;
          color: #ffffff;
          line-height: 1.1;
          margin: 0 0 0.5rem 0;
          letter-spacing: 0.02em;
        }

        .premium-subtitle {
          font-size: 0.85rem;
          color: #8c8880;
          font-weight: 400;
          margin: 0;
        }

        .workspace-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 2rem;
        }

        .workspace-item {
          display: flex;
          align-items: center;
          padding: 1.1rem 1.25rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 16px;
          text-decoration: none;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          overflow: hidden;
        }

        .workspace-item:hover {
          background: rgba(201, 168, 76, 0.06);
          border-color: rgba(201, 168, 76, 0.4);
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.3);
        }

        .workspace-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.05);
          color: #ffffff;
          margin-right: 1.25rem;
          transition: all 0.3s ease;
          flex-shrink: 0;
        }

        .workspace-item:hover .workspace-icon {
          background: #c9a84c;
          color: #0c0c0c;
        }

        .workspace-info {
          flex-grow: 1;
          display: flex;
          flex-direction: column;
        }

        .workspace-name {
          font-size: 1rem;
          font-weight: 500;
          color: #ffffff;
          margin-bottom: 0.2rem;
        }

        .workspace-meta {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-family: 'DM Mono', monospace;
          font-size: 0.65rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .workspace-role {
          color: #8c8880;
        }
        
        .workspace-status {
          color: #c9a84c;
        }
        
        .workspace-status.active {
          color: #4ade80;
        }

        .workspace-arrow {
          color: rgba(255, 255, 255, 0.2);
          transition: all 0.3s ease;
        }

        .workspace-item:hover .workspace-arrow {
          color: #c9a84c;
          transform: translateX(4px);
        }

        .divider {
          display: flex;
          align-items: center;
          text-align: center;
          margin-bottom: 1.5rem;
        }
        
        .divider::before, .divider::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        
        .divider span {
          padding: 0 1rem;
          color: #666;
          font-family: 'DM Mono', monospace;
          font-size: 0.65rem;
          text-transform: uppercase;
          letter-spacing: 0.15em;
        }

        .create-form {
          position: relative;
        }

        .create-input {
          width: 100%;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 14px;
          padding: 1.1rem 3.5rem 1.1rem 1.25rem;
          color: #fff;
          font-size: 0.9rem;
          transition: all 0.3s ease;
          outline: none;
        }

        .create-input:focus {
          border-color: rgba(201, 168, 76, 0.5);
          background: rgba(0, 0, 0, 0.4);
          box-shadow: 0 0 0 3px rgba(201, 168, 76, 0.1);
        }

        .create-input::placeholder {
          color: #555;
        }

        .create-btn {
          position: absolute;
          right: 5px;
          top: 5px;
          bottom: 5px;
          width: 40px;
          border: none;
          background: #c9a84c;
          color: #0c0c0c;
          border-radius: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }

        .create-btn:hover {
          background: #e8d5a3;
        }
        
        .create-btn:active {
          transform: scale(0.92);
        }

        .signout-container {
          margin-top: 2rem;
          text-align: center;
        }

        .signout-btn {
          background: none;
          border: none;
          color: #666;
          font-family: 'DM Mono', monospace;
          font-size: 0.65rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          transition: color 0.3s ease;
        }

        .signout-btn:hover {
          color: #fff;
        }
        
        .empty-state {
          text-align: center;
          padding: 2rem;
          border: 1px dashed rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          color: #8c8880;
          font-size: 0.85rem;
        }
      `}</style>

      <div className="premium-container">
        <div className="premium-card">
          <div className="premium-header">
            <div className="premium-icon-wrapper">
              <Sparkles size={24} />
            </div>
            {/* Using a div instead of h1 to avoid massive global h1 overrides */}
            <div className="premium-title">Select Workspace</div>
            <p className="premium-subtitle">Choose an organization or create a new one.</p>
          </div>

          {pageError && (
            <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', fontSize: '0.85rem', textAlign: 'center', marginBottom: '1.5rem' }}>
              {pageError}
            </div>
          )}

          {created && (
            <div style={{ padding: '12px', background: 'rgba(74, 222, 128, 0.1)', color: '#4ade80', border: '1px solid rgba(74, 222, 128, 0.2)', borderRadius: '12px', fontSize: '0.85rem', textAlign: 'center', marginBottom: '1.5rem' }}>
              Organization created. Select it to continue.
            </div>
          )}

          {dbError && (
            <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', fontSize: '0.85rem', textAlign: 'center', marginBottom: '1.5rem' }}>
              Could not load organizations. Please refresh.
            </div>
          )}

          <div className="workspace-list">
            {memberships.length === 0 && (
              <div className="empty-state">
                No active organizations found.
              </div>
            )}

            {memberships.map(({ role, tenant }) => {
              const hasActiveSubscription = activeTenantIds.has(tenant.id)
              // For Vercel domains, use path-based routing since wildcard subdomains aren't supported
              // No handoff needed since cookies are on the exact same domain
              const href = isVercelDomain 
                ? `/${tenant.slug}` 
                : `${protocol}://${tenant.slug}.${rootDomain}${port}/auth/handoff?access_token=${session.access_token}&refresh_token=${session.refresh_token}`
              
              return (
                <a key={tenant.id} href={href} className="workspace-item">
                  <div className="workspace-icon">
                    <Building2 size={20} strokeWidth={1.5} />
                  </div>
                  
                  <div className="workspace-info">
                    <span className="workspace-name">{tenant.name}</span>
                    <div className="workspace-meta">
                      <span className="workspace-role">{role}</span>
                      <span style={{ color: 'rgba(255,255,255,0.15)' }}>•</span>
                      <span className="workspace-status active">
                        {hasActiveSubscription ? 'Premium' : 'Free Base Engine'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="workspace-arrow">
                    <ChevronRight size={20} strokeWidth={1.5} />
                  </div>
                </a>
              )
            })}
          </div>

          <div className="divider">
            <span>New Workspace</span>
          </div>

          <form action={createOrganization} className="create-form">
            <input
              id="businessName"
              name="businessName"
              type="text"
              placeholder="Enter organization name..."
              className="create-input"
              required
            />
            <button type="submit" className="create-btn" title="Create Organization">
              <Plus size={20} strokeWidth={2.5} />
            </button>
          </form>

          <div className="signout-container">
            <form action="/auth/signout" method="post">
              <button className="signout-btn">
                <LogOut size={14} />
                Sign out of all accounts
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
