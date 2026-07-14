import { MessageCircle, Smartphone, CheckCircle2, AlertCircle } from 'lucide-react'

export default async function ConnectionsPage() {
  return (
    <div>
      <div className="dash-header">
        <h1 className="dash-title">Channel Connections</h1>
        <p className="dash-subtitle">Link your messaging platforms to Glamour Studio.</p>
      </div>

      <div className="dash-grid" style={{ gap: '2rem' }}>
        {/* WhatsApp Connection */}
        <div className="dash-card">
          <div className="dash-card-header">
            <span className="dash-card-title">WhatsApp Business API</span>
            <MessageCircle size={24} color="#25D366" />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <CheckCircle2 size={18} color="#2a7a4a" />
            <span style={{ fontSize: '0.85rem', color: 'var(--ink)' }}>Connected successfully</span>
          </div>

          <div style={{ background: 'rgba(12,12,12,0.03)', padding: '1rem', borderRadius: '8px', marginBottom: '2rem' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>Connected Number</p>
            <p style={{ fontFamily: 'DM Mono', fontSize: '0.9rem', color: 'var(--ink)' }}>+1 (555) 019-2834</p>
          </div>

          <div style={{ marginTop: 'auto' }}>
            <button className="btn-secondary" style={{ width: '100%' }}>Manage Connection</button>
          </div>
        </div>

        {/* Telegram Connection */}
        <div className="dash-card">
          <div className="dash-card-header">
            <span className="dash-card-title">Telegram Bot API</span>
            <Smartphone size={24} color="#0088cc" />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <AlertCircle size={18} color="var(--gold)" />
            <span style={{ fontSize: '0.85rem', color: 'var(--ink)' }}>Not connected</span>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '2rem' }}>
            Connect a Telegram Bot to allow your AI agents to interact with customers on Telegram.
          </p>

          <div style={{ marginTop: 'auto' }}>
            <button className="btn-primary" style={{ width: '100%' }}>Connect Telegram</button>
          </div>
        </div>
      </div>
    </div>
  )
}
