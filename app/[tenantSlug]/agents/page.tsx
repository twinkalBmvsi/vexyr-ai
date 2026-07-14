import Link from 'next/link'
import { Plus, Settings2 } from 'lucide-react'

export default async function AgentsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>
}) {
  const resolvedParams = await params

  // Mock data for initial UI
  const agents = [
    { id: '1', name: 'Sales Assistant', channel: 'WhatsApp', status: 'Active' },
    { id: '2', name: 'Support Bot', channel: 'Telegram', status: 'Offline' }
  ]

  return (
    <div>
      <div className="dash-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="dash-title">AI Agents</h1>
          <p className="dash-subtitle">Manage your automated conversational agents.</p>
        </div>
        <Link href={`/agents/new`} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={16} /> New Agent
        </Link>
      </div>

      <div className="dash-grid">
        {agents.map(agent => (
          <div key={agent.id} className="dash-card">
            <div className="dash-card-header">
              <span className="dash-card-title">{agent.channel}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ 
                  display: 'inline-block', 
                  width: 8, height: 8, 
                  borderRadius: '50%', 
                  background: agent.status === 'Active' ? '#2a7a4a' : 'var(--muted)' 
                }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {agent.status}
                </span>
              </div>
            </div>
            <span className="dash-card-value" style={{ fontSize: '1.8rem' }}>{agent.name}</span>
            
            <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
              <Link href={`/agents/${agent.id}`} className="btn-secondary" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'center' }}>
                <Settings2 size={16} /> Configure
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
