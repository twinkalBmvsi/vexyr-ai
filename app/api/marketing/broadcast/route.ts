import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/service-role'
import { sendSmtpEmail, isSmtpConfigured } from '@/utils/email/smtp'

export async function POST(request: Request) {
  try {
    const { tenantId, subject, body } = await request.json()

    if (!tenantId || !subject || !body) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!isSmtpConfigured()) {
      return NextResponse.json({ error: 'SMTP is not configured on the server. Cannot send emails.' }, { status: 500 })
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

    // Fetch tenant name for email signature
    const { data: tenant } = await adminClient
      .from('tenants')
      .select('name')
      .eq('id', tenantId)
      .single()
      
    const tenantName = tenant?.name || 'Your Provider'

    // 3. Fetch all customers with an email address
    const { data: customers, error: customerError } = await adminClient
      .from('customers')
      .select('email')
      .eq('tenant_id', tenantId)
      .not('email', 'is', null)

    if (customerError || !customers) {
      return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 })
    }

    const uniqueEmails = Array.from(new Set(customers.map(c => c.email).filter(Boolean))) as string[]

    if (uniqueEmails.length === 0) {
      return NextResponse.json({ error: 'No customers found with valid email addresses.' }, { status: 400 })
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

        for (const email of uniqueEmails) {
          try {
            sendEvent({ type: 'progress', email, status: 'sending' })
            
            await sendSmtpEmail({
              to: email,
              subject: subject,
              html: formattedHtml,
              text: formattedText,
            })
            
            sentCount++
            sendEvent({ type: 'progress', email, status: 'sent' })
            
            // Artificial delay to prevent rate-limiting the SMTP server
            await new Promise(resolve => setTimeout(resolve, 300))
          } catch (e) {
            console.error(`Failed to send to ${email}:`, e)
            failedCount++
            sendEvent({ type: 'progress', email, status: 'error' })
          }
        }

        sendEvent({ type: 'complete', sentCount, failedCount, totalAttempted: uniqueEmails.length })
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
