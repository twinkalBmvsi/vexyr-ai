import { CheckCircle2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'

export default async function BillingSettingsPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const resolvedParams = await params
  const supabase = await createClient()

  // For billing data
  let planName = 'Free Tier'
  let planPrice = '0'
  let features = ['Basic features']
  let renewsOn = 'N/A'
  let isYearly = false
  let subscription = null

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, plan_id')
    .eq('slug', resolvedParams.tenantSlug)
    .single()

  if (tenant) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: userRole } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .eq('tenant_id', tenant.id)
        .single()
        
      if (userRole && userRole.role !== 'owner') {
        return (
          <>
            <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: '1.8rem', marginBottom: '2rem' }}>Subscription & Billing</h2>
            <div style={{ padding: '2rem', background: 'rgba(220, 38, 38, 0.05)', color: '#dc2626', borderRadius: '8px', border: '1px solid rgba(220, 38, 38, 0.2)' }}>
              You do not have permission to view or manage billing settings. Only workspace owners can access this page.
            </div>
          </>
        )
      }
    }
  }

  if (tenant) {
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('tenant_id', tenant.id)
      .single()
    subscription = data
  }

  const planId = subscription?.plan_id || tenant?.plan_id || 'free'
  isYearly = subscription?.billing_interval === 'year'

  if (planId === 'starter') {
    planName = 'Starter'
    planPrice = isYearly ? '427' : '44'
    features = ['1 AI chat agent', '1 Messaging integration', 'Customer Support (FAQ)', 'Up to 1,000 chats / month', 'Basic dashboard', 'Weekly email report']
  } else if (planId === 'growth') {
    planName = 'Growth'
    planPrice = isYearly ? '1064' : '112'
    features = ['1 AI chat agent', '2 Messaging integrations', 'Customer Support (FAQ)', 'Appointment Booking', 'Automated Follow-ups', 'Reputation Management', 'Up to 5,000 chats / month', 'Full dashboard + reports', 'AI executive summaries']
  } else if (planId === 'enterprise') {
    planName = 'Enterprise'
    planPrice = isYearly ? '2144' : '224'
    features = ['Multiple AI chat agents', 'Unlimited Messaging integrations', 'All core modules', 'Custom Email Templates', 'Meta, Google, LinkedIn Ads', 'Unlimited chats', 'Priority support', 'Custom integrations', 'Dedicated engineer hours']
  }

  renewsOn = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'N/A'

  return (
    <>
      <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: '1.8rem', marginBottom: '2rem' }}>Subscription & Billing</h2>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3rem' }}>
        <div>
          <p style={{ fontFamily: 'DM Mono', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '0.5rem' }}>Current Plan</p>
          <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: '2.5rem', fontWeight: 300, color: 'var(--ink)' }}>{planName}</h2>
          {subscription?.status === 'active' && (
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.5rem' }}>Renews on {renewsOn}</p>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontFamily: 'Cormorant Garamond', fontSize: '3rem', fontWeight: 300, color: 'var(--ink)' }}>${planPrice}<sub style={{ fontSize: '1rem', fontFamily: 'DM Sans', color: 'var(--muted)' }}>{isYearly ? '/yr' : '/mo'}</sub></span>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '2rem', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '1.5rem' }}>Plan Includes</h3>
        <ul style={{ listStyle: 'none', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {features.map((feature, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--muted)' }}>
              <CheckCircle2 size={16} color="var(--gold)" /> {feature}
            </li>
          ))}
        </ul>
      </div>

      <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
        {subscription && <button className="btn-secondary">View Invoices</button>}
        <button className="btn-primary" style={{ marginLeft: 'auto' }}>Upgrade Plan</button>
      </div>
    </>
  )
}
