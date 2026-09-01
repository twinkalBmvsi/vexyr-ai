'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendSmtpEmail, isSmtpConfigured } from '@/utils/email/smtp'
import { getBusinessHours } from '@/app/actions/settings'

export async function scheduleAppointment(
  tenantId: string, 
  customerName: string, 
  customerEmail: string,
  customerPhone: string,
  title: string, 
  startTime: string, 
  endTime: string, 
  notes?: string
) {
  const supabase = await createClient()
  
  // Verify auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  // Validate business hours and past dates
  const reqStart = new Date(startTime)
  const now = new Date()
  if (reqStart.getTime() < now.getTime()) {
    return { success: false, error: 'Cannot schedule appointments in the past.' }
  }

  const businessHours = await getBusinessHours(tenantId)
  if (businessHours.offDays.includes(reqStart.getDay())) {
    return { success: false, error: 'Cannot schedule an appointment on a day off.' }
  }
  const reqStartHour = reqStart.getHours()
  const reqEndHour = new Date(endTime).getHours()
  if (reqStartHour < businessHours.startHour || reqEndHour > businessHours.endHour || (reqEndHour === businessHours.endHour && new Date(endTime).getMinutes() > 0)) {
    return { success: false, error: `Outside business hours (${businessHours.startHour}:00 - ${businessHours.endHour}:00).` }
  }

  // Find or create customer based on name
  let customerId = null
  let customerData = null
  const { data: existingCustomer } = await supabase
    .from('customers')
    .select('id, name, email, phone')
    .eq('tenant_id', tenantId)
    .eq('name', customerName)
    .limit(1)
    .maybeSingle()

  if (existingCustomer) {
    customerId = existingCustomer.id
    customerData = existingCustomer

    // Update customer if email/phone provided but missing in db
    const updates: any = {}
    if (customerEmail && existingCustomer.email !== customerEmail) updates.email = customerEmail
    if (customerPhone && existingCustomer.phone !== customerPhone) updates.phone = customerPhone
    
    if (Object.keys(updates).length > 0) {
      await supabase.from('customers').update(updates).eq('id', customerId)
      customerData = { ...existingCustomer, ...updates }
    }
  } else {
    // Create new customer
    const { data: newCustomer, error: customerErr } = await supabase
      .from('customers')
      .insert({
        tenant_id: tenantId,
        name: customerName,
        email: customerEmail || null,
        phone: customerPhone || null,
        channel: 'web'
      })
      .select('id, name, email, phone')
      .single()

    if (customerErr || !newCustomer) {
      console.error('Failed to create customer:', customerErr)
      return { success: false, error: 'Failed to create customer' }
    }
    customerId = newCustomer.id
    customerData = newCustomer
  }

  // Find a default internal calendar for this tenant
  let calendarId = null
  const { data: existingCalendar } = await supabase
    .from('calendars')
    .select('id')
    .eq('tenant_id', tenantId)
    .limit(1)
    .maybeSingle()

  if (existingCalendar) {
    calendarId = existingCalendar.id
  } else {
    // Create default calendar
    const { data: newCalendar, error: calErr } = await supabase
      .from('calendars')
      .insert({
        tenant_id: tenantId,
        name: 'Default Calendar',
        provider: 'internal'
      })
      .select('id')
      .single()
      
    if (calErr || !newCalendar) {
      console.error('Failed to create default calendar:', calErr)
      return { success: false, error: 'Failed to create calendar' }
    }
    calendarId = newCalendar.id
  }

  const finalTitle = title || `Appointment with ${customerName}`

  // Insert the appointment
  const { data: appointment, error } = await supabase
    .from('appointments')
    .insert({
      tenant_id: tenantId,
      customer_id: customerId,
      calendar_id: calendarId,
      title: finalTitle,
      start_time: startTime,
      end_time: endTime,
      status: 'confirmed',
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to schedule appointment:', error)
    return { success: false, error: 'Failed to schedule appointment' }
  }

  // Send confirmation email
  const start = new Date(startTime)
  const formattedDate = start.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const formattedTime = start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  if (customerData.email && isSmtpConfigured()) {
    // 1. Check if they have the customEmails module
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('status, modules, tenants(name)')
      .eq('tenant_id', tenantId)
      .single()

    const businessName = sub?.tenants?.name || 'Our Business'
    const customEmailsMod = (sub?.modules as any)?.customEmails
    const hasCustomEmails = !!customEmailsMod && (
      customEmailsMod === true ||
      (typeof customEmailsMod === 'object' && customEmailsMod.expires_at && new Date(customEmailsMod.expires_at) > new Date())
    )

    let customSubject = null
    let customBodyHtml = null
    let customBodyText = null

    // 2. Fetch custom template if active
    if (hasCustomEmails) {
      const { data: template } = await supabase
        .from('email_templates')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('template_type', 'appointment_confirmation')
        .maybeSingle()

      if (template) {
        // 3. Interpolate variables
        const interpolate = (str: string) => {
          return str
            .replace(/\{\{customer_name\}\}/g, customerData.name || 'Customer')
            .replace(/\{\{business_name\}\}/g, businessName)
            .replace(/\{\{appointment_date\}\}/g, formattedDate)
            .replace(/\{\{appointment_time\}\}/g, formattedTime)
            .replace(/\{\{appointment_title\}\}/g, finalTitle)
        }

        customSubject = interpolate(template.subject)
        const interpolatedBody = interpolate(template.body)
        
        // Pass the raw HTML exactly as the user typed it
        customBodyHtml = interpolatedBody
        // Strip HTML for plain text fallback
        customBodyText = interpolatedBody.replace(/<[^>]+>/g, '')
      }
    }

    sendSmtpEmail({
      to: customerData.email,
      subject: customSubject || `Appointment Confirmed: ${finalTitle}`,
      text: customBodyText || `Hi ${customerData.name},\n\nYour appointment for ${finalTitle} is confirmed for ${formattedDate} at ${formattedTime}.\n\nThank you!`,
      html: customBodyHtml || `
        <div style="font-family: Arial, sans-serif; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e5e5; border-radius: 8px;">
          <h2 style="color: #2a7a4a; margin-top: 0;">Appointment Confirmed!</h2>
          <p>Hello <strong>${customerData.name}</strong>,</p>
          <p>Your appointment has been successfully scheduled. Here are the details:</p>
          <div style="background: #f9f9fb; padding: 16px; border-radius: 6px; margin: 20px 0; border: 1px solid #eeeeee;">
            <p style="margin: 6px 0;"><strong>Service / Meeting:</strong> ${finalTitle}</p>
            <p style="margin: 6px 0;"><strong>Date:</strong> ${formattedDate}</p>
            <p style="margin: 6px 0;"><strong>Time:</strong> ${formattedTime}</p>
            <p style="margin: 6px 0;"><strong>Status:</strong> Confirmed</p>
          </div>
        </div>
      `
    }).catch(err => console.error('SMTP Error:', err))
  }

  revalidatePath('/[tenantSlug]/appointments', 'page')
  return { success: true, appointment }
}

export async function updateAppointmentStatus(appointmentId: string, status: 'completed' | 'cancelled' | 'confirmed') {
  const supabase = await createClient()

  // Verify auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  // Get appointment details for email
  const { data: existingApt } = await supabase
    .from('appointments')
    .select('*, customers(name, email)')
    .eq('id', appointmentId)
    .single()

  const { error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('id', appointmentId)

  if (error) {
    console.error(`Failed to update appointment status to ${status}:`, error)
    return { success: false, error: 'Failed to update appointment status' }
  }

  // Send email if applicable
  if (existingApt && existingApt.customers?.email && isSmtpConfigured()) {
    const customer = existingApt.customers
    const aptDate = new Date(existingApt.start_time).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    const aptTime = new Date(existingApt.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    
    // 1. Check if they have the customEmails module
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('status, modules, tenants(name)')
      .eq('tenant_id', existingApt.tenant_id)
      .single()

    const businessName = sub?.tenants?.name || 'Our Business'
    const customEmailsMod = (sub?.modules as any)?.customEmails
    const hasCustomEmails = !!customEmailsMod && (
      customEmailsMod === true ||
      (typeof customEmailsMod === 'object' && customEmailsMod.expires_at && new Date(customEmailsMod.expires_at) > new Date())
    )

    let customSubject = null
    let customBodyHtml = null
    let customBodyText = null

    if (status === 'cancelled' || status === 'completed') {
      const templateType = status === 'cancelled' ? 'appointment_cancellation' : 'appointment_complete'

      if (hasCustomEmails) {
        const { data: template } = await supabase
          .from('email_templates')
          .select('*')
          .eq('tenant_id', existingApt.tenant_id)
          .eq('template_type', templateType)
          .maybeSingle()

        if (template) {
          const interpolate = (str: string) => {
            return str
              .replace(/\{\{customer_name\}\}/g, customer.name || 'Customer')
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
    }

    if (status === 'cancelled') {
      sendSmtpEmail({
        to: customer.email,
        subject: customSubject || `Appointment Cancelled: ${existingApt.title}`,
        text: customBodyText || `Hi ${customer.name},\n\nYour appointment "${existingApt.title}" on ${aptDate} has been cancelled.\n\nThank you!`,
        html: customBodyHtml || `
          <div style="font-family: Arial, sans-serif; padding: 24px; color: #1a1a1a;">
            <h2 style="color: #c93b2b;">Appointment Cancelled</h2>
            <p>Hello <strong>${customer.name}</strong>,</p>
            <p>Your appointment <strong>${existingApt.title}</strong> on ${aptDate} has been cancelled.</p>
          </div>
        `
      }).catch(err => console.error('SMTP Error:', err))
    } else if (status === 'completed') {
      sendSmtpEmail({
        to: customer.email,
        subject: customSubject || `Thank you for visiting! (${existingApt.title})`,
        text: customBodyText || `Hi ${customer.name},\n\nYour appointment "${existingApt.title}" is now complete. Thank you for your business!\n\nBest regards,`,
        html: customBodyHtml || `
          <div style="font-family: Arial, sans-serif; padding: 24px; color: #1a1a1a;">
            <h2 style="color: #2a7a4a;">Appointment Complete</h2>
            <p>Hello <strong>${customer.name}</strong>,</p>
            <p>Your appointment <strong>${existingApt.title}</strong> has been marked as complete. Thank you for visiting us!</p>
          </div>
        `
      }).catch(err => console.error('SMTP Error:', err))
    }
  }

  revalidatePath('/[tenantSlug]/appointments', 'page')
  return { success: true }
}

export async function rescheduleAppointment(appointmentId: string, newStartTime: string, newEndTime: string) {
  const supabase = await createClient()

  // Verify auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  // Get appointment details for email
  const { data: existingApt } = await supabase
    .from('appointments')
    .select('*, customers(name, email)')
    .eq('id', appointmentId)
    .single()

  if (!existingApt) {
    return { success: false, error: 'Appointment not found' }
  }

  // Validate business hours and past dates
  const reqStart = new Date(newStartTime)
  const now = new Date()
  if (reqStart.getTime() < now.getTime()) {
    return { success: false, error: 'Cannot reschedule appointments to the past.' }
  }

  const businessHours = await getBusinessHours(existingApt.tenant_id)
  if (businessHours.offDays.includes(reqStart.getDay())) {
    return { success: false, error: 'Cannot reschedule to a day off.' }
  }
  const reqStartHour = reqStart.getHours()
  const reqEndHour = new Date(newEndTime).getHours()
  if (reqStartHour < businessHours.startHour || reqEndHour > businessHours.endHour || (reqEndHour === businessHours.endHour && new Date(newEndTime).getMinutes() > 0)) {
    return { success: false, error: `Outside business hours (${businessHours.startHour}:00 - ${businessHours.endHour}:00).` }
  }

  const { error } = await supabase
    .from('appointments')
    .update({ 
      start_time: newStartTime,
      end_time: newEndTime,
      status: 'confirmed'
    })
    .eq('id', appointmentId)

  if (error) {
    console.error('Failed to reschedule appointment:', error)
    return { success: false, error: 'Failed to reschedule appointment' }
  }

  // Send confirmation email
  if (existingApt && existingApt.customers?.email && isSmtpConfigured()) {
    const customer = existingApt.customers
    const start = new Date(newStartTime)
    const formattedDate = start.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    const formattedTime = start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

    // 1. Check if they have the customEmails module
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('status, modules, tenants(name)')
      .eq('tenant_id', existingApt.tenant_id)
      .single()

    const businessName = sub?.tenants?.name || 'Our Business'
    const customEmailsMod = (sub?.modules as any)?.customEmails
    const hasCustomEmails = !!customEmailsMod && (
      customEmailsMod === true ||
      (typeof customEmailsMod === 'object' && customEmailsMod.expires_at && new Date(customEmailsMod.expires_at) > new Date())
    )

    let customSubject = null
    let customBodyHtml = null
    let customBodyText = null

    if (hasCustomEmails) {
      const { data: template } = await supabase
        .from('email_templates')
        .select('*')
        .eq('tenant_id', existingApt.tenant_id)
        .eq('template_type', 'appointment_reschedule')
        .maybeSingle()

      if (template) {
        const interpolate = (str: string) => {
          return str
            .replace(/\{\{customer_name\}\}/g, customer.name || 'Customer')
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
      to: customer.email,
      subject: customSubject || `Appointment Rescheduled: ${existingApt.title}`,
      text: customBodyText || `Hi ${customer.name},\n\nYour appointment "${existingApt.title}" has been rescheduled to ${formattedDate} at ${formattedTime}.\n\nThank you!`,
      html: customBodyHtml || `
        <div style="font-family: Arial, sans-serif; padding: 24px; color: #1a1a1a;">
          <h2 style="color: #2a7a4a;">Appointment Rescheduled</h2>
          <p>Hello <strong>${customer.name}</strong>,</p>
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

  revalidatePath('/[tenantSlug]/appointments', 'page')
  return { success: true }
}
