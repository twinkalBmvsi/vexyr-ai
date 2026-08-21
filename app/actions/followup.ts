'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export type FollowUpConfig = {
  enabled: boolean
  delayHours: number
  agentName: string
  instructions: string
}

const DEFAULT_CONFIG: FollowUpConfig = {
  enabled: true,
  delayHours: 2,
  agentName: 'Customer Success Team',
  instructions: 'Ask them if they were satisfied with the service and if they have any feedback. Then, kindly ask them to leave a 5-star review on our Google Business page here: https://g.page/review/12345'
}

export async function getFollowUpConfig(tenantId: string): Promise<FollowUpConfig> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('integrations')
    .select('config')
    .eq('tenant_id', tenantId)
    .eq('provider', 'auto_followup')
    .single()

  if (data && data.config) {
    return { ...DEFAULT_CONFIG, ...(data.config as any) }
  }

  return DEFAULT_CONFIG
}

export async function saveFollowUpConfig(tenantId: string, config: FollowUpConfig) {
  const supabase = await createClient()

  // Verify auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  // Verify membership
  const { data: membership } = await supabase
    .from('users')
    .select('role')
    .eq('user_id', user.id)
    .eq('tenant_id', tenantId)
    .single()

  if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
    return { success: false, error: 'Unauthorized' }
  }

  // Check if it exists
  const { data: existing } = await supabase
    .from('integrations')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('provider', 'auto_followup')
    .single()

  if (existing) {
    const { error } = await supabase
      .from('integrations')
      .update({ config: config as any })
      .eq('id', existing.id)

    if (error) {
      console.error('Failed to update follow-up config:', error)
      return { success: false, error: 'Failed to update configuration' }
    }
  } else {
    const { error } = await supabase
      .from('integrations')
      .insert({
        tenant_id: tenantId,
        provider: 'auto_followup',
        config: config as any,
        status: 'active'
      })

    if (error) {
      console.error('Failed to insert follow-up config:', error)
      return { success: false, error: 'Failed to save configuration' }
    }
  }

  revalidatePath('/[tenantSlug]/settings/follow-ups', 'page')

  return { success: true }
}
