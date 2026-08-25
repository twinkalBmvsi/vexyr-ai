import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/service-role'
import { sendSmtpEmail, isSmtpConfigured } from '@/utils/email/smtp'

export async function POST(request: Request) {
  try {
    const { tenantId, subject, body, channel = 'email' } = await request.json()

    if (!tenantId || !body) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (channel === 'email' && !subject) {
      return NextResponse.json({ error: 'Subject is required for emails' }, { status: 400 })
    }

    if (channel === 'email' && !isSmtpConfigured()) {
      return NextResponse.json({ error: 'SMTP is not configured on the server. Cannot send emails.' }, { status: 500 })
    }

    if (channel === 'whatsapp') {
      return NextResponse.json({ error: 'WhatsApp broadcast is not yet supported.' }, { status: 400 })
    }

    const supabase = await createClient()
    const adminClient = createAdminClient()

    // 1. Verify user is authenticated and part of this tenant
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: membership } = await supabase
      .from('users')
      .select('role, access_pages')
      .eq('user_id', user.id)
      .eq('tenant_id', tenantId)
      .single()

    if (!membership || (membership.role !== 'owner' && !membership.access_pages?.includes('settings/broadcasts'))) {
      return NextResponse.json({ error: 'Forbidden. You do not have access to send broadcasts.' }, { status: 403 })
    }

    // 2. Verify tenant has the broadcastMessaging module active
    const { data: subscription } = await adminClient
      .from('subscriptions')
      .select('status, modules')
      .eq('tenant_id', tenantId)
      .single()

    const hasBroadcastModule = subscription?.status === 'active' && (subscription.modules as Record<string, any>)?.broadcastMessaging === true

    if (!hasBroadcastModule) {
      return NextResponse.json({ error: 'Your workspace does not have the Broadcast Messaging module active.' }, { status: 403 })
    }

    // Fetch tenant name
    const { data: tenant } = await adminClient
      .from('tenants')
      .select('name')
      .eq('id', tenantId)
      .single()
      
    const tenantName = tenant?.name || 'Your Provider'

    let telegramToken: string | null = null

    if (channel === 'telegram') {
      const { data: telegramConfig } = await adminClient
        .from('channels')
        .select('provider_config')
        .eq('tenant_id', tenantId)
        .eq('provider', 'telegram')
        .eq('is_active', true)
        .single()
      
      telegramToken = (telegramConfig?.provider_config as any)?.token
      if (!telegramToken) {
        return NextResponse.json({ error: 'Telegram Bot Token is not configured.' }, { status: 400 })
      }
    }

    // 3. Fetch customers based on the selected channel
    let query = adminClient.from('customers').select('id, email, phone').eq('tenant_id', tenantId)
    
    if (channel === 'email') {
      query = query.not('email', 'is', null)
    } else if (channel === 'telegram') {
      query = query.eq('channel', 'telegram').not('phone', 'is', null)
    }

    const { data: customers, error: customerError } = await query

    if (customerError || !customers) {
      return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 })
    }

    // Deduplicate logic
    const uniqueIdentifiers = Array.from(new Set(
      customers.map(c => channel === 'email' ? c.email : (channel === 'telegram' ? c.id : c.phone)).filter(Boolean)
    )) as string[]

    // We also need the exact targets (email string or phone/chat ID) mapped
    const targetMap = new Map()
    for (const c of customers) {
      if (channel === 'email' && c.email && !targetMap.has(c.email)) {
        targetMap.set(c.email, c.email)
      } else if (channel === 'telegram' && c.id && c.phone && !targetMap.has(c.id)) {
        // Customer ID is the unique identifier for the frontend, but phone is the chat ID
        targetMap.set(c.id, c.phone) 
      }
    }

    const targets = Array.from(targetMap.entries()) // [ [identifier, targetValue] ]

    if (targets.length === 0) {
      return NextResponse.json({ error: 'No valid customers found for this channel.' }, { status: 400 })
    }

    // 4. Return a ReadableStream for Server-Sent Events (SSE)
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (data: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        }

        const formattedHtml = `
          <div style="font-family: Arial, sans-serif; color: #1f2933; line-height: 1.5; padding: 24px;">
            <div style="margin-bottom: 32px;">
              ${body}
            </div>
            <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 24px 0;" />
            <p style="font-size: 12px; color: #6b7280;">
              You are receiving this email because you are a customer of <strong>${tenantName}</strong>.
              <br />
              If you no longer wish to receive these promotional updates, please contact us to unsubscribe.
            </p>
          </div>
        `
        const formattedText = `${body}\n\n---\nYou are receiving this because you are a customer of ${tenantName}. Contact us to unsubscribe.`

        let sentCount = 0
        let failedCount = 0

        for (const [identifier, targetValue] of targets) {
          try {
            sendEvent({ type: 'progress', identifier, status: 'sending' })
            
            if (channel === 'email') {
              await sendSmtpEmail({
                to: targetValue,
                subject: subject,
                html: formattedHtml,
                text: formattedText,
              })
            } else if (channel === 'telegram' && telegramToken) {
              const res = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: targetValue,
                  text: body,
                  parse_mode: 'Markdown'
                })
              })
              
              if (!res.ok) {
                const data = await res.json()
                throw new Error(`Telegram API Error: ${data.description}`)
              }
            }
            
            sentCount++
            sendEvent({ type: 'progress', identifier, status: 'sent' })
            
            // Delay to prevent rate limits
            await new Promise(resolve => setTimeout(resolve, 300))
          } catch (e) {
            console.error(`Failed to send to ${targetValue}:`, e)
            failedCount++
            sendEvent({ type: 'progress', identifier, status: 'error' })
          }
        }

        sendEvent({ type: 'complete', sentCount, failedCount, totalAttempted: targets.length })
        controller.close()
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    })

  } catch (error) {
    console.error('Broadcast Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
