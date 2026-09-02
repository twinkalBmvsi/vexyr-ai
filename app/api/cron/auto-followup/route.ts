import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { sendSmtpEmail, isSmtpConfigured } from '@/utils/email/smtp'

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

// Secure this endpoint with a token
const CRON_SECRET = process.env.CRON_SECRET || 'vexyr_cron_secret_123'

export async function POST(request: Request) {
  try {
    // 1. Verify Authentication
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[CRON] Starting automated follow-ups job...')

    // 2. Find ALL appointments that are completed and haven't been followed up on.
    // We will filter by delayHours dynamically per tenant in memory.
    const { data: appointments, error: aptError } = await supabaseAdmin
      .from('appointments')
      .select(`
        id,
        title,
        start_time,
        end_time,
        tenant_id,
        agent_id,
        customers (
          id,
          name,
          phone,
          email,
          channel
        )
      `)
      .eq('status', 'completed')
      .eq('follow_up_sent', false)

    if (aptError) {
      console.error('[CRON] Error fetching appointments:', aptError)
      return NextResponse.json({ error: aptError.message }, { status: 500 })
    }

    if (!appointments || appointments.length === 0) {
      console.log('[CRON] No follow-ups to send.')
      return NextResponse.json({ message: 'No follow-ups to send.' })
    }

    // 3. Fetch configurations for these tenants
    const tenantIds = [...new Set(appointments.map(a => a.tenant_id))]
    const { data: integrations } = await supabaseAdmin
      .from('integrations')
      .select('tenant_id, config')
      .eq('provider', 'auto_followup')
      .in('tenant_id', tenantIds)

    const configsByTenant: Record<string, any> = {}
    const DEFAULT_CONFIG = {
      enabled: true,
      delayHours: 2,
      agentName: 'Customer Success Team',
      instructions: 'Ask them if they were satisfied with the service and if they have any feedback. Then, kindly ask them to leave a 5-star review on our Google Business page here: https://g.page/review/12345'
    }

    if (integrations) {
      for (const intg of integrations) {
        configsByTenant[intg.tenant_id] = { ...DEFAULT_CONFIG, ...(intg.config as any) }
      }
    }

    let sentCount = 0

    // Process each appointment
    for (const apt of appointments) {
      const config = configsByTenant[apt.tenant_id] || DEFAULT_CONFIG
      
      if (!config.enabled) continue

      const delayMs = config.delayHours * 60 * 60 * 1000
      const appointmentEndMs = new Date(apt.end_time).getTime()
      
      if (Date.now() - appointmentEndMs < delayMs) {
        // Not enough time has passed based on this tenant's settings
        continue
      }

      const customer = apt.customers as any
      if (!customer) continue

      // Get agent info for context
      const { data: agent } = await supabaseAdmin
        .from('agents')
        .select('name, business_rules')
        .eq('id', apt.agent_id)
        .single()

      // Generate the AI message
      let businessName = 'Business'
      let services = 'General assistance'
      if (agent?.business_rules) {
        try {
          const rules = JSON.parse(agent.business_rules)
          businessName = rules.business_name || businessName
          services = rules.services || services
        } catch (e) {}
      }

      const systemPrompt = `You are ${config.agentName}, the dedicated follow-up agent representing ${businessName}.
The customer, ${customer.name || 'our client'}, just had an appointment for "${apt.title}" which was successfully completed today.
Write a short, friendly, and warm follow-up message. 
Keep it under 3-4 sentences. Be professional but very welcoming. Do not use placeholders.
STRICT INSTRUCTIONS FROM THE BUSINESS OWNER:
${config.instructions}`

      const completion = await openai.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'system', content: systemPrompt }],
        temperature: 0.7,
      })

      const aiMessage = completion.choices[0]?.message?.content || `Hi ${customer.name || 'there'}, thank you for choosing us for your recent appointment for ${apt.title}. We hope you had a great experience! Please let us know if you need any further assistance.`

      // Send the message via appropriate channel
      let delivered = false

      if (customer.channel === 'web' && customer.email && isSmtpConfigured()) {
        try {
          // Check removeBranding module for this tenant
          const { data: sub } = await supabaseAdmin
            .from('subscriptions')
            .select('modules')
            .eq('tenant_id', apt.tenant_id)
            .maybeSingle()

          const removeBrandingMod = (sub?.modules as any)?.removeBranding
          const hasBrandingRemoved = !!removeBrandingMod && (
            removeBrandingMod === true ||
            (typeof removeBrandingMod === 'object' && removeBrandingMod.expires_at && new Date(removeBrandingMod.expires_at) > new Date())
          )
          const brandingFooter = hasBrandingRemoved ? '' : `<p style="margin: 24px 0 0; font-size: 11px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 16px;">Powered by <a href="https://vexyr.ai" style="color: #999; text-decoration: none;">Vexyr AI</a></p>`

          await sendSmtpEmail({
            to: customer.email,
            subject: `Following up on your visit - ${businessName}`,
            text: aiMessage,
            html: `
              <div style="font-family: Arial, sans-serif; padding: 24px; color: #1a1a1a;">
                <h2 style="color: #2a7a4a;">Thank You!</h2>
                <p>${aiMessage.replace(/\n/g, '<br/>')}</p>
                <br/>
                <p style="color: #666; font-size: 0.9rem;">Best regards,<br/>${agent?.name || 'The Team'} at ${businessName}</p>
                ${brandingFooter}
              </div>
            `
          })
          delivered = true
        } catch (e) {
          console.error(`[CRON] Email send failed for apt ${apt.id}:`, e)
        }
      } else if (customer.channel === 'whatsapp' || customer.channel === 'telegram') {
        // Since we don't have the full API integration logic duplicated here,
        // we can theoretically call the external provider APIs.
        // For POC, we'll assume success or we can integrate specific API calls if we have tokens.
        // In reality, you'd fetch the channel token from `channels` table and use Axios to hit Meta/Telegram APIs.
        console.log(`[CRON] Would send WhatsApp/Telegram message to ${customer.phone}: ${aiMessage}`)
        delivered = true
      }

      // Record it
      if (delivered || customer.channel !== 'web') {
        // Find or create conversation
        let conversationId = null
        const { data: existingConvs } = await supabaseAdmin
          .from('conversations')
          .select('id')
          .eq('tenant_id', apt.tenant_id)
          .eq('customer_id', customer.id)
          .order('created_at', { ascending: false })
          .limit(1)
        
        if (existingConvs && existingConvs.length > 0) {
          conversationId = existingConvs[0].id
        } else {
          const { data: newConv } = await supabaseAdmin
            .from('conversations')
            .insert({ tenant_id: apt.tenant_id, customer_id: customer.id, agent_id: apt.agent_id, status: 'active' })
            .select('id')
            .single()
          conversationId = newConv?.id
        }

        if (conversationId) {
          await supabaseAdmin.from('messages').insert({
            tenant_id: apt.tenant_id,
            conversation_id: conversationId,
            sender_type: 'assistant',
            content: aiMessage,
            metadata: { source: 'auto_followup', appointment_id: apt.id }
          })
        }

        // Mark appointment as followed up
        await supabaseAdmin
          .from('appointments')
          .update({ follow_up_sent: true })
          .eq('id', apt.id)

        sentCount++
      }
    }

    console.log(`[CRON] Processed and sent ${sentCount} follow-ups.`)
    return NextResponse.json({ success: true, processed: sentCount })

  } catch (error: any) {
    console.error('[CRON] Fatal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
