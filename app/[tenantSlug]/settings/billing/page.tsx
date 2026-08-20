import { CheckCircle2, ExternalLink } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'

const MODULE_LABELS: Record<string, string> = {
  extraBots: 'Extra AI Agents',
  whatsappChannel: 'WhatsApp Channel',
  telegramChannel: 'Telegram Channel',
  customEmails: 'Custom Emails',
  autoFollowups: 'Auto Follow-ups',
  unlimitedChats: 'Unlimited Chats',
  calendarSync: '3rd-Party Calendar Sync',
  broadcastMessaging: 'Broadcast Messaging',
  reputationManagement: 'Reputation Management',
  metaAds: 'Meta Ads Reporting',
  googleAds: 'Google Ads Reporting',
  telegramAds: 'Telegram Ads Reporting',
  removeBranding: 'Remove Branding',
  messagingChannels: 'Messaging Channels',
}

export default async function BillingSettingsPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const resolvedParams = await params
  const supabase = await createClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, plan_id')
    .eq('slug', resolvedParams.tenantSlug)
    .single()

  // Check role — only owners can see billing
  if (tenant) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: userRole } = await supabase
        .from('users')
        .select('role')
        .eq('user_id', user.id)
        .eq('tenant_id', tenant.id)
        .single()

      if (userRole && userRole.role !== 'owner') {
        return (
          <>
            <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: '1.8rem', marginBottom: '2rem' }}>Subscription &amp; Billing</h2>
            <div style={{ padding: '2rem', background: 'rgba(220,38,38,0.05)', color: '#dc2626', borderRadius: '8px', border: '1px solid rgba(220,38,38,0.2)' }}>
              You do not have permission to view or manage billing settings. Only workspace owners can access this page.
            </div>
          </>
        )
      }
    }
  }

  // Fetch subscription
  let subscription: any = null
  if (tenant) {
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('tenant_id', tenant.id)
      .maybeSingle()          // use maybeSingle to avoid 500 when no row exists
    subscription = data
  }

  const planId = subscription?.plan_id || tenant?.plan_id || 'free'
  const isYearly = subscription?.billing_interval === 'year'
  const activeModules: Record<string, any> = subscription?.modules || {}

  // Build plan display data
  let planName = 'Free Tier'
  let planPrice = '0'
  let features: string[] = ['Basic features — free forever']

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
  } else if (planId === 'modular') {
    planName = 'Modular Plan'
    planPrice = '—'
    features = Object.entries(activeModules)
      .filter(([, val]) => Boolean(val))
      .map(([key, val]) => {
        const label = MODULE_LABELS[key] || key
        return typeof val === 'number' && val > 1 ? `${label} ×${val}` : label
      })
    if (features.length === 0) features = ['No add-on modules active yet']
  }

  const rawRenewalDate = subscription?.current_period_end 
    ? new Date(subscription.current_period_end)
    : subscription ? new Date(new Date(subscription.created_at).getTime() + 30 * 24 * 60 * 60 * 1000) : null;

  const renewsOn = rawRenewalDate
    ? rawRenewalDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null

  const isActive = subscription?.status === 'active'

  return (
    <>
      <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: '1.8rem', marginBottom: '2rem' }}>Subscription &amp; Billing</h2>

      {/* Plan header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3rem' }}>
        <div>
          <p style={{ fontFamily: 'DM Mono', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '0.5rem' }}>Current Plan</p>
          <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: '2.5rem', fontWeight: 300, color: 'var(--ink)' }}>{planName}</h2>
          {isActive && renewsOn && (
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.5rem' }}>Renews on {renewsOn}</p>
          )}
          {!subscription && (
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.5rem' }}>No active subscription</p>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          {/* Badge showing subscription status */}
          {subscription && (
            <span style={{
              display: 'inline-block',
              padding: '0.3rem 0.8rem',
              borderRadius: '100px',
              fontSize: '0.75rem',
              fontFamily: 'DM Mono',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              background: isActive ? 'rgba(42,122,74,0.1)' : 'rgba(220,38,38,0.08)',
              color: isActive ? '#2a7a4a' : '#dc2626',
              border: isActive ? '1px solid rgba(42,122,74,0.3)' : '1px solid rgba(220,38,38,0.2)',
              marginBottom: '0.75rem',
            }}>
              {subscription.status}
            </span>
          )}
          <br />
          {planPrice !== '—' ? (
            <span style={{ fontFamily: 'Cormorant Garamond', fontSize: '3rem', fontWeight: 300, color: 'var(--ink)' }}>
              ${planPrice}<sub style={{ fontSize: '1rem', fontFamily: 'DM Sans', color: 'var(--muted)' }}>{isYearly ? '/yr' : '/mo'}</sub>
            </span>
          ) : (
            <span style={{ fontFamily: 'DM Mono', fontSize: '1rem', color: 'var(--muted)' }}>Billed per module</span>
          )}
        </div>
      </div>

      {/* Features / Active modules list */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '2rem', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '1.5rem' }}>
          {planId === 'modular' ? 'Active Add-on Modules' : 'Plan Includes'}
        </h3>
        <ul style={{ listStyle: 'none', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {features.map((feature, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--muted)' }}>
              <CheckCircle2 size={16} color="var(--gold)" /> {feature}
            </li>
          ))}
        </ul>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
        {subscription && <button className="btn-secondary">View Invoices</button>}
        <Link
          href={`/${resolvedParams.tenantSlug}/store`}
          className="btn-primary"
          style={{ marginLeft: 'auto' }}
        >
          {planId === 'modular' ? 'Manage Modules' : 'Add Modules'}
        </Link>
      </div>
    </>
  )
}
