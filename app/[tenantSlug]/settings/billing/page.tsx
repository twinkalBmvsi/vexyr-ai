import { CheckCircle2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2026-06-24.dahlia', // Latest API version
})

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

  // Fetch subscription and invoices
  let subscription: any = null
  let rawInvoices: any[] = []
  
  if (tenant) {
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('tenant_id', tenant.id)
      .maybeSingle()          // use maybeSingle to avoid 500 when no row exists
    subscription = data

    const { data: invoicesData } = await supabase
      .from('invoices')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })
    rawInvoices = invoicesData || []
  }

  // Fetch line items dynamically from Stripe
  const invoices = await Promise.all(rawInvoices.map(async (inv) => {
    let lineItems: { description: string, amount: number }[] = []
    if (inv.stripe_invoice_id && !inv.stripe_invoice_id.includes('mock')) {
      try {
        const stripeInvoice = await stripe.invoices.retrieve(inv.stripe_invoice_id)
        lineItems = stripeInvoice.lines.data.map(item => ({
          description: item.description || 'Module',
          amount: item.amount
        }))
      } catch (e) {
        console.error('Failed to fetch invoice lines for', inv.stripe_invoice_id)
      }
    } else if (inv.stripe_invoice_id.includes('mock')) {
      lineItems = [
        { description: 'Extra AI Agents × 2', amount: 3000 },
        { description: 'Custom Emails', amount: 1400 }
      ]
    }
    return { ...inv, lineItems }
  }))

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
  }

  // Build the active addons array to extract quantities and expiration dates
  const activeAddons: { label: string, quantity: number, expiresAt: string }[] = [];
  Object.entries(activeModules).forEach(([key, val]) => {
    const label = MODULE_LABELS[key] || key;
    
    // Handle the new extraBots structure (assigned_slots, unassigned_slots)
    if (key === 'extraBots' && typeof val === 'object' && val !== null && ('assigned_slots' in val || 'unassigned_slots' in val)) {
      const expiryGroups: Record<string, number> = {};

      const processSlot = (slot: any) => {
        if (slot.expires_at) {
          const exp = new Date(slot.expires_at);
          if (exp > new Date()) {
            const dateStr = exp.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
            expiryGroups[dateStr] = (expiryGroups[dateStr] || 0) + 1;
          }
        }
      };

      if ((val as any).assigned_slots) {
        Object.values((val as any).assigned_slots).forEach(processSlot);
      }
      if (Array.isArray((val as any).unassigned_slots)) {
        (val as any).unassigned_slots.forEach(processSlot);
      }

      Object.entries(expiryGroups).forEach(([dateStr, quantity]) => {
        activeAddons.push({
          label,
          quantity,
          expiresAt: dateStr
        });
      });
    } else if (Array.isArray(val)) {
      val.forEach(item => {
        if (item.expires_at && new Date(item.expires_at) > new Date()) {
          activeAddons.push({
            label,
            quantity: item.quantity || 1,
            expiresAt: new Date(item.expires_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
          })
        }
      })
    } else if (typeof val === 'object' && val !== null && (val as any).expires_at && new Date((val as any).expires_at) > new Date()) {
      activeAddons.push({
        label,
        quantity: (val as any).quantity || 1,
        expiresAt: new Date((val as any).expires_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
      })
    }
  });

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
        
        {planId === 'modular' ? (
          activeAddons.length > 0 ? (
            <div style={{ overflowX: 'auto', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', background: 'rgba(0,0,0,0.02)' }}>
                    <th style={{ padding: '1rem', fontWeight: 500, color: 'var(--muted)' }}>Module</th>
                    <th style={{ padding: '1rem', fontWeight: 500, color: 'var(--muted)' }}>Quantity</th>
                    <th style={{ padding: '1rem', fontWeight: 500, color: 'var(--muted)', textAlign: 'right' }}>Expires On</th>
                  </tr>
                </thead>
                <tbody>
                  {activeAddons.map((addon, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '1rem', fontWeight: 500 }}>{addon.label}</td>
                      <td style={{ padding: '1rem' }}>{addon.quantity}</td>
                      <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--muted)' }}>{addon.expiresAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>No add-on modules active yet.</p>
          )
        ) : (
          <ul style={{ listStyle: 'none', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {features.map((feature, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--muted)' }}>
                <CheckCircle2 size={16} color="var(--gold)" /> {feature}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '2rem', marginBottom: '3rem' }}>
        <Link
          href={`/${resolvedParams.tenantSlug}/store`}
          className="btn-primary"
          style={{ marginLeft: 'auto' }}
        >
          {planId === 'modular' ? 'Manage Modules' : 'Add Modules'}
        </Link>
      </div>

      {/* Invoices Section */}
      <div style={{ paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 500 }}>Billing History</h3>
        </div>
        
        {invoices.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.9rem', border: '1px dashed var(--border)', borderRadius: '8px' }}>
            No invoices found.
          </div>
        ) : (
          <div style={{ overflowX: 'auto', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', background: 'rgba(0,0,0,0.02)' }}>
                  <th style={{ padding: '1rem', fontWeight: 500, color: 'var(--muted)' }}>Date</th>
                  <th style={{ padding: '1rem', fontWeight: 500, color: 'var(--muted)' }}>Purchased Items</th>
                  <th style={{ padding: '1rem', fontWeight: 500, color: 'var(--muted)' }}>Total Amount</th>
                  <th style={{ padding: '1rem', fontWeight: 500, color: 'var(--muted)' }}>Status</th>
                  <th style={{ padding: '1rem', fontWeight: 500, color: 'var(--muted)', textAlign: 'right' }}>Invoice</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                      {new Date(inv.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                      {inv.lineItems && inv.lineItems.length > 0 ? (
                        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                          {inv.lineItems.map((item: any, i: number) => (
                            <li key={i} style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span>{item.description}</span>
                              <span style={{ color: 'var(--muted)', fontSize: '0.85em' }}>—</span>
                              <span style={{ color: 'var(--gold)', fontWeight: 500 }}>${(item.amount / 100).toFixed(2)}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span style={{ color: 'var(--muted)' }}>Subscription charge</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                      ${(inv.amount / 100).toFixed(2)}
                    </td>
                    <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                      <span style={{ 
                        padding: '0.2rem 0.6rem', 
                        borderRadius: '12px', 
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        backgroundColor: inv.status === 'paid' ? 'rgba(16, 185, 129, 0.1)' : (inv.status === 'failed' ? 'rgba(220, 38, 38, 0.1)' : 'rgba(245, 158, 11, 0.1)'),
                        color: inv.status === 'paid' ? '#10b981' : (inv.status === 'failed' ? '#dc2626' : '#f59e0b')
                      }}>
                        {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right', verticalAlign: 'top' }}>
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
    </>
  )
}
