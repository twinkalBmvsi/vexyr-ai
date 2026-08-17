import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import OpenAI from 'openai'

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
      return NextResponse.json({ status: 'ignored', reason: 'No message content' })
    }

    const fromNumber = message.from
    const text = message.text?.body

    if (!text) {
      return NextResponse.json({ status: 'ignored', reason: 'No text body' })
    }

    const supabase = await createClient()

    // 1. Find tenant
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', tenantSlug)
      .single()

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // 2. Find WhatsApp channel config
    const { data: channel } = await supabase
      .from('channels')
      .select('provider_config, agent_id, is_active')
      .eq('tenant_id', tenant.id)
      .eq('provider', 'whatsapp')
      .single()

    if (!channel) {
      return NextResponse.json({ error: 'WhatsApp channel not configured' }, { status: 404 })
    }

    if (channel.is_active === false) {
      return NextResponse.json({ status: 'ignored', reason: 'WhatsApp channel deactivated' })
    }

    // 3. Find Agent
    const { data: agent } = await supabase
      .from('agents')
      .select('*')
      .eq('id', channel.agent_id)
      .single()

    if (!agent) {
      return NextResponse.json({ status: 'ignored', reason: 'No agent found' })
    }

    if (agent.business_rules) {
      try {
        const rules = JSON.parse(agent.business_rules)
        if (Array.isArray(rules.active_channels) && !rules.active_channels.includes('whatsapp')) {
          return NextResponse.json({ status: 'ignored', reason: 'WhatsApp is not active for this agent' })
        }
      } catch (e) {
        // Ignore JSON parse error
      }
    }

    // 4. Generate AI completion
    const completion = await openai.chat.completions.create({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: agent.prompt || 'You are a helpful assistant.' },
        { role: 'user', content: text }
      ],
      temperature: agent.temperature || 0.7,
    })

    const replyText = completion.choices[0]?.message?.content || 'Sorry, I could not process your request.'

    // Send WhatsApp Cloud API reply if access token & phone number ID are configured
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

    return NextResponse.json({ status: 'success', reply: replyText })

  } catch (error) {
    console.error('Error handling WhatsApp webhook:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
