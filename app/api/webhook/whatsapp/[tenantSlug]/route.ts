import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import {
  executeAppointmentBooking,
  executeAppointmentReschedule,
  executeAppointmentCancel,
  executeListAppointments
} from '@/utils/booking'
import { checkChatLimit } from '@/utils/chatLimits'
import { processFlowMessageV2 } from '@/utils/flowEngine'

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

// Tools when customer has NO active appointment → only book
const bookingOnlyTools = [
  {
    type: 'function' as const,
    function: {
      name: 'book_appointment',
      description: 'Book a new appointment when customer provides name, phone, email, service, date and time.',
      parameters: {
        type: 'object',
        properties: {
          customer_name: { type: 'string', description: 'Customer full name' },
          customer_phone: { type: 'string', description: 'Customer phone number' },
          customer_email: { type: 'string', description: 'Customer email address' },
          appointment_title: { type: 'string', description: 'Service requested (e.g. Massage Therapy, Haircut)' },
          preferred_datetime: { type: 'string', description: 'Requested date and time (e.g. "tomorrow at 4 PM")' },
          notes: { type: 'string', description: 'Additional notes' }
        },
        required: ['customer_name', 'preferred_datetime']
      }
    }
  }
]

// Tools when customer HAS an active appointment → only cancel/reschedule
const managementOnlyTools = [
  {
    type: 'function' as const,
    function: {
      name: 'cancel_appointment',
      description: 'Cancel the existing appointment after customer confirms.',
      parameters: {
        type: 'object',
        properties: {
          customer_name: { type: 'string', description: 'Customer full name' },
          reason: { type: 'string', description: 'Reason for cancellation if provided' }
        },
        required: []
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'reschedule_appointment',
      description: 'Reschedule the existing appointment to a new date and time after customer provides the new slot.',
      parameters: {
        type: 'object',
        properties: {
          customer_name: { type: 'string', description: 'Customer full name' },
          new_datetime: { type: 'string', description: 'New date and time (e.g. "tomorrow at 5 PM")' }
        },
        required: ['new_datetime']
      }
    }
  }
]

// Tool available in BOTH booking and management mode
const listAppointmentsTool = {
  type: 'function' as const,
  function: {
    name: 'list_appointments',
    description: 'Fetch and show the customer\'s upcoming booked appointments when they ask to see their schedule, list, or bookings.',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  }
}

// GET handler for WhatsApp Webhook Verification
export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')
  if (mode === 'subscribe' && token) return new Response(challenge, { status: 200 })
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const resolvedParams = await params
  const { tenantSlug } = resolvedParams

  try {
    const body = await request.json()

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

    // 1. Find tenant
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('slug', tenantSlug)
      .maybeSingle()

    if (!tenant) {
      return NextResponse.json({ status: 'ignored', reason: `Tenant '${tenantSlug}' not found` }, { status: 200 })
    }

    // Log the incoming webhook
    await supabaseAdmin.from('webhook_logs').insert({
      tenant_id: tenant.id,
      event_type: 'whatsapp_message',
      payload: body,
      status: 'received'
    })

    // 2. Find WhatsApp channel
    const { data: channel } = await supabaseAdmin
      .from('channels')
      .select('id, provider_config, agent_id, is_active, routing_mode')
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

    // 2.5 Check Chat Limit
    const limitCheck = await checkChatLimit(tenant.id)
    if (!limitCheck.allowed) {
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
            text: { body: 'Our AI assistant is currently unavailable due to high volume. Please contact the business directly.' }
          })
        })
      }
      return NextResponse.json({ status: 'ignored', reason: 'Rate limit reached' }, { status: 200 })
    }

    // 3. Find Agent (if needed)
    let agent: any = null
    const routingMode = channel.routing_mode || 'ai'

    if (routingMode === 'ai' || channel.agent_id) {
      if (channel.agent_id) {
        const { data } = await supabaseAdmin.from('agents').select('*').eq('id', channel.agent_id).maybeSingle()
        agent = data
      }
      if (!agent) {
        const { data: agents } = await supabaseAdmin.from('agents').select('*').eq('tenant_id', tenant.id).order('created_at', { ascending: true }).limit(1)
        if (agents && agents.length > 0) agent = agents[0]
      }
    }

    if (!agent && routingMode === 'ai') {
      return NextResponse.json({ status: 'ignored', reason: 'No agent found for AI mode' }, { status: 200 })
    }

    if (agent.business_rules) {
      try {
        const rules = JSON.parse(agent.business_rules)
        if (Array.isArray(rules.active_channels) && !rules.active_channels.includes('whatsapp')) {
          return NextResponse.json({ status: 'ignored', reason: 'WhatsApp is not active for this agent' }, { status: 200 })
        }
      } catch (e) { /* Ignore */ }
    }

    // 4. Find or Create Customer matched by phone number
    const senderName = value?.contacts?.[0]?.profile?.name || `WhatsApp User (${fromNumber})`

    let customer: any = null
    const { data: exactMatch } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('channel', 'whatsapp')
      .eq('phone', fromNumber)
      .maybeSingle()

    if (exactMatch) {
      customer = exactMatch
    } else {
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

    // 5. Look up active appointment for this specific customer
    //    Only count 'pending' or 'confirmed' future appointments as "active".
    //    Excluding 'completed' and 'cancelled' prevents the bot from blocking
    //    new bookings for customers whose past appointments are still in the DB.
    let activeAppointment: any = null
    if (customer) {
      const nowIso = new Date().toISOString()
      const { data: apts } = await supabaseAdmin
        .from('appointments')
        .select('*')
        .eq('tenant_id', tenant.id)
        .eq('customer_id', customer.id)
        .in('status', ['pending', 'confirmed'])
        .gte('start_time', nowIso)
        .order('start_time', { ascending: true })
        .limit(1)

      if (apts && apts.length > 0) {
        activeAppointment = apts[0]
      }
    }

    const hasActiveAppointment = !!activeAppointment
    let formattedActiveDate = ''
    let formattedActiveTime = ''
    if (activeAppointment) {
      const start = new Date(activeAppointment.start_time)
      formattedActiveDate = start.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
      formattedActiveTime = start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    }

    const isNamedCustomer = customer?.name && !customer.name.startsWith('Telegram User') && !customer.name.startsWith('WhatsApp User')
    const customerDisplayName = isNamedCustomer ? customer.name : null

    // 6. Find or Create Active Conversation
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
            agent_id: agent?.id || null,
            channel_id: channel?.id || null,
            status: 'active'
          })
          .select('*')
          .single()
        conversation = newConv
      }
    }

    // 7. Save incoming User message
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

    // 7.5 ── Routing logic (AI vs Flow) ──────────────────────────────────────
    if (routingMode === 'flow') {
      if (conversation) {
        try {
          const flowResult = await processFlowMessageV2({
            tenantId: tenant.id,
            conversationId: conversation.id,
            agentId: agent?.id || null,
            customerId: customer.id,
            channelId: channel?.id,
            sourcePlatform: 'whatsapp',
            userMessage: text,
            forceAnyMatch: true // Trigger on anything if no session
          } as any) // Typecast due to optional agentId handling

          if (flowResult.handled && flowResult.reply) {
            // Save flow reply to DB
            await supabaseAdmin.from('messages').insert({
              tenant_id: tenant.id,
              conversation_id: conversation.id,
              sender_type: 'assistant',
              content: flowResult.reply,
              metadata: { provider: 'flowforge' }
            })

            // Send WhatsApp reply
            const waToken = channel.provider_config?.token
            const phoneId = channel.provider_config?.phoneId
            if (waToken && phoneId) {
              await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${waToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  messaging_product: 'whatsapp',
                  to: fromNumber,
                  type: 'text',
                  text: { body: flowResult.reply }
                })
              })
            }

            return NextResponse.json({ status: 'success', reply: flowResult.reply, source: 'flowforge' }, { status: 200 })
          } else {
            return NextResponse.json({ status: 'ignored', reason: 'No active flows found for flow mode' }, { status: 200 })
          }
        } catch (flowErr) {
          console.error('[WhatsApp] FlowForge error:', flowErr)
          return NextResponse.json({ status: 'error', reason: 'FlowEngine error' }, { status: 500 })
        }
      }
    }
    // If we are here, routingMode === 'ai'
    // ────────────────────────────────────────────────────────────────────────

    // 8. Load recent conversation history (last 8 messages)
    const conversationHistory: any[] = []
    if (conversation) {
      const { data: pastMsgs } = await supabaseAdmin
        .from('messages')
        .select('sender_type, content, created_at')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: false })
        .limit(8)

      if (pastMsgs) {
        const reversed = [...pastMsgs].reverse()
        reversed.forEach((m: any) => {
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
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    })

    let systemInstruction: string
    let selectedTools: any[]

    let businessName = 'Business'
    let description = 'Organization'
    let services = 'Services'
    if (agent?.business_rules) {
      try {
        const rules = JSON.parse(agent.business_rules)
        businessName = rules.business_name || businessName
        description = rules.description || description
        services = rules.services || services
      } catch (e) {}
    }

    if (hasActiveAppointment) {
      selectedTools = [...managementOnlyTools, listAppointmentsTool]
      systemInstruction = `TODAY'S DATE IS: ${currentDateFormatted} (Year ${new Date().getFullYear()}).

      You are **${agent?.name || 'Agent'}**, the friendly scheduling assistant for **${businessName}**.
      Business Description: ${description}
      Services Provided: ${services}
      Answer questions politely and assist customers.

      ### CUSTOMER CONTEXT
      - Customer Name: ${customerDisplayName ? `"${customerDisplayName}"` : 'Customer'}
      - ACTIVE APPOINTMENT: "${activeAppointment.title}" on ${formattedActiveDate} at ${formattedActiveTime}

      ### STRICT RULES
      - You CANNOT book a new appointment. The customer already has one.
      - You can ONLY help with: cancellation or rescheduling.

      ### GREETING
      - If customer says "hello", "hi", "hey": Reply "Hi${customerDisplayName ? ` ${customerDisplayName}` : ''}! How can I help you? I can help you reschedule or cancel your existing appointment for ${activeAppointment.title} on ${formattedActiveDate} at ${formattedActiveTime}."

      ### CANCELLATION FLOW
      1. When customer asks to cancel: Reply "I can see your appointment for **${activeAppointment.title}** is scheduled on **${formattedActiveDate} at ${formattedActiveTime}**. Are you sure you want to cancel it?"
      2. When customer says "yes" / "confirm" / "cancel it": Reply "Noted. Let me cancel your appointment." and call the 'cancel_appointment' tool.
      3. After tool succeeds: Confirm "Your appointment has been successfully cancelled. You'll receive a confirmation email shortly."

      ### RESCHEDULING FLOW
      1. When customer asks to reschedule: Reply "I can see your appointment for **${activeAppointment.title}** is scheduled on **${formattedActiveDate} at ${formattedActiveTime}**. What new date and time would you prefer?"
      2. When customer provides new date/time: Call the 'reschedule_appointment' tool.
      3. After tool succeeds: Confirm the new date and time to the customer.

      ### VIEW APPOINTMENTS
      - If customer asks to see their appointments, schedule, or list of bookings: call 'list_appointments' immediately.
      - Format the result as a numbered list with date, time, and service.
      - If no appointments found, say "You have no upcoming appointments."`

    } else {
      selectedTools = [...bookingOnlyTools, listAppointmentsTool]
      systemInstruction = `TODAY'S DATE IS: ${currentDateFormatted} (Year ${new Date().getFullYear()}).

      You are **${agent?.name || 'Agent'}**, the friendly scheduling assistant for **${businessName}**.
      Business Description: ${description}
      Services Provided: ${services}
      Answer questions politely and assist customers.

      ### CUSTOMER CONTEXT
      - Customer Name: ${customerDisplayName ? `"${customerDisplayName}"` : 'New Customer'}
      - ACTIVE APPOINTMENT: None

      ### GREETING
      - If customer says "hello", "hi", "hey": Reply "Greetings! How can I help you? I can help you book an appointment."

      ### BOOKING FLOW
      1. Collect details one at a time: Name, Phone, Email, Service, Date, and Time.
      2. Once you have all details, call 'book_appointment'.
      3. After tool succeeds: Confirm appointment details to the customer.

      ### VIEW APPOINTMENTS
      - If customer asks to see their appointments, schedule, or list of bookings: call 'list_appointments' immediately.
      - Format the result as a numbered list with date, time, and service.
      - If no appointments found, say "You have no upcoming appointments."`
    }

    const aiMessages = [
      { role: 'system', content: systemInstruction },
      ...conversationHistory
    ]

    // 9. Generate AI completion
    let replyText = ''
    try {
      const completion = await openai.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        messages: aiMessages as any,
        tools: selectedTools,
        tool_choice: 'auto',
        temperature: 0.5,
      })

      const responseMessage = completion.choices[0]?.message

      if (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0) {
        aiMessages.push(responseMessage as any)

        for (const toolCall of responseMessage.tool_calls) {
          const fnName = (toolCall as any).function?.name
          const fnArgs = JSON.parse((toolCall as any).function?.arguments || '{}')
          let toolOutput: any = {}

          if (fnName === 'book_appointment') {
            toolOutput = await executeAppointmentBooking({
              tenantId: tenant.id,
              agentId: agent.id,
              customerId: customer.id,
              channelId: channel?.id,
              params: fnArgs
            })
          } else if (fnName === 'reschedule_appointment') {
            toolOutput = await executeAppointmentReschedule({
              tenantId: tenant.id,
              customerId: customer.id,
              newDateTime: fnArgs.new_datetime,
              customerName: fnArgs.customer_name || customer.name,
              customerEmail: customer.email
            })
          } else if (fnName === 'cancel_appointment') {
            toolOutput = await executeAppointmentCancel({
              tenantId: tenant.id,
              customerId: customer.id,
              reason: fnArgs.reason,
              customerName: fnArgs.customer_name || customer.name,
              customerEmail: customer.email
            })
          } else if (fnName === 'list_appointments') {
            toolOutput = await executeListAppointments({
              tenantId: tenant.id,
              customerId: customer.id
            })
          }

          aiMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolOutput)
          } as any)
        }

        const secondCompletion = await openai.chat.completions.create({
          model: 'openai/gpt-4o-mini',
          messages: aiMessages as any,
          temperature: 0.5,
        })

        replyText = secondCompletion.choices[0]?.message?.content || 'Your request has been processed.'
      } else {
        replyText = responseMessage?.content || 'Greetings! How can I help you?'
      }

    } catch (aiErr: any) {
      console.error('OpenRouter AI call failed:', aiErr)
      replyText = `Greetings! How can I help you today at Glamour Studio?`
    }

    // 10. Save outgoing AI Assistant message
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

    // 11. Send WhatsApp Cloud API reply
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
