'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import type { FlowNode } from '@/utils/flowEngine'

export async function getFlows(tenantId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('flows')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  return { flows: data || [], error }
}

export async function getFlow(id: string, tenantId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('flows')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  return { flow: data, error }
}

export async function createFlow(payload: {
  tenantId: string
  name: string
  description?: string
  triggerKeyword?: string
  agentId?: string
}) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('flows')
    .insert({
      tenant_id: payload.tenantId,
      agent_id: payload.agentId || null,
      name: payload.name,
      description: payload.description || null,
      trigger_keyword: payload.triggerKeyword || null,
      nodes: [],
      is_active: false
    })
    .select('*')
    .single()

  if (!error) {
    revalidatePath('/[tenantSlug]/flows', 'page')
  }

  return { flow: data, error }
}

export async function updateFlowNodes(id: string, tenantId: string, nodes: FlowNode[]) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('flows')
    .update({ nodes, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select('*')
    .single()

  if (!error) {
    revalidatePath('/[tenantSlug]/flows', 'page')
    revalidatePath(`/[tenantSlug]/flows/${id}`, 'page')
  }

  return { flow: data, error }
}

export async function updateFlowMeta(id: string, tenantId: string, meta: {
  name?: string
  description?: string
  trigger_keyword?: string
  agent_id?: string
  is_active?: boolean
  active_channels?: string[]
}) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('flows')
    .update({ ...meta, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select('*')
    .single()

  if (!error) {
    revalidatePath('/[tenantSlug]/flows', 'page')
  }

  return { flow: data, error }
}

export async function toggleFlowActive(id: string, tenantId: string, isActive: boolean) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('flows')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select('*')
    .single()

  if (!error) {
    revalidatePath('/[tenantSlug]/flows', 'page')
  }

  return { flow: data, error }
}

export async function deleteFlow(id: string, tenantId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('flows')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (!error) {
    revalidatePath('/[tenantSlug]/flows', 'page')
  }

  return { error }
}

export async function duplicateFlow(id: string, tenantId: string) {
  const supabase = await createClient()
  
  // Fetch original flow
  const { data: original, error: fetchError } = await supabase
    .from('flows')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()
    
  if (fetchError || !original) {
    return { error: fetchError || new Error('Flow not found') }
  }

  // Insert copy
  const { data: copy, error: insertError } = await supabase
    .from('flows')
    .insert({
      tenant_id: original.tenant_id,
      agent_id: original.agent_id,
      name: `${original.name} (Copy)`,
      description: original.description,
      trigger_keyword: original.trigger_keyword,
      nodes: original.nodes,
      is_active: false,
      active_channels: original.active_channels || ['whatsapp', 'telegram']
    })
    .select('*')
    .single()

  if (!insertError) {
    revalidatePath('/[tenantSlug]/flows', 'page')
  }

  return { flow: copy, error: insertError }
}
