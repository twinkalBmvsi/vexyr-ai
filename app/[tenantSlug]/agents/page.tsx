import Link from 'next/link'
import { Plus, Settings2, Bot } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'

export default async function AgentsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>
}) {
  const resolvedParams = await params
  const supabase = await createClient()

  // Find the tenant id by slug
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', resolvedParams.tenantSlug)
    .single()

  let agents: any[] = []
  if (tenant) {
    const { data } = await supabase
      .from('agents')
      .select('*')
      .eq('tenant_id', tenant.id)
      
    agents = data || []
  }

  return (
    <div>
      <div className="dash-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="dash-title">AI Agents</h1>
          <p className="dash-subtitle">Manage your automated conversational agents.</p>
        </div>
        <Link href={`/${resolvedParams.tenantSlug}/agents/new`} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={16} /> New Agent
        </Link>
      </div>

      <div className="dash-grid">
        {agents.length === 0 ? (
          <div className="dash-card" style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 2rem', textAlign: 'center', borderStyle: 'dashed', borderWidth: '1px' }}>
            <div style={{ background: 'var(--paper)', padding: '1.25rem', borderRadius: '50%', marginBottom: '1.5rem', border: '1px solid var(--border)' }}>
              <Bot size={36} color="var(--gold)" />
            </div>
            <h3 style={{ fontSize: '1.75rem', fontFamily: 'Cormorant Garamond', fontWeight: 300, color: 'var(--ink)', marginBottom: '0.75rem' }}>No Agents Configured</h3>
            <p style={{ color: 'var(--muted)', maxWidth: '450px', marginBottom: '2rem', lineHeight: 1.6 }}>
              You haven't created any AI agents yet. Build your first intelligent assistant to start automating your scheduling and customer conversations.
            </p>
            <Link href={`/${resolvedParams.tenantSlug}/agents/new`} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={16} /> Create Your First Agent
            </Link>
          </div>
        ) : (
          agents.map(agent => (
            <div key={agent.id} className="dash-card">
              <div className="dash-card-header">
                <span className="dash-card-title">{agent.language.toUpperCase()}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ 
                    display: 'inline-block', 
                    width: 8, height: 8, 
                    borderRadius: '50%', 
                    background: '#2a7a4a'
                  }} />
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Active
                  </span>
                </div>
              </div>
              <span className="dash-card-value" style={{ fontSize: '1.8rem' }}>{agent.name}</span>
              
              <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
                <Link href={`/${resolvedParams.tenantSlug}/agents/${agent.id}`} className="btn-secondary" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'center' }}>
                  <Settings2 size={16} /> Configure
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
