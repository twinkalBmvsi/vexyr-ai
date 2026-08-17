import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import OpenAI from 'openai'

// Initialize OpenAI client for OpenRouter
const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY, // Fallback if OPENROUTER_API_KEY is not set
  defaultHeaders: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000', // Required by OpenRouter
    'X-Title': 'Vexyr AI', // Required by OpenRouter
  }
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const resolvedParams = await params
  const { tenantSlug } = resolvedParams

  try {
    const body = await request.json()

    // Telegram sends updates in `message` object
    if (!body.message) {
      return NextResponse.json({ status: 'ignored', reason: 'No message object' })
    }

    const { message } = body
    const chatId = message.chat.id
    const text = message.text

    if (!text) {
      return NextResponse.json({ status: 'ignored', reason: 'No text content' })
    }

    const supabase = await createClient()

    // 1. Find the tenant
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', tenantSlug)
      .single()

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // 2. Find the Telegram channel and agent config
    const { data: channel } = await supabase
      .from('channels')
      .select('provider_config, agent_id')
      .eq('tenant_id', tenant.id)
      .eq('provider', 'telegram')
      .single()

    if (!channel || !channel.provider_config?.token) {
      return NextResponse.json({ error: 'Telegram channel not configured' }, { status: 404 })
    }

    const telegramToken = channel.provider_config.token

    // 3. Find the Agent
    const { data: agent } = await supabase
      .from('agents')
      .select('*')
      .eq('id', channel.agent_id)
      .single()

    if (!agent) {
      // If no agent, send a fallback message
      await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: 'Sorry, this bot has no AI agent configured.'
        })
      })
      return NextResponse.json({ status: 'success' })
    }

    // 4. Call OpenRouter AI
    const completion = await openai.chat.completions.create({
      model: 'google/gemini-2.5-flash', // A fast, cheap, high-quality model on OpenRouter. Alternative: openai/gpt-4o-mini
      messages: [
        { role: 'system', content: agent.prompt || 'You are a helpful assistant.' },
        { role: 'user', content: text }
      ],
      temperature: agent.temperature || 0.7,
    })

    const replyText = completion.choices[0]?.message?.content || 'Sorry, I could not process your request.'

    // 5. Send reply to Telegram
    const tgResponse = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: replyText
      })
    })

    if (!tgResponse.ok) {
      console.error('Failed to send Telegram message:', await tgResponse.text())
    }

    return NextResponse.json({ status: 'success' })

  } catch (error) {
    console.error('Error handling Telegram webhook:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
