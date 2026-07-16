import Link from 'next/link'
import { Bot, MessageCircle, Zap } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'

export default async function TenantDashboard({
  params,
}: {
  params: Promise<{ tenantSlug: string }>
}) {
  const resolvedParams = await params
  const supabase = await createClient()

  // 1. Fetch tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, plan_id')
    .eq('slug', resolvedParams.tenantSlug)
    .single()

  let agentsCount = 0
  let conversationsCount = 0
  let planName = 'Free Tier'
  let renewsOn = 'N/A'

  if (tenant) {
    // 2. Fetch Agents Count
    const { count: aCount } = await supabase
      .from('agents')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)
    agentsCount = aCount || 0

    // 3. Fetch Conversations Count
    // Assuming conversations table has tenant_id
    const { count: cCount, error: cError } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)
      
    conversationsCount = cError ? 0 : (cCount || 0)

    // 4. Fetch Subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('tenant_id', tenant.id)
      .single()

    const planId = subscription?.plan_id || tenant.plan_id || 'free'
    if (planId === 'starter') planName = 'Starter'
    else if (planId === 'growth') planName = 'Growth'
    else if (planId === 'enterprise') planName = 'Enterprise'

    if (subscription?.current_period_end) {
      const date = new Date(subscription.current_period_end)
      const diffTime = date.getTime() - new Date().getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      renewsOn = diffDays > 0 ? `Renews in ${diffDays} days` : 'Renewed today'
    } else {
      renewsOn = 'No active subscription'
    }
  }
  
  return (
    <div>
      <div className="dash-header">
        <h1 className="dash-title">Welcome back, <em>{resolvedParams.tenantSlug}</em></h1>
        <p className="dash-subtitle">Here is what's happening with your AI agents today.</p>
      </div>

      <div className="dash-grid" style={{ marginBottom: '3rem' }}>
        <div className="dash-card">
          <div className="dash-card-header">
            <span className="dash-card-title">Active Agents</span>
            <Bot size={20} color="var(--gold)" />
          </div>
          <span className="dash-card-value">{agentsCount}</span>
          <span className="dash-card-desc">Configured AI Agents</span>
        </div>

        <div className="dash-card">
          <div className="dash-card-header">
            <span className="dash-card-title">Conversations</span>
            <MessageCircle size={20} color="var(--gold)" />
          </div>
          <span className="dash-card-value">{conversationsCount.toLocaleString()}</span>
          <span className="dash-card-desc">Total messages handled</span>
        </div>

        <div className="dash-card">
          <div className="dash-card-header">
            <span className="dash-card-title">Current Plan</span>
            <Zap size={20} color="var(--gold)" />
          </div>
          <span className="dash-card-value">{planName}</span>
          <span className="dash-card-desc">{renewsOn}</span>
        </div>
      </div>
      
      <div className="dash-card" style={{ padding: '3rem' }}>
        <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: '1.8rem', marginBottom: '1rem' }}>Quick Actions</h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link href={`/${resolvedParams.tenantSlug}/agents`} className="btn-primary">Manage Agents</Link>
          <Link href={`/${resolvedParams.tenantSlug}/connections`} className="btn-secondary">Connect Channels</Link>
        </div>
      </div>
    </div>
  )
}
