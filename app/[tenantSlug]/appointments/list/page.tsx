import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Calendar as CalendarIcon, Clock, User, Mail, Phone, CheckCircle2, XCircle, CalendarX, ArrowLeft } from 'lucide-react'
import { getBusinessHours } from '@/app/actions/settings'

export default async function AppointmentsListPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const resolvedParams = await params
  const supabase = await createClient()

  // Verify auth and get tenant
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return notFound()
  }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, slug')
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

  const businessHours = await getBusinessHours(tenant.id)
  const timeZone = businessHours.timeZone || 'UTC'

  // Fetch live appointments from Supabase backend
  const { data: dbAppointments } = await supabase
    .from('appointments')
    .select('*, customers(name, email, phone)')
    .eq('tenant_id', tenant.id)
    .order('start_time', { ascending: false }) // Show newest first for list view

  const liveAppointments = (dbAppointments || []).map((apt: any) => {
    const start = new Date(apt.start_time)
    const end = new Date(apt.end_time)

    const dateStr = start.toLocaleDateString('en-US', { timeZone, weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    const timeStr = `${start.toLocaleTimeString('en-US', { timeZone, hour: 'numeric', minute: '2-digit' })} - ${end.toLocaleTimeString('en-US', { timeZone, hour: 'numeric', minute: '2-digit' })}`

    const customerName = apt.customers?.name || 'Customer'
    const customerPhone = apt.customers?.phone || ''
    const customerEmail = apt.customers?.email || ''

    return {
      id: apt.id,
      name: apt.title ? apt.title : `Appointment - ${customerName}`,
      dateStr,
      timeStr,
      email: customerEmail,
      phone: customerPhone,
      customerName,
      status: apt.status
    }
  })

  return (
    <div>
      <div className="dash-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <Link href="/appointments" className="btn-secondary" style={{ padding: '0.4rem' }}>
              <ArrowLeft size={16} />
            </Link>
            <h1 className="dash-title" style={{ margin: 0 }}>All Booked Appointments</h1>
          </div>
          <p className="dash-subtitle">A comprehensive list of all scheduled, rescheduled, and cancelled appointments.</p>
        </div>
      </div>

      <div style={{ marginTop: '2rem' }}>
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
