import { createClient } from '@supabase/supabase-js'
import { sendSmtpEmail, isSmtpConfigured } from '@/utils/email/smtp'
import { getBusinessHours } from '@/app/actions/settings'

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

  // Track whether a relative day keyword was explicitly used.
  // If so, we must NOT apply the auto-bump fallback later — otherwise
  // "tomorrow 4pm" could accidentally become +2 days when server UTC
  // time is already past the requested hour.
  let isRelativeDay = false

  if (lower.includes('tomorrow')) {
    targetDate.setDate(targetDate.getDate() + 1)
    isRelativeDay = true
  } else if (lower.includes('yesterday')) {
    targetDate.setDate(targetDate.getDate() - 1)
    isRelativeDay = true
  } else if (lower.includes('today')) {
    // "today" — keep targetDate as-is (current date)
    isRelativeDay = true
  } else {
    // Try to parse an explicit date (YYYY-MM-DD or YYYY/MM/DD)
    const dateMatch = lower.match(/(\d{4}[-/]\d{1,2}[-/]\d{1,2})/)
    if (dateMatch) {
      const parsed = new Date(dateMatch[1])
      if (!isNaN(parsed.getTime())) {
        targetDate = parsed
        isRelativeDay = true // explicit date provided — respect it as-is
      }
    }

    // Also try natural month-name formats: "september 1", "1 september", "sep 1"
    const monthNames = ['january','february','march','april','may','june','july','august','september','october','november','december']
    const monthShort = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec']
    const allMonths = [...monthNames, ...monthShort]
    for (let i = 0; i < allMonths.length; i++) {
      const mName = allMonths[i]
      const mIndex = i >= 12 ? i - 12 : i
      if (lower.includes(mName)) {
        // Extract day number adjacent to month name
        const dayMatch = lower.match(new RegExp(`(?:${mName}\\s+(\\d{1,2})|(\\d{1,2})\\s+${mName})`))
        if (dayMatch) {
          const day = parseInt(dayMatch[1] || dayMatch[2], 10)
          const year = now.getFullYear()
          const candidate = new Date(year, mIndex, day)
          // If date is in the past, assume next year
          // NOTE: Use a separate variable — do NOT call now.setHours() as it mutates `now`
          const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
          if (candidate.getTime() < todayMidnight.getTime()) {
            candidate.setFullYear(year + 1)
          }
          targetDate = candidate
          isRelativeDay = true
          break
        }
      }
    }
  }

  // Force current year if parsed year is in the past (e.g. AI model returned 2023)
  const nowFresh = new Date()
  if (targetDate.getFullYear() < nowFresh.getFullYear()) {
    targetDate.setFullYear(nowFresh.getFullYear())
  }

  let hours = 10
  let minutes = 0

  const time12Match = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i)
  // Only match HH:MM 24-hour if NOT already matched by 12h pattern
  const time24Match = !time12Match ? lower.match(/(\d{1,2}):(\d{2})/) : null

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

  // Auto-bump to next day ONLY when:
  // 1. No explicit/relative day was given (e.g. user just said "4pm")
  // 2. The resolved time is in the past
  // 3. It's not "yesterday"
  if (!isRelativeDay && targetDate.getTime() < nowFresh.getTime() && !lower.includes('yesterday')) {
    targetDate.setDate(targetDate.getDate() + 1)
  }

  const startDate = new Date(targetDate)
  const durationMs = 60 * 60 * 1000 // 1 hour
  const endDate = new Date(startDate.getTime() + durationMs)

  return { start: startDate, end: endDate }
}

