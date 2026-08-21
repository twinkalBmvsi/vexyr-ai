import CalendarView from '@/components/dashboard/CalendarView'
import CalendarSyncButtons from '@/components/dashboard/CalendarSyncButtons'
import ScheduleAppointmentButton from '@/components/dashboard/ScheduleAppointmentButton'
import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { List } from 'lucide-react'
import { getBusinessHours } from '@/app/actions/settings'

export default async function AppointmentsPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const resolvedParams = await params
  const supabase = await createClient()

  // Verify auth and get tenant
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return notFound()
  }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, plan_id')
    .eq('slug', resolvedParams.tenantSlug)
    .single()

  if (!tenant) {
    return notFound()
  }

  // Verify membership
  const { data: membership } = await supabase
    .from('users')
    .select('role')
    .eq('user_id', user.id)
    .eq('tenant_id', tenant.id)
    .single()

  if (!membership) {
    return notFound()
  }

  // Get subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan_id')
    .eq('tenant_id', tenant.id)
    .maybeSingle()

  const planId = subscription?.plan_id || tenant.plan_id || 'free'
  const isSyncAllowed = planId === 'growth' || planId === 'enterprise'

  const businessHours = await getBusinessHours(tenant.id)

  const timeZone = (businessHours as any).timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone

  // Helper matching CalendarView's exact YYYY-MM-DD calculation but strictly enforcing the tenant timezone
  const toYMD = (d: Date) => {
    // Format to YYYY-MM-DD using Intl formatter
    const f = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
    return f.format(d)
  }

  // Fetch live appointments from Supabase backend
  const { data: dbAppointments } = await supabase
    .from('appointments')
    .select('*, customers(name, email, phone)')
    .eq('tenant_id', tenant.id)
    .order('start_time', { ascending: true })

  const liveAppointments = (dbAppointments || []).map((apt: any) => {
    const start = new Date(apt.start_time)
    const end = new Date(apt.end_time)
    const durationHours = Math.max(0.5, (end.getTime() - start.getTime()) / (1000 * 60 * 60))
    const timeZone = (businessHours as any).timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone
    
    // Get the hour in the tenant's timezone
    const startFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false
    })
    
    // Parse the output which will be in "HH:MM" 24h format
    const startParts = startFormatter.format(start).split(':')
    const startHourInt = parseInt(startParts[0], 10)
    const startMinInt = parseInt(startParts[1], 10)
    const startHour = startHourInt + (startMinInt / 60)

    const dateStr = start.toLocaleDateString('en-US', { timeZone, weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    const timeStr = `${start.toLocaleTimeString('en-US', { timeZone, hour: 'numeric', minute: '2-digit' })} - ${end.toLocaleTimeString('en-US', { timeZone, hour: 'numeric', minute: '2-digit' })}`

    const customerName = apt.customers?.name || 'Customer'
    const customerPhone = apt.customers?.phone || ''
    const customerEmail = apt.customers?.email || ''

    const isCancelled = apt.status === 'cancelled'

    return {
      id: apt.id,
      name: apt.title ? apt.title : `Appointment - ${customerName}`,
      date: toYMD(start),
      startHour,
      durationHours,
      color: isCancelled ? '#fee2e2' : 'var(--gold-light)',
      textColor: isCancelled ? '#991b1b' : '#0c0c0c',
      type: 'AI Booked',
      email: customerEmail,
      phone: customerPhone,
      customerName,
      notes: `Booked via AI Agent. Status: ${apt.status}`,
      dateStr,
      timeStr,
      status: apt.status,
      teammates: ['AI Agent']
    }
  })

  // Filter out cancelled appointments for the active calendar grid
  const calendarAppointments = liveAppointments.filter(apt => apt.status !== 'cancelled')

  return (
    <div>
      <div className="dash-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="dash-title">Appointments</h1>
          <p className="dash-subtitle">Manage your live AI-booked meetings, reschedules, and cancellations.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/appointments/list" className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
            <List size={16} /> View All
          </Link>
          <ScheduleAppointmentButton tenantId={tenant.id} />
          <CalendarSyncButtons isSyncAllowed={isSyncAllowed} />
        </div>
      </div>

      {/* Calendar Grid View displaying active real appointments */}
      <CalendarView appointments={calendarAppointments} tenantId={tenant.id} businessHours={businessHours} />
    </div>
  )
}
