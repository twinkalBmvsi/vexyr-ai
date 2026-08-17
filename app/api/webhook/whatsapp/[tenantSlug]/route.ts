import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

// Initialize Supabase admin client to bypass RLS for unauthenticated webhooks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    'X-Title': 'Vexyr AI',
  }
})

// GET handler for Meta Webhook Verification
export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token) {
    return new Response(challenge, { status: 200 })
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

// POST handler for incoming WhatsApp messages
export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const resolvedParams = await params
  const { tenantSlug } = resolvedParams

  try {
    const body = await request.json()

    // Extract message from WhatsApp Cloud API payload format
    const entry = body.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value
    const message = value?.messages?.[0]

    if (!message) {
      return NextResponse.json({ status: 'ignored', reason: 'No message content' }, { status: 200 })
    }

    const fromNumber = message.from
    const text = message.text?.body

    if (!text) {
      return NextResponse.json({ status: 'ignored', reason: 'No text body' }, { status: 200 })
    }

    // 1. Find tenant bypassing RLS
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('slug', tenantSlug)
      .maybeSingle()

    if (!tenant) {
      return NextResponse.json({ status: 'ignored', reason: `Tenant '${tenantSlug}' not found` }, { status: 200 })
    }

    // 2. Find WhatsApp channel config bypassing RLS
    const { data: channel } = await supabaseAdmin
      .from('channels')
      .select('id, provider_config, agent_id, is_active')
      .eq('tenant_id', tenant.id)
      .eq('provider', 'whatsapp')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!channel) {
      return NextResponse.json({ status: 'ignored', reason: 'WhatsApp channel not configured' }, { status: 200 })
    }

    if (channel.is_active === false) {
      return NextResponse.json({ status: 'ignored', reason: 'WhatsApp channel deactivated' }, { status: 200 })
    }

    // 3. Find Agent bypassing RLS
    let agent: any = null
    if (channel.agent_id) {
      const { data } = await supabaseAdmin
        .from('agents')
        .select('*')
        .eq('id', channel.agent_id)
        .maybeSingle()
      agent = data
    }

    if (!agent) {
      const { data: agents } = await supabaseAdmin
        .from('agents')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: true })
        .limit(1)
      if (agents && agents.length > 0) {
        agent = agents[0]
      }
    }

    if (!agent) {
      return NextResponse.json({ status: 'ignored', reason: 'No agent found' }, { status: 200 })
    }

    if (agent.business_rules) {
      try {
        const rules = JSON.parse(agent.business_rules)
        if (Array.isArray(rules.active_channels) && !rules.active_channels.includes('whatsapp')) {
          return NextResponse.json({ status: 'ignored', reason: 'WhatsApp is not active for this agent' }, { status: 200 })
        }
      } catch (e) {
        // Ignore JSON parse error
      }
    }

    // 4. Find or Create Customer
    const senderName = value?.contacts?.[0]?.profile?.name || `WhatsApp User (${fromNumber})`

    let customer: any = null
    const { data: existingCustomers } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('channel', 'whatsapp')
      .order('created_at', { ascending: false })

    if (existingCustomers && existingCustomers.length > 0) {
      customer = existingCustomers.find((c: any) => c.phone === fromNumber) || existingCustomers[0]
    }

    if (!customer) {
      const { data: newCustomer } = await supabaseAdmin
        .from('customers')
        .insert({
          tenant_id: tenant.id,
          name: senderName,
          phone: fromNumber,
          channel: 'whatsapp'
        })
        .select('*')
        .single()
      customer = newCustomer
    }

    // 5. Find or Create Active Conversation
    let conversation: any = null
    if (customer) {
      const { data: existingConvs } = await supabaseAdmin
        .from('conversations')
        .select('*')
        .eq('tenant_id', tenant.id)
        .eq('customer_id', customer.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)

      if (existingConvs && existingConvs.length > 0) {
        conversation = existingConvs[0]
      } else {
        const { data: newConv } = await supabaseAdmin
          .from('conversations')
          .insert({
            tenant_id: tenant.id,
            customer_id: customer.id,
            agent_id: agent.id,
            channel_id: channel?.id || null,
            status: 'active'
          })
          .select('*')
          .single()
        conversation = newConv
      }
    }

    // 6. Save incoming User message to database
    if (conversation) {
      await supabaseAdmin
        .from('messages')
        .insert({
          tenant_id: tenant.id,
          conversation_id: conversation.id,
          sender_type: 'user',
          content: text,
          metadata: { whatsapp_from: fromNumber, whatsapp_message_id: message.id }
        })
    }

    // 7. Load conversation history for AI context
    const conversationHistory: any[] = []
    if (conversation) {
      const { data: pastMsgs } = await supabaseAdmin
        .from('messages')
        .select('sender_type, content')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true })
        .limit(12)

      if (pastMsgs) {
        pastMsgs.forEach((m: any) => {
          if (m.sender_type === 'user' || m.sender_type === 'assistant') {
            conversationHistory.push({
              role: m.sender_type === 'user' ? 'user' : 'assistant',
              content: m.content
            })
          }
        })
      }
    }

    const aiMessages = conversationHistory.length > 0 ? [
      { role: 'system', content: agent.prompt || 'You are a helpful assistant.' },
      ...conversationHistory
    ] : [
      { role: 'system', content: agent.prompt || 'You are a helpful assistant.' },
      { role: 'user', content: text }
    ]

    // 8. Generate AI completion
    let replyText = ''
    try {
      const completion = await openai.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        messages: aiMessages as any,
        temperature: agent.temperature || 0.7,
      })
      replyText = completion.choices[0]?.message?.content || 'Sorry, I could not process your request.'
    } catch (aiErr: any) {
      console.error('OpenRouter AI call failed:', aiErr)
      replyText = `Hello! I received your message: "${text}".`
    }

    // 9. Save outgoing AI Assistant message to database
    if (conversation) {
      await supabaseAdmin
        .from('messages')
        .insert({
          tenant_id: tenant.id,
          conversation_id: conversation.id,
          sender_type: 'assistant',
          content: replyText,
          metadata: { provider: 'openrouter', model: 'openai/gpt-4o-mini' }
        })
    }

    // 10. Send WhatsApp Cloud API reply if access token & phone number ID are configured
    const waToken = channel.provider_config?.token
    const phoneId = channel.provider_config?.phoneId

    if (waToken && phoneId) {
      await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${waToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: fromNumber,
          type: 'text',
          text: { body: replyText }
        })
      })
    }

    return NextResponse.json({ status: 'success', reply: replyText }, { status: 200 })

  } catch (error) {
    console.error('Error handling WhatsApp webhook:', error)
    return NextResponse.json({ status: 'success' }, { status: 200 })
  }
}
