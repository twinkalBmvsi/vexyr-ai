'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export interface SaveAgentConfigParams {
  name: string
  businessName: string
  description: string
  services: string
  whatsapp: boolean
  telegram: boolean
}

export async function getAgentConfig(tenantSlug: string, agentId: string) {
  const supabase = await createClient()

  // 1. Get tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', tenantSlug)
    .single()

  if (!tenant) return null

  if (agentId === 'new') {
    return {
      agent: null,
      whatsappActive: false,
      telegramActive: false,
      businessName: '',
      description: '',
      services: ''
    }
  }

  // 2. Fetch agent
  let agent: any = null
  const { data } = await supabase
    .from('agents')
    .select('*')
    .eq('id', agentId)
    .eq('tenant_id', tenant.id)
    .maybeSingle()
  agent = data

  if (!agent) {
    return null
  }

  // 3. Fetch channels for this tenant
  const { data: channels } = await supabase
    .from('channels')
    .select('*')
    .eq('tenant_id', tenant.id)

  let activeChannelsFromRules: string[] | null = null
  if (agent?.business_rules) {
    try {
      const rules = JSON.parse(agent.business_rules)
      if (Array.isArray(rules.active_channels)) {
        activeChannelsFromRules = rules.active_channels
      }
    } catch (e) {
      // Ignore JSON parse error
    }
  }

  let whatsappActive = false
  let telegramActive = false

  if (activeChannelsFromRules !== null) {
    whatsappActive = activeChannelsFromRules.includes('whatsapp')
    telegramActive = activeChannelsFromRules.includes('telegram')
  } else if (channels && channels.length > 0) {
    const wa = channels.find(c => c.provider === 'whatsapp')
    const tg = channels.find(c => c.provider === 'telegram')
    whatsappActive = wa ? (wa.is_active ?? false) : false
    telegramActive = tg ? (tg.is_active ?? false) : false
  }

  let businessName = ''
  let description = ''
  let services = ''
  if (agent?.business_rules) {
    try {
      const rules = JSON.parse(agent.business_rules)
      businessName = rules.business_name || ''
      description = rules.description || ''
      services = rules.services || ''
    } catch (e) {}
  }

  return {
    agent,
    whatsappActive,
    telegramActive,
    businessName,
    description,
    services
  }
}

