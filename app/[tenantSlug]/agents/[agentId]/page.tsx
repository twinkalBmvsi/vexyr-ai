import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import AgentForm from '@/components/dashboard/AgentForm'
import { getAgentConfig } from '@/app/actions/agents'
import { createClient } from '@/utils/supabase/server'
import WebChatClient from '@/components/dashboard/WebChatClient'

export default async function AgentConfigPage({
  params,
}: {
  params: Promise<{ tenantSlug: string, agentId: string }>
}) {
  const resolvedParams = await params
  const isNew = resolvedParams.agentId === 'new'
  const supabase = await createClient()

  // Fetch subscription to see which channels are purchased
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', resolvedParams.tenantSlug)
    .single()

  let hasWhatsapp = false
  let hasTelegram = false

  if (tenant) {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('modules')
      .eq('tenant_id', tenant.id)
      .maybeSingle()
    
    if (subscription?.modules) {
      hasWhatsapp = Boolean(subscription.modules.whatsappChannel)
      hasTelegram = Boolean(subscription.modules.telegramChannel)
    }
  }

  const configData = await getAgentConfig(resolvedParams.tenantSlug, resolvedParams.agentId)

  const initialData = configData?.agent ? {
    name: configData.agent.name,
    businessName: configData.businessName,
    description: configData.description,
    services: configData.services
  } : null

  // Fetch test chat data if not new
  let testChatProps = null
  if (!isNew && tenant && configData?.agent) {
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)
      .eq('sender_type', 'user')
      .gte('created_at', startOfMonth.toISOString())

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('modules')
      .eq('tenant_id', tenant.id)
      .maybeSingle()

    const unlimitedMod = sub?.modules?.unlimitedChats
    const isUnlimited = unlimitedMod && (
      unlimitedMod === true || (typeof unlimitedMod === 'object' && unlimitedMod.expires_at && new Date(unlimitedMod.expires_at) > new Date())
    )
    const removeBrandingMod = sub?.modules?.removeBranding
    const hasBrandingRemoved = !!removeBrandingMod && (
      removeBrandingMod === true || (typeof removeBrandingMod === 'object' && removeBrandingMod.expires_at && new Date(removeBrandingMod.expires_at) > new Date())
    )
    
    const used = count || 0
    const remaining = isUnlimited ? null : Math.max(0, 50 - used)

    let businessName = tenant.name || resolvedParams.tenantSlug
    if (configData.agent.business_rules) {
      try {
        const rules = JSON.parse(configData.agent.business_rules)
        businessName = rules.business_name || businessName
      } catch (e) {}
    }

    testChatProps = {
      tenantSlug: resolvedParams.tenantSlug,
      agentName: configData.agent.name,
      businessName,
      hasAgent: true,
      initialRemaining: remaining,
      isUnlimited,
      removeBranding: hasBrandingRemoved
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <Link href={`/${resolvedParams.tenantSlug}/agents`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--muted)', textDecoration: 'none', fontSize: '0.8rem', fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          <ArrowLeft size={16} /> Back to Agents
        </Link>
      </div>

      <div className="dash-header">
        <h1 className="dash-title">{isNew ? 'Create New Agent' : 'Configure Agent'}</h1>
        <p className="dash-subtitle">Configure your AI agent's details and active channels.</p>
      </div>

      <AgentForm 
        agentId={resolvedParams.agentId} 
        tenantSlug={resolvedParams.tenantSlug} 
        initialData={initialData}
        initialWhatsapp={configData?.whatsappActive ?? false}
        initialTelegram={configData?.telegramActive ?? false}
        hasWhatsapp={hasWhatsapp}
        hasTelegram={hasTelegram}
        testChatProps={testChatProps}
      />
    </div>
  )
}