export async function checkSlotAvailability({
  tenantId,
  preferredDateTime
}: {
  tenantId: string
  preferredDateTime: string
}) {
  try {
    const { start, end } = parseDateTimeString(preferredDateTime)

    const { data: conflicts } = await supabaseAdmin
      .from('appointments')
      .select('id, title, start_time, end_time')
      .eq('tenant_id', tenantId)
      .neq('status', 'cancelled')
      .lt('start_time', end.toISOString())
      .gt('end_time', start.toISOString())

    const isAvailable = !conflicts || conflicts.length === 0
    const formattedDate = start.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    const formattedTime = start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

    return {
      available: isAvailable,
      formattedDate,
      formattedTime,
      conflictsCount: conflicts ? conflicts.length : 0
    }
  } catch (err: any) {
    console.error('Error checking availability:', err)
    return { available: true, formattedDate: '', formattedTime: '', conflictsCount: 0 }
  }
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
    //    IMPORTANT: The `phone` column doubles as the channel identifier
    //    (e.g. Telegram chatId, or "webchat_<sessionId>").
    //    We must NEVER overwrite it with the customer's real contact phone,
    //    or the next webhook message won't find this customer record.
    //
    //    Strategy:
    //    - Always update name and email (safe to overwrite)
    //    - Only update phone if the current value is null/empty (i.e. not yet
    //      set as a channel identifier) — this covers WhatsApp where real phone
    //      IS the identifier and is already stored correctly.
    //    - Store the real contact phone in metadata.contact_phone so it's
    //      accessible without destroying the identifier.
    const { data: existingCustomer } = await supabaseAdmin
      .from('customers')
      .select('phone, metadata')
      .eq('id', customerId)
      .maybeSingle()

    const customerUpdates: any = {}
    if (params.customer_name) customerUpdates.name = params.customer_name
    if (params.customer_email) customerUpdates.email = params.customer_email

    // Only write to `phone` if it's currently unset (not a channel identifier)
    if (params.customer_phone && !existingCustomer?.phone) {
      customerUpdates.phone = params.customer_phone
    }

    // Always persist the real contact phone in metadata (non-destructive)
    if (params.customer_phone) {
      customerUpdates.metadata = {
        ...(existingCustomer?.metadata || {}),
        contact_phone: params.customer_phone
      }
    }

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

    // Validate business hours
    const businessHours = await getBusinessHours(tenantId)
    if (businessHours.offDays.includes(start.getDay())) {
      return {
        success: false,
        error: `The requested day is a scheduled off-day. Please choose a different day.`
      }
    }
    const startHour = start.getHours()
    const endHour = end.getHours()
    if (startHour < businessHours.startHour || endHour > businessHours.endHour || (endHour === businessHours.endHour && end.getMinutes() > 0)) {
      return {
        success: false,
        error: `The requested time is outside business hours (${businessHours.startHour}:00 - ${businessHours.endHour}:00).`
      }
    }

    // Check for conflicting appointments in tenant
    const { data: conflicts } = await supabaseAdmin
      .from('appointments')
      .select('id, title')
      .eq('tenant_id', tenantId)
      .neq('status', 'cancelled')
      .neq('customer_id', customerId)
      .lt('start_time', end.toISOString())
      .gt('end_time', start.toISOString())

    if (conflicts && conflicts.length > 0) {
      const conflictDate = start.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
      const conflictTime = start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      return {
        success: false,
        error: `The requested slot (${conflictDate} at ${conflictTime}) is already booked by another customer. Please suggest an alternative date or time.`
      }
    }

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
      
      const { data: sub } = await supabaseAdmin
        .from('subscriptions')
        .select('status, modules, tenants(name)')
        .eq('tenant_id', tenantId)
        .single()

      const businessName = sub?.tenants?.name || 'Our Business'
      const hasCustomEmails = sub?.status === 'active' && (sub.modules as any)?.customEmails === true

      let customSubject = null
      let customBodyHtml = null
      let customBodyText = null

      if (hasCustomEmails) {
        const { data: template } = await supabaseAdmin
          .from('email_templates')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('template_type', 'appointment_confirmation')
          .maybeSingle()

        if (template) {
          const interpolate = (str: string) => {
            return str
              .replace(/\{\{customer_name\}\}/g, params.customer_name || 'Customer')
              .replace(/\{\{business_name\}\}/g, businessName)
              .replace(/\{\{appointment_date\}\}/g, formattedDate)
              .replace(/\{\{appointment_time\}\}/g, formattedTime)
              .replace(/\{\{appointment_title\}\}/g, title)
          }

          customSubject = interpolate(template.subject)
          customBodyHtml = interpolate(template.body)
          customBodyText = customBodyHtml.replace(/<[^>]+>/g, '')
        }
      }

      sendSmtpEmail({
        to: params.customer_email,
        subject: customSubject || `Appointment Confirmation: ${title}`,
        text: customBodyText || `Hi ${params.customer_name},\n\nYour appointment for ${title} is confirmed for ${formattedDate} at ${formattedTime}.\n\nThank you!`,
        html: customBodyHtml || `
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

export async function executeAppointmentReschedule({
  tenantId,
  customerId,
  newDateTime,
  customerName,
  customerEmail
}: {
  tenantId: string
  customerId: string
  newDateTime: string
  customerName?: string
  customerEmail?: string
}) {
  try {
    let existingApt: any = null
    const { data: byCustomer } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('customer_id', customerId)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    existingApt = byCustomer

    if (!existingApt) {
      const { data: latestTenantApt } = await supabaseAdmin
        .from('appointments')
        .select('*')
        .eq('tenant_id', tenantId)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      existingApt = latestTenantApt
    }

    if (!existingApt) {
      return {
        success: false,
        error: 'No active appointment found to reschedule.'
      }
    }

    const { start, end } = parseDateTimeString(newDateTime)

    // Validate business hours
    const businessHours = await getBusinessHours(tenantId)
    if (businessHours.offDays.includes(start.getDay())) {
      return {
        success: false,
        error: `The requested day is a scheduled off-day. Please choose a different day.`
      }
    }
    const startHour = start.getHours()
    const endHour = end.getHours()
    if (startHour < businessHours.startHour || endHour > businessHours.endHour || (endHour === businessHours.endHour && end.getMinutes() > 0)) {
      return {
        success: false,
        error: `The requested time is outside business hours (${businessHours.startHour}:00 - ${businessHours.endHour}:00).`
      }
    }

    // Check for conflicting appointments in tenant (excluding this appointment)
    const { data: conflicts } = await supabaseAdmin
      .from('appointments')
      .select('id, title')
      .eq('tenant_id', tenantId)
      .neq('id', existingApt.id)
      .neq('status', 'cancelled')
      .lt('start_time', end.toISOString())
      .gt('end_time', start.toISOString())

    if (conflicts && conflicts.length > 0) {
      const conflictDate = start.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
      const conflictTime = start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      return {
        success: false,
        error: `The requested time slot (${conflictDate} at ${conflictTime}) is unavailable. Please select another date or time.`
      }
    }

    const { data: updatedApt, error: updateErr } = await supabaseAdmin
      .from('appointments')
      .update({
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        status: 'confirmed'
      })
      .eq('id', existingApt.id)
      .select('*')
      .single()

    if (updateErr) {
      throw new Error(`Failed to update appointment: ${updateErr.message}`)
    }

    const formattedDate = start.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    const formattedTime = start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

    if (customerEmail && isSmtpConfigured()) {
      const { data: sub } = await supabaseAdmin
        .from('subscriptions')
        .select('status, modules, tenants(name)')
        .eq('tenant_id', tenantId)
        .single()

      const businessName = sub?.tenants?.name || 'Our Business'
      const hasCustomEmails = sub?.status === 'active' && (sub.modules as any)?.customEmails === true

      let customSubject = null
      let customBodyHtml = null
      let customBodyText = null

      if (hasCustomEmails) {
        const { data: template } = await supabaseAdmin
          .from('email_templates')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('template_type', 'appointment_reschedule')
          .maybeSingle()

        if (template) {
          const interpolate = (str: string) => {
            return str
              .replace(/\{\{customer_name\}\}/g, customerName || 'Customer')
              .replace(/\{\{business_name\}\}/g, businessName)
              .replace(/\{\{appointment_date\}\}/g, formattedDate)
              .replace(/\{\{appointment_time\}\}/g, formattedTime)
              .replace(/\{\{appointment_title\}\}/g, existingApt.title)
          }

          customSubject = interpolate(template.subject)
          customBodyHtml = interpolate(template.body)
          customBodyText = customBodyHtml.replace(/<[^>]+>/g, '')
        }
      }

      sendSmtpEmail({
        to: customerEmail,
        subject: customSubject || `Appointment Rescheduled: ${existingApt.title}`,
        text: customBodyText || `Hi ${customerName || 'there'},\n\nYour appointment "${existingApt.title}" has been rescheduled to ${formattedDate} at ${formattedTime}.\n\nThank you!`,
        html: customBodyHtml || `
          <div style="font-family: Arial, sans-serif; padding: 24px; color: #1a1a1a;">
            <h2 style="color: #2a7a4a;">Appointment Rescheduled</h2>
            <p>Hello <strong>${customerName || 'there'}</strong>,</p>
            <p>Your appointment has been updated to your requested new date and time:</p>
            <div style="background: #f9f9fb; padding: 16px; border-radius: 6px; margin: 16px 0;">
              <p style="margin: 4px 0;"><strong>Title:</strong> ${existingApt.title}</p>
              <p style="margin: 4px 0;"><strong>New Date:</strong> ${formattedDate}</p>
              <p style="margin: 4px 0;"><strong>New Time:</strong> ${formattedTime}</p>
            </div>
          </div>
        `
      }).catch(err => console.error('SMTP Error:', err))
    }

    return {
      success: true,
      appointment: updatedApt,
      formattedDate,
      formattedTime,
      title: existingApt.title
    }
  } catch (error: any) {
    console.error('Error rescheduling appointment:', error)
    return {
      success: false,
      error: error?.message || 'Failed to reschedule appointment'
    }
  }
}

export async function executeAppointmentCancel({
  tenantId,
  customerId,
  reason,
  customerName,
  customerEmail
}: {
  tenantId: string
  customerId: string
  reason?: string
  customerName?: string
  customerEmail?: string
}) {
  try {
    let existingApt: any = null
    const { data: byCustomer } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('customer_id', customerId)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    existingApt = byCustomer

    if (!existingApt) {
      const { data: latestTenantApt } = await supabaseAdmin
        .from('appointments')
        .select('*')
        .eq('tenant_id', tenantId)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      existingApt = latestTenantApt
    }

    if (!existingApt) {
      return {
        success: false,
        error: 'No active appointment found to cancel.'
      }
    }

    const { data: cancelledApt, error: updateErr } = await supabaseAdmin
      .from('appointments')
      .update({
        status: 'cancelled'
      })
      .eq('id', existingApt.id)
      .select('*')
      .single()

    if (updateErr) {
      throw new Error(`Failed to cancel appointment: ${updateErr.message}`)
    }

    if (customerEmail && isSmtpConfigured()) {
      const { data: sub } = await supabaseAdmin
        .from('subscriptions')
        .select('status, modules, tenants(name)')
        .eq('tenant_id', tenantId)
        .single()

      const businessName = sub?.tenants?.name || 'Our Business'
      const hasCustomEmails = sub?.status === 'active' && (sub.modules as any)?.customEmails === true

      let customSubject = null
      let customBodyHtml = null
      let customBodyText = null
      
      const aptDate = new Date(existingApt.start_time).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
      const aptTime = new Date(existingApt.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

      if (hasCustomEmails) {
        const { data: template } = await supabaseAdmin
          .from('email_templates')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('template_type', 'appointment_cancellation')
          .maybeSingle()

        if (template) {
          const interpolate = (str: string) => {
            return str
              .replace(/\{\{customer_name\}\}/g, customerName || 'Customer')
              .replace(/\{\{business_name\}\}/g, businessName)
              .replace(/\{\{appointment_date\}\}/g, aptDate)
              .replace(/\{\{appointment_time\}\}/g, aptTime)
              .replace(/\{\{appointment_title\}\}/g, existingApt.title)
          }

          customSubject = interpolate(template.subject)
          customBodyHtml = interpolate(template.body)
          customBodyText = customBodyHtml.replace(/<[^>]+>/g, '')
        }
      }

      sendSmtpEmail({
        to: customerEmail,
        subject: customSubject || `Appointment Cancelled: ${existingApt.title}`,
        text: customBodyText || `Hi ${customerName || 'there'},\n\nYour appointment "${existingApt.title}" has been cancelled as requested.\n\nThank you!`,
        html: customBodyHtml || `
          <div style="font-family: Arial, sans-serif; padding: 24px; color: #1a1a1a;">
            <h2 style="color: #c93b2b;">Appointment Cancelled</h2>
            <p>Hello <strong>${customerName || 'there'}</strong>,</p>
            <p>Your appointment <strong>${existingApt.title}</strong> has been cancelled as requested.</p>
          </div>
        `
      }).catch(err => console.error('SMTP Error:', err))
    }

    return {
      success: true,
      appointment: cancelledApt,
      title: existingApt.title
    }
  } catch (error: any) {
    console.error('Error cancelling appointment:', error)
    return {
      success: false,
      error: error?.message || 'Failed to cancel appointment'
    }
  }
}

// ==========================================
// LIST APPOINTMENTS
// ==========================================

export interface AppointmentListItem {
  title: string
  formattedDate: string
  formattedTime: string
  status: string
}

export async function executeListAppointments({
  tenantId,
  customerId
}: {
  tenantId: string
  customerId: string
}): Promise<{
  success: boolean
  appointments?: AppointmentListItem[]
  count?: number
  error?: string
}> {
  try {
    const nowIso = new Date().toISOString()

    const { data: apts, error } = await supabaseAdmin
      .from('appointments')
      .select('title, start_time, end_time, status')
      .eq('tenant_id', tenantId)
      .eq('customer_id', customerId)
      .in('status', ['pending', 'confirmed'])
      .gte('start_time', nowIso)
      .order('start_time', { ascending: true })
      .limit(10)

    if (error) {
      throw new Error(error.message)
    }

    if (!apts || apts.length === 0) {
      return { success: true, appointments: [], count: 0 }
    }

    const appointments: AppointmentListItem[] = apts.map((apt) => {
      const start = new Date(apt.start_time)
      return {
        title: apt.title,
        formattedDate: start.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        }),
        formattedTime: start.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        status: apt.status
      }
    })

    return { success: true, appointments, count: appointments.length }
  } catch (error: any) {
    console.error('Error listing appointments:', error)
    return {
      success: false,
      error: error?.message || 'Failed to fetch appointments'
    }
  }
}
