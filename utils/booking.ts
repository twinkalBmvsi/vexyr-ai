import { createClient } from '@supabase/supabase-js'
import { sendSmtpEmail, isSmtpConfigured } from '@/utils/email/smtp'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export interface BookingParams {
  customer_name: string
  customer_phone?: string
  customer_email?: string
  appointment_title?: string
  preferred_datetime: string
  duration_minutes?: number
  notes?: string
}

export function parseDateTimeString(dateTimeStr: string): { start: Date; end: Date } {
  const now = new Date()
  let targetDate = new Date(now)
  const lower = (dateTimeStr || '').toLowerCase().trim()

  if (lower.includes('tomorrow')) {
    targetDate.setDate(targetDate.getDate() + 1)
  } else if (lower.includes('yesterday')) {
    targetDate.setDate(targetDate.getDate() - 1)
  } else {
    const dateMatch = lower.match(/(\d{4}[-/]\d{1,2}[-/]\d{1,2})/)
    if (dateMatch) {
      const parsed = new Date(dateMatch[1])
      if (!isNaN(parsed.getTime())) {
        targetDate = parsed
      }
    }
  }

  // Force current year if parsed year is in the past (e.g. AI model returned 2023)
  if (targetDate.getFullYear() < now.getFullYear()) {
    targetDate.setFullYear(now.getFullYear())
  }

  let hours = 10
  let minutes = 0

  const time12Match = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i)
  const time24Match = lower.match(/(\d{1,2}):(\d{2})/)

  if (time12Match) {
    let h = parseInt(time12Match[1], 10)
    const m = time12Match[2] ? parseInt(time12Match[2], 10) : 0
    const ampm = time12Match[3].toLowerCase()
    if (ampm === 'pm' && h < 12) h += 12
    if (ampm === 'am' && h === 12) h = 0
    hours = h
    minutes = m
  } else if (time24Match) {
    hours = parseInt(time24Match[1], 10)
    minutes = parseInt(time24Match[2], 10)
  }

  targetDate.setHours(hours, minutes, 0, 0)

  if (targetDate.getTime() < now.getTime() && !lower.includes('yesterday')) {
    targetDate.setDate(targetDate.getDate() + 1)
  }

  const startDate = new Date(targetDate)
  const durationMs = (60) * 60 * 1000
  const endDate = new Date(startDate.getTime() + durationMs)

  return { start: startDate, end: endDate }
}

export async function executeAppointmentBooking({
  tenantId,
  agentId,
  customerId,
  channelId,
  params
}: {
  tenantId: string
  agentId?: string
  customerId: string
  channelId?: string
  params: BookingParams
}) {
  try {
    // 1. Update customer profile details with name, phone, email if provided
    const customerUpdates: any = {}
    if (params.customer_name) customerUpdates.name = params.customer_name
    if (params.customer_phone) customerUpdates.phone = params.customer_phone
    if (params.customer_email) customerUpdates.email = params.customer_email

    if (Object.keys(customerUpdates).length > 0) {
      await supabaseAdmin
        .from('customers')
        .update(customerUpdates)
        .eq('id', customerId)
    }

    // 2. Get or create calendar for tenant
    let calendarId: string | null = null
    const { data: existingCalendars } = await supabaseAdmin
      .from('calendars')
      .select('id')
      .eq('tenant_id', tenantId)
      .limit(1)

    if (existingCalendars && existingCalendars.length > 0) {
      calendarId = existingCalendars[0].id
    } else {
      const { data: newCalendar } = await supabaseAdmin
        .from('calendars')
        .insert({
          tenant_id: tenantId,
          name: 'Primary Calendar',
          provider: 'internal'
        })
        .select('id')
        .single()
      calendarId = newCalendar?.id || null
    }

    if (!calendarId) {
      throw new Error('Failed to locate or create calendar')
    }

    // 3. Parse start & end times
    const { start, end } = parseDateTimeString(params.preferred_datetime)

    const title = params.appointment_title 
      ? `${params.appointment_title} - ${params.customer_name}`
      : `Appointment - ${params.customer_name}`

    // 4. Insert into public.appointments table
    const { data: appointment, error: aptErr } = await supabaseAdmin
      .from('appointments')
      .insert({
        tenant_id: tenantId,
        customer_id: customerId,
        agent_id: agentId || null,
        calendar_id: calendarId,
        title,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        status: 'confirmed'
      })
      .select('*')
      .single()

    if (aptErr) {
      console.error('Error inserting appointment:', aptErr)
      throw new Error(`Failed to book appointment: ${aptErr.message}`)
    }

    const formattedDate = start.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
    const formattedTime = start.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })

    // 5. Send Email confirmation via SMTP if email is provided (non-blocking)
    let emailSent = false
    if (params.customer_email && isSmtpConfigured()) {
      emailSent = true
      sendSmtpEmail({
        to: params.customer_email,
        subject: `Appointment Confirmation: ${title}`,
        text: `Hi ${params.customer_name},\n\nYour appointment for ${title} is confirmed for ${formattedDate} at ${formattedTime}.\n\nThank you!`,
        html: `
          <div style="font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e5e5; border-radius: 8px;">
            <h2 style="color: #2a7a4a; margin-top: 0;">Appointment Confirmed!</h2>
            <p>Hello <strong>${params.customer_name}</strong>,</p>
            <p>Your appointment has been successfully scheduled. Here are the details:</p>
            <div style="background: #f9f9fb; padding: 16px; border-radius: 6px; margin: 20px 0; border: 1px solid #eeeeee;">
              <p style="margin: 6px 0;"><strong>Service / Meeting:</strong> ${title}</p>
              <p style="margin: 6px 0;"><strong>Date:</strong> ${formattedDate}</p>
              <p style="margin: 6px 0;"><strong>Time:</strong> ${formattedTime}</p>
              <p style="margin: 6px 0;"><strong>Status:</strong> Confirmed</p>
            </div>
            <p style="color: #666; font-size: 0.9rem;">Thank you for choosing us! If you need to make any changes, please reply to this email.</p>
          </div>
        `
      }).catch(emailErr => {
        console.error('Failed to send confirmation email via SMTP:', emailErr)
      })
    }

    return {
      success: true,
      appointment,
      formattedDate,
      formattedTime,
      emailSent
    }
  } catch (error: any) {
    console.error('Error executing appointment booking:', error)
    return {
      success: false,
      error: error?.message || 'Failed to complete appointment booking'
    }
  }
}