export async function saveAgentConfig(
  tenantSlug: string,
  agentId: string,
  data: SaveAgentConfigParams
) {
  const supabase = await createClient()

  // 1. Verify auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // 2. Get tenant ID and plan
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, plan_id')
    .eq('slug', tenantSlug)
    .single()

  if (!tenant) {
    return { success: false, error: 'Tenant not found' }
  }

  // 3. Verify user belongs to tenant
  const { data: userRecord } = await supabase
    .from('users')
    .select('id')
    .eq('user_id', user.id)
    .eq('tenant_id', tenant.id)
    .maybeSingle()

  if (!userRecord) {
    return { success: false, error: 'Unauthorized for this tenant' }
  }

  // 4. Resolve plan from subscriptions table first (same as billing page)
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan_id')
    .eq('tenant_id', tenant.id)
    .maybeSingle()

  const planId = subscription?.plan_id || tenant.plan_id || 'free'

  const activeChannels: string[] = []
  if (data.whatsapp) activeChannels.push('whatsapp')
  if (data.telegram) activeChannels.push('telegram')

  // Check purchased channel modules
  const { data: moduleSub } = await supabase
    .from('subscriptions')
    .select('modules')
    .eq('tenant_id', tenant.id)
    .maybeSingle()

  const modules = moduleSub?.modules || {}

  // Each channel requires its own purchased module
  if (data.whatsapp && !modules.whatsappChannel) {
    return { success: false, error: 'You need to purchase the WhatsApp Channel module from the Store to activate WhatsApp.' }
  }
  if (data.telegram && !modules.telegramChannel) {
    return { success: false, error: 'You need to purchase the Telegram Channel module from the Store to activate Telegram.' }
  }

  let targetAgentId = agentId

  if (agentId === 'new') {
    // Free Base Engine: max 1 agent
    // Extra Agents module: allows more
    const { count, error: countError } = await supabase
      .from('agents')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)

    if (countError) {
      return { success: false, error: 'Failed to check agent limits' }
    }

    const maxAgents = modules.extraAgents ? 5 : 1

    if (count !== null && count >= maxAgents) {
      return { success: false, error: `You can have up to ${maxAgents} agent${maxAgents > 1 ? 's' : ''} on your current plan. Purchase the Extra Agents module from the Store to add more.` }
    }

    // Create new agent
    const { data: newAgent, error: createError } = await supabase
      .from('agents')
      .insert({
        tenant_id: tenant.id,
        name: data.name,
        business_rules: JSON.stringify({
          business_name: data.businessName,
          description: data.description,
          services: data.services,
          active_channels: []
        })
      })
      .select('id')
      .single()

    if (createError || !newAgent) {
      return { success: false, error: createError?.message || 'Failed to create agent' }
    }
    targetAgentId = newAgent.id
  } else {
    // Check if agent exists
    const { data: existingAgent } = await supabase
      .from('agents')
      .select('id')
      .eq('id', agentId)
      .eq('tenant_id', tenant.id)
      .maybeSingle()

    if (!existingAgent) {
      // Insert if not existing
      const { data: newAgent, error: insertErr } = await supabase
        .from('agents')
        .insert({
          tenant_id: tenant.id,
          name: data.name,
          business_rules: JSON.stringify({
            business_name: data.businessName,
            description: data.description,
            services: data.services,
            active_channels: []
          })
        })
        .select('id')
        .single()
      if (insertErr || !newAgent) {
        return { success: false, error: insertErr?.message || 'Failed to create agent' }
      }
      targetAgentId = newAgent.id
    } else {
      // Update existing agent
      const { error: updateError } = await supabase
        .from('agents')
        .update({
          name: data.name,
        })
        .eq('id', agentId)
        .eq('tenant_id', tenant.id)

      if (updateError) {
        return { success: false, error: updateError.message }
      }
    }
  }

  // Update channels table for WhatsApp if record exists
  const { data: existingWa } = await supabase
    .from('channels')
    .select('id')
    .eq('tenant_id', tenant.id)
    .eq('provider', 'whatsapp')
    .maybeSingle()

  if (existingWa) {
    const { error: errWa } = await supabase
      .from('channels')
      .update({ is_active: data.whatsapp, agent_id: targetAgentId })
      .eq('id', existingWa.id)
    
    if (errWa) {
      await supabase
        .from('channels')
        .update({ agent_id: targetAgentId })
        .eq('id', existingWa.id)
    }
  }

  // Update channels table for Telegram if record exists
  const { data: existingTg } = await supabase
    .from('channels')
    .select('id')
    .eq('tenant_id', tenant.id)
    .eq('provider', 'telegram')
    .maybeSingle()

  if (existingTg) {
    const { error: errTg } = await supabase
      .from('channels')
      .update({ is_active: data.telegram, agent_id: targetAgentId })
      .eq('id', existingTg.id)

    if (errTg) {
      await supabase
        .from('channels')
        .update({ agent_id: targetAgentId })
        .eq('id', existingTg.id)
    }
  }

  // Update business_rules with active_channels array
  const { data: agentRecord } = await supabase
    .from('agents')
    .select('business_rules')
    .eq('id', targetAgentId)
    .single()

  let parsedRules: any = {}
  try {
    if (agentRecord?.business_rules) {
      parsedRules = JSON.parse(agentRecord.business_rules)
    }
  } catch (e) {
    parsedRules = {}
  }
  parsedRules.active_channels = activeChannels
  parsedRules.business_name = data.businessName
  parsedRules.description = data.description
  parsedRules.services = data.services

  await supabase
    .from('agents')
    .update({
      business_rules: JSON.stringify(parsedRules)
    })
    .eq('id', targetAgentId)

  revalidatePath(`/${tenantSlug}/agents`)
  revalidatePath(`/${tenantSlug}/agents/${targetAgentId}`)

  return { success: true, agentId: targetAgentId }
}

export async function deleteAgent(tenantSlug: string, agentId: string) {
  const supabase = await createClient()

  // 1. Verify auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // 2. Get tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', tenantSlug)
    .single()

  if (!tenant) {
    return { success: false, error: 'Tenant not found' }
  }

  // 3. Verify user belongs to tenant
  const { data: userRecord } = await supabase
    .from('users')
    .select('id')
    .eq('user_id', user.id)
    .eq('tenant_id', tenant.id)
    .maybeSingle()

  if (!userRecord) {
    return { success: false, error: 'Unauthorized for this tenant' }
  }

  // 4. Verify agent belongs to this tenant
  const { data: agent } = await supabase
    .from('agents')
    .select('id')
    .eq('id', agentId)
    .eq('tenant_id', tenant.id)
    .maybeSingle()

  if (!agent) {
    return { success: false, error: 'Agent not found' }
  }

  // 5. Nullify agent_id on all linked channels so webhooks don't break
  await supabase
    .from('channels')
    .update({ agent_id: null })
    .eq('agent_id', agentId)
    .eq('tenant_id', tenant.id)

  // 6. Delete the agent
  const { error: deleteError } = await supabase
    .from('agents')
    .delete()
    .eq('id', agentId)
    .eq('tenant_id', tenant.id)

  if (deleteError) {
    return { success: false, error: deleteError.message }
  }

  revalidatePath(`/${tenantSlug}/agents`)

  return { success: true }
}
