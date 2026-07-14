import Link from 'next/link'
import { Bot, MessageCircle, Zap } from 'lucide-react'

export default async function TenantDashboard({
  params,
}: {
  params: Promise<{ tenantSlug: string }>
}) {
  const resolvedParams = await params
  
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
          <span className="dash-card-value">2</span>
          <span className="dash-card-desc">1 WhatsApp, 1 Telegram</span>
        </div>

        <div className="dash-card">
          <div className="dash-card-header">
            <span className="dash-card-title">Conversations</span>
            <MessageCircle size={20} color="var(--gold)" />
          </div>
          <span className="dash-card-value">1,204</span>
          <span className="dash-card-desc">+12% from yesterday</span>
        </div>

        <div className="dash-card">
          <div className="dash-card-header">
            <span className="dash-card-title">Current Plan</span>
            <Zap size={20} color="var(--gold)" />
          </div>
          <span className="dash-card-value">Pro</span>
          <span className="dash-card-desc">Renews in 14 days</span>
        </div>
      </div>
      
      <div className="dash-card" style={{ padding: '3rem' }}>
        <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: '1.8rem', marginBottom: '1rem' }}>Quick Actions</h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link href="/agents" className="btn-primary">Manage Agents</Link>
          <Link href="/connections" className="btn-secondary">Connect Channels</Link>
        </div>
      </div>
    </div>
  )
}
