import Link from 'next/link'
import { Plus, Settings2, Bot, Lock, Zap } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'

// The Base Tier allows 1 free agent. Add extraBots from modules.
const BASE_AGENT_LIMIT = 1;

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
    .select('id, plan_id')
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

  let extraBots = 0
  if (tenant) {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('modules')
      .eq('tenant_id', tenant.id)
      .maybeSingle()
    if (subscription?.modules?.extraBots) extraBots = subscription.modules.extraBots
  }

  const agentLimit = BASE_AGENT_LIMIT + extraBots
  const canCreateAgent = agents.length < agentLimit

  return (
    <div>
      <div className="dash-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="dash-title">AI Agents</h1>
          <p className="dash-subtitle">Manage your automated conversational agents.</p>
        </div>

        {canCreateAgent ? (
          <Link href={`/${resolvedParams.tenantSlug}/agents/new`} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={16} /> New Agent
          </Link>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Show limit reached badge */}
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {agents.length}/{agentLimit} agents used
            </span>
            <Link
              href={`/${resolvedParams.tenantSlug}/store`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.25rem',
                borderRadius: '6px',
                border: '1px solid var(--gold)',
                background: 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.05))',
                color: 'var(--gold)',
                textDecoration: 'none',
                fontSize: '0.85rem',
                fontWeight: 500,
                fontFamily: 'inherit'
              }}
            >
              <Zap size={15} />
              Buy Extra Agent
            </Link>
          </div>
        )}
      </div>

      {/* Plan limit banner when at limit */}
      {!canCreateAgent && agents.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          background: 'linear-gradient(135deg, rgba(212,175,55,0.08), rgba(212,175,55,0.04))',
          border: '1px solid rgba(212,175,55,0.3)',
          borderRadius: '10px',
          padding: '0.9rem 1.25rem',
          marginBottom: '1.5rem',
          fontSize: '0.85rem',
          color: 'var(--ink)'
        }}>
          <Lock size={16} color="var(--gold)" style={{ flexShrink: 0 }} />
          <span>
            You have reached your limit of <strong>{agentLimit} AI {agentLimit === 1 ? 'agent' : 'agents'}</strong>.{' '}
            <Link href={`/${resolvedParams.tenantSlug}/store`} style={{ color: 'var(--gold)', textDecoration: 'underline' }}>
              Visit the Store
            </Link>
            {' '}to buy an additional agent module.
          </span>
        </div>
      )}

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
            {canCreateAgent ? (
              <Link href={`/${resolvedParams.tenantSlug}/agents/new`} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={16} /> Create Your First Agent
              </Link>
            ) : (
              <Link href={`/${resolvedParams.tenantSlug}/store`} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--gold)' }}>
                <Zap size={16} /> Buy Agent Module
              </Link>
            )}
          </div>
        ) : (
          agents.map(agent => (
            <div key={agent.id} className="dash-card">
              <div className="dash-card-header">
                <span className="dash-card-title">{agent.language?.toUpperCase() ?? 'EN'}</span>
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
