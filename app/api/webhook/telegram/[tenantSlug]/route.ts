import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { executeAppointmentBooking } from '@/utils/booking'

// Initialize Supabase admin client to bypass RLS for unauthenticated webhooks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// Initialize OpenAI client for OpenRouter
const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    'X-Title': 'Vexyr AI',
  }
})

const appointmentTools = [
  {
    type: 'function' as const,
    function: {
      name: 'book_appointment',
      description: 'Book an appointment when customer provides their name, phone, email, date/time, and service or appointment title.',
      parameters: {
        type: 'object',
        properties: {
          customer_name: {
            type: 'string',
            description: 'Customer full name'
          },
          customer_phone: {
            type: 'string',
            description: 'Customer phone number'
          },
          customer_email: {
            type: 'string',
            description: 'Customer email address'
          },
          appointment_title: {
            type: 'string',
            description: 'Service or meeting requested (e.g. Massage Therapy, Consultation, Haircut)'
          },
          preferred_datetime: {
            type: 'string',
            description: 'Requested date and time (e.g., "tomorrow at 4 PM", "2026-08-18 16:00")'
          },
          notes: {
            type: 'string',
            description: 'Additional notes or requirements'
          }
        },
        required: ['customer_name', 'preferred_datetime']
      }
    }
  }
]

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const resolvedParams = await params
  const { tenantSlug } = resolvedParams

  let chatId: any = null
  let telegramToken: string | null = null

  try {
    const body = await request.json()

    // Telegram sends updates in `message` object
    if (!body.message) {
      return NextResponse.json({ status: 'ignored', reason: 'No message object' }, { status: 200 })
    }

    const { message } = body
    chatId = message.chat.id
    const text = message.text

    if (!text) {
      return NextResponse.json({ status: 'ignored', reason: 'No text content' }, { status: 200 })
    }

    // 1. Find the tenant bypassing RLS
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('slug', tenantSlug)
      .maybeSingle()

    if (!tenant) {
      console.warn(`Telegram Webhook: Tenant '${tenantSlug}' not found`)
      return NextResponse.json({ status: 'ignored', reason: `Tenant '${tenantSlug}' not found` }, { status: 200 })
    }

    // 2. Find the Telegram channel config bypassing RLS
    const { data: channel } = await supabaseAdmin
      .from('channels')
      .select('id, provider_config, agent_id, is_active')
      .eq('tenant_id', tenant.id)
      .eq('provider', 'telegram')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!channel || !channel.provider_config?.token) {
      console.warn(`Telegram Webhook: Telegram channel not configured for tenant ${tenantSlug}`)
      return NextResponse.json({ status: 'ignored', reason: 'Telegram channel not configured' }, { status: 200 })
    }

    telegramToken = channel.provider_config.token.trim()

    if (channel.is_active === false) {
      return NextResponse.json({ status: 'ignored', reason: 'Telegram channel deactivated' }, { status: 200 })
    }

    // 3. Find the Agent bypassing RLS
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
      await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: 'Sorry, this bot has no AI agent configured yet.'
        })
      })
      return NextResponse.json({ status: 'success' }, { status: 200 })
    }

    // Check active_channels in business_rules
    if (agent.business_rules) {
      try {
        const rules = JSON.parse(agent.business_rules)
        if (Array.isArray(rules.active_channels) && !rules.active_channels.includes('telegram')) {
          return NextResponse.json({ status: 'ignored', reason: 'Telegram is deactivated for this agent' }, { status: 200 })
        }
      } catch (e) {
        // Ignore JSON parse error
      }
    }

    // 4. Find or Create Customer
    const telegramSender = message.from
    const senderName = [telegramSender?.first_name, telegramSender?.last_name].filter(Boolean).join(' ') || telegramSender?.username || `Telegram User (${chatId})`

    let customer: any = null
    const { data: existingCustomers } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('channel', 'telegram')
      .order('created_at', { ascending: false })

    if (existingCustomers && existingCustomers.length > 0) {
      customer = existingCustomers.find((c: any) => c.phone === chatId.toString() || c.name === senderName) || existingCustomers[0]
    }

    if (!customer) {
      const { data: newCustomer, error: custErr } = await supabaseAdmin
        .from('customers')
        .insert({
          tenant_id: tenant.id,
          name: senderName,
          phone: chatId.toString(),
          channel: 'telegram'
        })
        .select('*')
        .single()

      if (custErr) {
        console.error('Error creating customer:', custErr)
      } else {
        customer = newCustomer
      }
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
        const { data: newConv, error: convErr } = await supabaseAdmin
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

        if (convErr) {
          console.error('Error creating conversation:', convErr)
        } else {
          conversation = newConv
        }
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
          metadata: { telegram_chat_id: chatId, telegram_message_id: message.message_id }
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

    const currentDateFormatted = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    const systemInstruction = `TODAY'S DATE IS: ${currentDateFormatted} (Year ${new Date().getFullYear()}).
${agent.prompt || 'You are a helpful scheduling assistant.'} 

CRITICAL INSTRUCTIONS:
- Today is ${currentDateFormatted}. Always use Year ${new Date().getFullYear()} for appointment dates.
- Your primary goal is to help customers schedule appointments.
- When a customer wants to book an appointment, collect their:
  1. Full Name
  2. Phone Number
  3. Email Address
  4. Preferred Date and Time
  5. Desired Service / Meeting Reason
- Once the customer provides these details, YOU MUST IMMEDIATELY CALL THE 'book_appointment' TOOL to register the appointment in the database and send them a confirmation. DO NOT tell the user to wait or that you will check availability later without calling the tool.`

    const aiMessages = conversationHistory.length > 0 ? [
      { role: 'system', content: systemInstruction },
      ...conversationHistory
    ] : [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: text }
    ]

    // 8. Call AI model via OpenRouter with Tool Calling
    let replyText = ''
    try {
      const completion = await openai.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        messages: aiMessages as any,
        tools: appointmentTools,
        tool_choice: 'auto',
        temperature: agent.temperature || 0.7,
      })

      const responseMessage = completion.choices[0]?.message

      if (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0) {
        const toolCall: any = responseMessage.tool_calls[0]
        if (toolCall?.function?.name === 'book_appointment') {
          const bookingArgs = JSON.parse(toolCall.function.arguments)
          
          const bookingResult = await executeAppointmentBooking({
            tenantId: tenant.id,
            agentId: agent.id,
            customerId: customer.id,
            channelId: channel?.id,
            params: bookingArgs
          })

          if (bookingResult.success) {
            replyText = `Great news, ${bookingArgs.customer_name || 'there'}! Your appointment for "${bookingArgs.appointment_title || 'Massage Therapy'}" has been successfully booked for ${bookingResult.formattedDate} at ${bookingResult.formattedTime}.${bookingResult.emailSent ? ` A confirmation email has been sent to ${bookingArgs.customer_email}.` : ''}`
          } else {
            replyText = `I attempted to book your appointment, but ran into an issue: ${bookingResult.error || 'Unable to complete booking'}. Please confirm your preferred date and time again!`
          }
        }
      } else {
        replyText = responseMessage?.content || 'Sorry, I could not process your request.'
      }

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

    // 10. Send reply back to Telegram
    const tgResponse = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: replyText
      })
    })

    if (!tgResponse.ok) {
      const errDetail = await tgResponse.text()
      console.error('Failed to send Telegram message:', errDetail)
    }

    return NextResponse.json({ status: 'success' }, { status: 200 })

  } catch (error: any) {
    console.error('Error handling Telegram webhook:', error)

    if (telegramToken && chatId) {
      try {
        await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: 'An error occurred while processing your request.'
          })
        })
      } catch (e) {
        // Ignore secondary error
      }
    }

    return NextResponse.json({ status: 'success' }, { status: 200 })
  }
}
