import CalendarView from '@/components/dashboard/CalendarView'
import CalendarSyncButtons from '@/components/dashboard/CalendarSyncButtons'
import ScheduleAppointmentButton from '@/components/dashboard/ScheduleAppointmentButton'
import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import { Calendar as CalendarIcon, Clock, User, Mail, Phone, CheckCircle2, XCircle, CalendarX } from 'lucide-react'
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

  // Helper matching CalendarView's exact YYYY-MM-DD calculation
  const toYMD = (d: Date) => {
    const offset = d.getTimezoneOffset()
    const local = new Date(d.getTime() - (offset * 60 * 1000))
    return local.toISOString().split('T')[0]
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
    const startHour = start.getHours() + (start.getMinutes() / 60)

    const dateStr = start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    const timeStr = `${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`

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
          <ScheduleAppointmentButton tenantId={tenant.id} />
          <CalendarSyncButtons isSyncAllowed={isSyncAllowed} />
        </div>
      </div>

      {/* Calendar Grid View displaying active real appointments */}
      <CalendarView appointments={calendarAppointments} tenantId={tenant.id} businessHours={businessHours} />

      {/* Live Booked Appointments Table */}
      <div style={{ marginTop: '3rem' }}>
        <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: '1.8rem', color: 'var(--ink)', marginBottom: '1rem' }}>
          All Booked Appointments ({liveAppointments.length})
        </h2>

        {liveAppointments.length === 0 ? (
          <div className="dash-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <CalendarX size={40} color="var(--gold)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.2rem', color: 'var(--ink)', marginBottom: '0.5rem' }}>No Real Appointments Booked Yet</h3>
            <p style={{ maxWidth: '450px', fontSize: '0.85rem', lineHeight: 1.6 }}>
              Send a message to your Telegram or WhatsApp bot (e.g., <em>"I want to book an appointment for tomorrow 4PM"</em>) to schedule a real appointment live!
            </p>
          </div>
        ) : (
          <div className="dash-grid" style={{ gap: '1.25rem', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
            {liveAppointments.map(apt => {
              const isCancelled = apt.status === 'cancelled'
              const statusBg = isCancelled ? 'rgba(239, 68, 68, 0.1)' : 'rgba(42, 122, 74, 0.1)'
              const statusColor = isCancelled ? '#dc2626' : '#2a7a4a'
              const borderColor = isCancelled ? '#dc2626' : '#2a7a4a'

              return (
                <div key={apt.id} className="dash-card" style={{ borderLeft: `4px solid ${borderColor}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--ink)', textDecoration: isCancelled ? 'line-through' : 'none' }}>
                      {apt.name}
                    </h3>
                    <span style={{ fontSize: '0.75rem', background: statusBg, color: statusColor, padding: '0.2rem 0.5rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontWeight: 500 }}>
                      {isCancelled ? <XCircle size={12} /> : <CheckCircle2 size={12} />} {apt.status.toUpperCase()}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <CalendarIcon size={14} color="var(--gold)" />
                      <span>{apt.dateStr}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Clock size={14} color="var(--gold)" />
                      <span>{apt.timeStr}</span>
                    </div>
                    {apt.customerName && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <User size={14} color="var(--gold)" />
                        <span>{apt.customerName}</span>
                      </div>
                    )}
                    {apt.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Phone size={14} color="var(--gold)" />
                        <span>{apt.phone}</span>
                      </div>
                    )}
                    {apt.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Mail size={14} color="var(--gold)" />
                        <span>{apt.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
