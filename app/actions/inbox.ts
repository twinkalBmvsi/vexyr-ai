'use server'

import { createClient } from '@/utils/supabase/server'

export async function getConversations(tenantId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('conversations')
    .select(`
      id,
      status,
      summary,
      created_at,
      customers (id, name, phone, email, channel),
      agents (id, name)
    `)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching conversations:', error)
    return { data: null, error: error.message }
  }

  // Map to nicer object
  const mappedData = data?.map((conv: any) => ({
    id: conv.id,
    status: conv.status,
    summary: conv.summary,
    createdAt: conv.created_at,
    customer: conv.customers,
    agent: conv.agents
  }))

  return { data: mappedData, error: null }
}

export async function getMessages(tenantId: string, conversationId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching messages:', error)
    return { data: null, error: error.message }
  }

  return { data, error: null }
}
