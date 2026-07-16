import { CreditCard, Zap, CheckCircle2 } from 'lucide-react'

export default async function BillingPage() {
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
              <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: '2.5rem', fontWeight: 300, color: 'var(--ink)' }}>Pro Tier</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.5rem' }}>Renews on August 14, 2026</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontFamily: 'Cormorant Garamond', fontSize: '3rem', fontWeight: 300, color: 'var(--ink)' }}>$99<sub style={{ fontSize: '1rem', fontFamily: 'DM Sans', color: 'var(--muted)' }}>/mo</sub></span>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '2rem', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '1.5rem' }}>Plan Includes</h3>
            <ul style={{ listStyle: 'none', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {['Up to 5 AI Agents', 'WhatsApp & Telegram Integration', 'Unlimited Conversations', 'Custom System Prompts', 'Priority Support', 'Advanced Analytics'].map((feature, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--muted)' }}>
                  <CheckCircle2 size={16} color="var(--gold)" /> {feature}
                </li>
              ))}
            </ul>
          </div>

          <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
            <button className="btn-secondary">View Invoices</button>
            <button className="btn-primary" style={{ marginLeft: 'auto' }}>Upgrade Plan</button>
          </div>

        </div>
      </div>
    </div>
  )
}
