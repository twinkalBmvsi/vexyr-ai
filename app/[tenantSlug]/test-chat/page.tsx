import { createClient } from '@/utils/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import WebChatClient from '@/components/dashboard/WebChatClient'

const supabaseAdmin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export default async function TestChatPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get tenant
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id, name')
    .eq('slug', tenantSlug)
    .single()

  if (!tenant) redirect('/login')

  // Get agent
  const { data: agents } = await supabaseAdmin
    .from('agents')
    .select('id, name, business_rules')
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: true })
    .limit(1)

  const agent = agents?.[0] || null

  let businessName = tenant.name || tenantSlug
  let agentName = 'AI Assistant'
  if (agent?.business_rules) {
    try {
      const rules = JSON.parse(agent.business_rules)
      businessName = rules.business_name || businessName
    } catch (e) {}
  }
  if (agent?.name) agentName = agent.name

  // Get remaining interactions this month
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { count } = await supabaseAdmin
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenant.id)
    .eq('sender_type', 'user')
    .gte('created_at', startOfMonth.toISOString())

  // Check if unlimited
  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('modules')
    .eq('tenant_id', tenant.id)
    .maybeSingle()

  const unlimitedMod = sub?.modules?.unlimitedChats
  const isUnlimited = unlimitedMod && (
    unlimitedMod === true || (typeof unlimitedMod === 'object' && unlimitedMod.expires_at && new Date(unlimitedMod.expires_at) > new Date())
  )
  const used = count || 0
  const remaining = isUnlimited ? null : Math.max(0, 50 - used)

  return (
    <WebChatClient
      tenantSlug={tenantSlug}
      agentName={agentName}
      businessName={businessName}
      hasAgent={!!agent}
      initialRemaining={remaining}
      isUnlimited={isUnlimited}
    />
  )
}
