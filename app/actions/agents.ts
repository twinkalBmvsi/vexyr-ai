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
    .select('plan_id, status')
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

  const checkModule = (key: string) => {
    const mod = modules[key]
    if (!mod) return false
    if (typeof mod === 'boolean') return mod
    if (mod.expires_at) return new Date(mod.expires_at) > new Date()
    return false
  }

  // Each channel requires its own purchased module
  if (data.whatsapp && !checkModule('whatsappChannel')) {
    return { success: false, error: 'You need an active WhatsApp Channel module to enable WhatsApp.' }
  }
  if (data.telegram && !checkModule('telegramChannel')) {
    return { success: false, error: 'You need an active Telegram Channel module to enable Telegram.' }
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

    let maxAgents = 1
    const extraBotsMod = modules.extraBots
    let availableSlotIndex = -1

    if (extraBotsMod && (extraBotsMod.assigned_slots !== undefined || extraBotsMod.unassigned_slots !== undefined)) {
      const activeAssigned = Object.keys(extraBotsMod.assigned_slots || {}).length
      const activeUnassignedSlots = (extraBotsMod.unassigned_slots || [])
      const numActiveUnassigned = activeUnassignedSlots.filter((slot: any) => slot.expires_at && new Date(slot.expires_at) > new Date()).length
      
      maxAgents += activeAssigned + numActiveUnassigned
      
      // Find an active unassigned slot to consume
      availableSlotIndex = activeUnassignedSlots.findIndex((slot: any) => slot.expires_at && new Date(slot.expires_at) > new Date())
    } else if (extraBotsMod && typeof extraBotsMod === 'object' && extraBotsMod.expires_at && new Date(extraBotsMod.expires_at) > new Date()) {
      maxAgents += (extraBotsMod.quantity || 0)
    } else if (extraBotsMod && typeof extraBotsMod === 'number') {
      maxAgents += extraBotsMod
    }

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

    // Consume slot if this is an extra agent
    if (count !== null && count > 0 && availableSlotIndex !== -1 && extraBotsMod?.unassigned_slots) {
       const consumedSlot = extraBotsMod.unassigned_slots.splice(availableSlotIndex, 1)[0]
       extraBotsMod.assigned_slots = extraBotsMod.assigned_slots || {}
       extraBotsMod.assigned_slots[targetAgentId] = consumedSlot
       modules.extraBots = extraBotsMod
       await supabase.from('subscriptions').update({ modules }).eq('tenant_id', tenant.id)
    }
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

  // 5.5 Check for assigned slots to return to pool
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('modules')
    .eq('tenant_id', tenant.id)
    .maybeSingle()

  const modules = sub?.modules || {}
  let updatedModules = false

  if (modules.extraBots && modules.extraBots.assigned_slots) {
     if (modules.extraBots.assigned_slots[agentId]) {
        const slotToReturn = modules.extraBots.assigned_slots[agentId];
        delete modules.extraBots.assigned_slots[agentId];
        modules.extraBots.unassigned_slots = modules.extraBots.unassigned_slots || [];
        modules.extraBots.unassigned_slots.push(slotToReturn);
        updatedModules = true;
     }
  }

  // 6. Delete the agent
  const { error: deleteError } = await supabase
    .from('agents')
    .delete()
    .eq('id', agentId)
    .eq('tenant_id', tenant.id)

  if (deleteError) {
    return { success: false, error: deleteError.message }
  }

  // 7. Check if the new base agent needs to be unbound
  if (modules.extraBots && modules.extraBots.assigned_slots) {
    const { data: remainingAgents } = await supabase
      .from('agents')
      .select('id')
      .eq('tenant_id', tenant.id)
      .order('id', { ascending: true })
      .limit(1)
    
    if (remainingAgents && remainingAgents.length > 0) {
      const newBaseAgentId = remainingAgents[0].id;
      if (modules.extraBots.assigned_slots[newBaseAgentId]) {
         const slotToReturn = modules.extraBots.assigned_slots[newBaseAgentId];
         delete modules.extraBots.assigned_slots[newBaseAgentId];
         modules.extraBots.unassigned_slots = modules.extraBots.unassigned_slots || [];
         modules.extraBots.unassigned_slots.push(slotToReturn);
         updatedModules = true;
      }
    }
  }

  if (updatedModules) {
     await supabase.from('subscriptions').update({ modules }).eq('tenant_id', tenant.id)
  }

  revalidatePath(`/${tenantSlug}/agents`)

  return { success: true }
}
