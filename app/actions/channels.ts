'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function saveChannelConfig(
  tenantSlug: string, 
  provider: 'whatsapp' | 'telegram', 
  config: any,
  routingMode?: 'ai' | 'flow'
) {
  const supabase = await createClient()

  // 1. Verify auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // 2. Get tenant ID
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
    .single()

  if (!userRecord) {
    return { success: false, error: 'Unauthorized for this tenant' }
  }

  // 4. Find the first agent for this tenant to attach the channel to
  const { data: agents } = await supabase
    .from('agents')
    .select('id')
    .eq('tenant_id', tenant.id)
    .limit(1)
  
  let agentId = null
  if (agents && agents.length > 0) {
    agentId = agents[0].id
  }

  // If they want AI mode but have no agent, return error
  if (!agentId && routingMode === 'ai') {
    return { success: false, error: 'Please create an AI Agent before enabling AI mode.' }
  }

  // 5. Check if channel already exists for this provider
  const { data: existingChannel } = await supabase
    .from('channels')
    .select('id')
    .eq('tenant_id', tenant.id)
    .eq('provider', provider)
    .single()

  if (existingChannel) {
    // Update existing
    const updatePayload: any = {
      provider_config: config,
      agent_id: agentId
    }
    if (routingMode) updatePayload.routing_mode = routingMode

    const { error } = await supabase
      .from('channels')
      .update(updatePayload)
      .eq('id', existingChannel.id)
      
    if (error) {
      return { success: false, error: error.message }
    }
  } else {
    // Insert new
    const { error } = await supabase
      .from('channels')
      .insert({
        tenant_id: tenant.id,
        agent_id: agentId,
        provider,
        provider_config: config,
        routing_mode: routingMode || 'ai'
      })
      
    if (error) {
      return { success: false, error: error.message }
    }
  }

  revalidatePath(`/${tenantSlug}/connections`)
  return { success: true }
}
