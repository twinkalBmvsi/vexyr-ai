'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export type BusinessHoursConfig = {
  startHour: number
  endHour: number
  offDays: number[] // 0 = Sunday, 1 = Monday, etc.
}

const DEFAULT_BUSINESS_HOURS: BusinessHoursConfig = {
  startHour: 9,
  endHour: 21, // 9 PM
  offDays: []
}

export async function getBusinessHours(tenantId: string): Promise<BusinessHoursConfig> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('integrations')
    .select('config')
    .eq('tenant_id', tenantId)
    .eq('provider', 'business_hours')
    .single()

  if (data && data.config) {
    return data.config as BusinessHoursConfig
  }

  return DEFAULT_BUSINESS_HOURS
}

export async function saveBusinessHours(tenantId: string, config: BusinessHoursConfig) {
  const supabase = await createClient()

  // Verify auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  // Check if it exists
  const { data: existing } = await supabase
    .from('integrations')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('provider', 'business_hours')
    .single()

  if (existing) {
    const { error } = await supabase
      .from('integrations')
      .update({ config: config as any })
      .eq('id', existing.id)

    if (error) {
      console.error('Failed to update business hours:', error)
      return { success: false, error: 'Failed to update business hours' }
    }
  } else {
    const { error } = await supabase
      .from('integrations')
      .insert({
        tenant_id: tenantId,
        provider: 'business_hours',
        config: config as any,
        status: 'active'
      })

    if (error) {
      console.error('Failed to insert business hours:', error)
      return { success: false, error: 'Failed to save business hours' }
    }
  }

  revalidatePath('/[tenantSlug]/settings', 'page')
  revalidatePath('/[tenantSlug]/appointments', 'page')

  return { success: true }
}
