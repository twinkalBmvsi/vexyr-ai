import { CreditCard, Zap, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'

export default async function BillingPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const resolvedParams = await params
  const supabase = await createClient()

  // Fetch the tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, plan_id')
    .eq('slug', resolvedParams.tenantSlug)
    .single()

  let invoices: any[] = []
  if (tenant) {
    // Fetch the active subscription
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('tenant_id', tenant.id)
      .single()
    subscription = data

    // Fetch invoices
    const { data: invoicesData } = await supabase
      .from('invoices')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })
    invoices = invoicesData || []
  }

  const planId = subscription?.plan_id || tenant?.plan_id || 'free'
  const isYearly = subscription?.billing_interval === 'year'
  const activeModules: Record<string, any> = subscription?.modules || {}

  // Module display labels
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

  let planName = 'Free Tier'
  let planPrice = '0'
  let features: string[] = ['Basic features']

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
    planPrice = '—' // dynamic, billed per module
    features = Object.entries(activeModules)
      .filter(([, val]) => Boolean(val))
      .map(([key, val]) => {
        const label = MODULE_LABELS[key] || key
        return typeof val === 'number' && val > 1 ? `${label} ×${val}` : label
      })
    if (features.length === 0) features = ['No modules active yet']
  }

  const renewsOn = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'N/A'

  return (
    <div>
      <div className="dash-header">
        <h1 className="dash-title">Subscription & Billing</h1>
        <p className="dash-subtitle">Manage your plan and billing details.</p>
      </div>

      <div className="dash-grid" style={{ gridTemplateColumns: '1fr', maxWidth: '800px' }}>
        <div className="dash-card" style={{ padding: '3rem' }}>
          
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
            <button className="btn-primary" style={{ marginLeft: 'auto' }}>Upgrade Plan</button>
          </div>

        </div>

        {/* Invoices Section */}
        <div className="dash-card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 500 }}>Billing History</h3>
          </div>
          
          {invoices.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.9rem', border: '1px dashed var(--border)', borderRadius: '8px' }}>
              No invoices found.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                    <th style={{ padding: '1rem 0.5rem', fontWeight: 500, color: 'var(--muted)' }}>Date</th>
                    <th style={{ padding: '1rem 0.5rem', fontWeight: 500, color: 'var(--muted)' }}>Amount</th>
                    <th style={{ padding: '1rem 0.5rem', fontWeight: 500, color: 'var(--muted)' }}>Status</th>
                    <th style={{ padding: '1rem 0.5rem', fontWeight: 500, color: 'var(--muted)', textAlign: 'right' }}>Invoice</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '1rem 0.5rem' }}>
                        {new Date(inv.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td style={{ padding: '1rem 0.5rem' }}>
                        ${(inv.amount / 100).toFixed(2)}
                      </td>
                      <td style={{ padding: '1rem 0.5rem' }}>
                        <span style={{ 
                          padding: '0.2rem 0.6rem', 
                          borderRadius: '12px', 
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          backgroundColor: inv.status === 'paid' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                          color: inv.status === 'paid' ? '#10b981' : '#f59e0b'
                        }}>
                          {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>
                        {inv.pdf_url ? (
                          <a href={inv.pdf_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)', textDecoration: 'none', fontWeight: 500, fontSize: '0.85rem' }}>
                            Download PDF
                          </a>
                        ) : (
                          <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Not available</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
