import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import AgentForm from '@/components/dashboard/AgentForm'

export default async function AgentConfigPage({
  params,
}: {
  params: Promise<{ tenantSlug: string, agentId: string }>
}) {
  const resolvedParams = await params
  const isNew = resolvedParams.agentId === 'new'

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <Link href={`/agents`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--muted)', textDecoration: 'none', fontSize: '0.8rem', fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          <ArrowLeft size={16} /> Back to Agents
        </Link>
      </div>

      <div className="dash-header">
        <h1 className="dash-title">{isNew ? 'Create New Agent' : 'Configure Agent'}</h1>
        <p className="dash-subtitle">Set up the identity, tone, and system prompt for this AI agent.</p>
      </div>

      <AgentForm agentId={resolvedParams.agentId} tenantSlug={resolvedParams.tenantSlug} />
    </div>
  )
}
