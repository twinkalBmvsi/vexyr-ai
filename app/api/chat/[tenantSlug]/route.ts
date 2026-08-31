import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import {
  executeAppointmentBooking,
  executeAppointmentReschedule,
  executeAppointmentCancel,
  executeListAppointments
} from '@/utils/booking'

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

const FREE_TIER_LIMIT = 50

// Tools for booking (no active appointment)
const bookingOnlyTools = [
  {
    type: 'function' as const,
    function: {
      name: 'book_appointment',
      description: 'Book a new appointment once customer provides name, phone, email, service, date and time.',
      parameters: {
        type: 'object',
        properties: {
          customer_name: { type: 'string', description: 'Customer full name' },
          customer_phone: { type: 'string', description: 'Customer phone number' },
          customer_email: { type: 'string', description: 'Customer email address' },
          appointment_title: { type: 'string', description: 'Service requested' },
          preferred_datetime: { type: 'string', description: 'Requested date and time' },
          notes: { type: 'string', description: 'Additional notes' }
        },
        required: ['customer_name', 'preferred_datetime']
      }
    }
  }
]

// Tools for managing existing appointment
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
          reason: { type: 'string', description: 'Reason for cancellation' }
        },
        required: []
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'reschedule_appointment',
      description: 'Reschedule the existing appointment to a new date/time.',
      parameters: {
        type: 'object',
        properties: {
          customer_name: { type: 'string', description: 'Customer full name' },
          new_datetime: { type: 'string', description: 'New date and time' }
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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params

  try {
    const { message, sessionId } = await request.json()

    if (!message) {
      return NextResponse.json({ error: 'No message provided' }, { status: 400 })
    }

    // 1. Find tenant
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('slug', tenantSlug)
      .maybeSingle()

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // 2. Check chat limit BEFORE saving this message
    //    Count BEFORE inserting to get the accurate used count
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('status, modules')
      .eq('tenant_id', tenant.id)
      .maybeSingle()

    // Removed global subscription status blocker because the base bot is free.

    const unlimitedMod = subscription?.modules?.unlimitedChats
    const isUnlimited = unlimitedMod && (
      unlimitedMod === true || (typeof unlimitedMod === 'object' && unlimitedMod.expires_at && new Date(unlimitedMod.expires_at) > new Date())
    )

    if (!isUnlimited) {
      const { count: currentCount } = await supabaseAdmin
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant.id)
        .eq('sender_type', 'user')
        .gte('created_at', startOfMonth.toISOString())

      const used = currentCount || 0

      if (used >= FREE_TIER_LIMIT) {
        return NextResponse.json({
          error: 'limit_reached',
          reply: "You've used all 50 free test interactions this month. Purchase the **Unlimited Chats** module from the Store to continue.",
          remaining: 0
        }, { status: 429 })
      }
    }

    // 3. Find agent
    const { data: agents } = await supabaseAdmin
      .from('agents')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: true })
      .limit(1)

    const agent = agents?.[0]
    if (!agent) {
      return NextResponse.json({ error: 'No agent configured. Please create an agent first.', reply: 'No agent configured. Please create an agent first.' }, { status: 404 })
    }

    // 4. Find or create a web-chat "customer" for this session (keyed by sessionId)
    const webChatIdentifier = `webchat_${sessionId || 'default'}`
    let customer: any = null

    const { data: existingCustomer } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('channel', 'web')
      .eq('phone', webChatIdentifier)
      .maybeSingle()

    if (existingCustomer) {
      customer = existingCustomer
    } else {
      const { data: newCustomer } = await supabaseAdmin
        .from('customers')
        .insert({
          tenant_id: tenant.id,
          name: 'Web Chat User',
          phone: webChatIdentifier,
          channel: 'web'
        })
        .select('*')
        .single()
      customer = newCustomer
    }

    // 5. Check for active appointment for this web chat session
    //    Only count 'pending' or 'confirmed' future appointments as "active".
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

      if (apts && apts.length > 0) activeAppointment = apts[0]
    }

    const hasActiveAppointment = !!activeAppointment
    let formattedActiveDate = ''
    let formattedActiveTime = ''
    if (activeAppointment) {
      const start = new Date(activeAppointment.start_time)
      formattedActiveDate = start.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
      formattedActiveTime = start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    }

    // 6. Find or create active conversation for this session
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
            status: 'active'
          })
          .select('*')
          .single()
        conversation = newConv
      }
    }

    // 7. Save user message to DB (this counts toward the limit)
    if (conversation) {
      await supabaseAdmin.from('messages').insert({
        tenant_id: tenant.id,
        conversation_id: conversation.id,
        sender_type: 'user',
        content: message,
        metadata: { source: 'web_test_chat', session_id: sessionId }
      })
    }

    // 8. Load recent conversation history from DB (last 10 messages)
    const conversationHistory: any[] = []
    if (conversation) {
      const { data: pastMsgs } = await supabaseAdmin
        .from('messages')
        .select('sender_type, content')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: false })
        .limit(10)

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

    // 9. Build system prompt (same as Telegram/WhatsApp webhooks)
    let businessName = 'Business'
    let description = 'AI Assistant'
    let services = 'General assistance'
    if (agent.business_rules) {
      try {
        const rules = JSON.parse(agent.business_rules)
        businessName = rules.business_name || businessName
        description = rules.description || description
        services = rules.services || services
      } catch (e) {}
    }

    const currentDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    })

    let systemInstruction: string
    let selectedTools: any[]

    if (hasActiveAppointment) {
      selectedTools = [...managementOnlyTools, listAppointmentsTool]
      systemInstruction = `TODAY'S DATE IS: ${currentDate} (Year ${new Date().getFullYear()}).

You are **${agent.name || 'Agent'}**, the friendly scheduling assistant for **${businessName}**.
Business Description: ${description}
Services Provided: ${services}
Answer questions politely and assist customers.

### CUSTOMER CONTEXT
- ACTIVE APPOINTMENT: "${activeAppointment.title}" on ${formattedActiveDate} at ${formattedActiveTime}

### STRICT RULES
- You CANNOT book a new appointment. The customer already has one.
- You can ONLY help with: cancellation or rescheduling.

### GREETING
- If customer says "hello", "hi", "hey": Reply "Hi! How can I help you? I can help you reschedule or cancel your existing appointment for ${activeAppointment.title} on ${formattedActiveDate} at ${formattedActiveTime}."

### CANCELLATION FLOW
1. When customer asks to cancel: Reply "I can see your appointment for **${activeAppointment.title}** is scheduled on **${formattedActiveDate} at ${formattedActiveTime}**. Are you sure you want to cancel it?"
2. When customer says "yes" / "confirm" / "cancel it": Call the 'cancel_appointment' tool.
3. After tool succeeds: Confirm "Your appointment has been successfully cancelled."

### RESCHEDULING FLOW
1. When customer asks to reschedule: Ask "What new date and time would you prefer?"
2. When customer provides new date/time: Call the 'reschedule_appointment' tool.
3. After tool succeeds: Confirm the new date and time.

### VIEW APPOINTMENTS
- If customer asks to see their appointments, schedule, or list of bookings: call 'list_appointments' immediately.
- Format the result as a numbered list with date, time, and service.
- If no appointments found, say "You have no upcoming appointments."`

    } else {
      selectedTools = [...bookingOnlyTools, listAppointmentsTool]
      systemInstruction = `TODAY'S DATE IS: ${currentDate} (Year ${new Date().getFullYear()}).

You are **${agent.name || 'Agent'}**, the friendly scheduling assistant for **${businessName}**.
Business Description: ${description}
Services Provided: ${services}
Answer questions politely and assist customers.

### GREETING
- If customer says "hello", "hi", "hey": Reply "Hi! I'm ${agent.name || 'your AI assistant'} for ${businessName}. How can I help you? I can help you book an appointment."

### BOOKING FLOW - CRITICAL RULES
1. Collect details ONE AT A TIME in this exact order:
   - Step 1: Ask for customer's FULL NAME
   - Step 2: Ask for their PHONE NUMBER
   - Step 3: Ask for their EMAIL ADDRESS
   - Step 4: Ask which SERVICE they need (from: ${services})
   - Step 5: Ask for preferred DATE
   - Step 6: Ask for preferred TIME
2. Do NOT ask for multiple details in one message. Ask ONE question at a time.
3. Once you have ALL 6 details, call 'book_appointment' immediately.
4. After tool succeeds: Confirm all appointment details to the customer.

### VIEW APPOINTMENTS
- If customer asks to see their appointments, schedule, or list of bookings: call 'list_appointments' immediately.
- Format the result as a numbered list with date, time, and service.
- If no appointments found, say "You have no upcoming appointments."`
    }

    const aiMessages: any[] = [
      { role: 'system', content: systemInstruction },
      ...conversationHistory
    ]

    // 10. Call AI
    let replyText = ''
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
            customerId: customer?.id,
            params: fnArgs
          })
          // Update customer name if we got it
          if (customer && fnArgs.customer_name && customer.name === 'Web Chat User') {
            await supabaseAdmin
              .from('customers')
              .update({ name: fnArgs.customer_name, email: fnArgs.customer_email || null })
              .eq('id', customer.id)
          }
        } else if (fnName === 'reschedule_appointment') {
          toolOutput = await executeAppointmentReschedule({
            tenantId: tenant.id,
            customerId: customer?.id,
            newDateTime: fnArgs.new_datetime,
            customerName: fnArgs.customer_name || customer?.name,
            customerEmail: customer?.email
          })
        } else if (fnName === 'cancel_appointment') {
          toolOutput = await executeAppointmentCancel({
            tenantId: tenant.id,
            customerId: customer?.id,
            reason: fnArgs.reason,
            customerName: fnArgs.customer_name || customer?.name,
            customerEmail: customer?.email
          })
        } else if (fnName === 'list_appointments') {
          toolOutput = await executeListAppointments({
            tenantId: tenant.id,
            customerId: customer?.id
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
      replyText = responseMessage?.content || 'How can I help you?'
    }

    // 11. Save AI reply to DB
    if (conversation) {
      await supabaseAdmin.from('messages').insert({
        tenant_id: tenant.id,
        conversation_id: conversation.id,
        sender_type: 'assistant',
        content: replyText,
        metadata: { source: 'web_test_chat', model: 'openai/gpt-4o-mini' }
      })
    }

    // 12. Return updated remaining count
    let remaining: number | null = null
    if (!isUnlimited) {
      const { count: newCount } = await supabaseAdmin
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant.id)
        .eq('sender_type', 'user')
        .gte('created_at', startOfMonth.toISOString())

      const used = newCount || 0
      remaining = Math.max(0, FREE_TIER_LIMIT - used)
    }

    return NextResponse.json({ reply: replyText, remaining })

  } catch (error: any) {
    console.error('Web chat error:', error)
    return NextResponse.json({
      error: 'Something went wrong.',
      reply: 'Sorry, something went wrong on our end. Please try again.'
    }, { status: 500 })
  }
}
