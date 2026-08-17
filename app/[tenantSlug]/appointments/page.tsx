import CalendarView from '@/components/dashboard/CalendarView'
import CalendarSyncButtons from '@/components/dashboard/CalendarSyncButtons'
import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'

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
    .single()

  const planId = subscription?.plan_id || tenant.plan_id || 'free'
  
  // Logic: Only Growth and Enterprise get external calendar sync (for now until add-on checkout is built)
  const isSyncAllowed = planId === 'growth' || planId === 'enterprise'

  // Helper to get local date strings relative to today for dynamic mock data
  const getOffsetDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - (offset * 60 * 1000));
    return local.toISOString().split('T')[0];
  }

  // Mock appointments formatted for exact dynamic dates
  const appointments = [
    { 
      id: 1, 
      name: 'John Doe - Lead Call', 
      date: getOffsetDate(1), // Tomorrow
      startHour: 9, // 9:00 AM
      durationHours: 1, // 1 hour
      color: 'var(--gold-light)',
      textColor: '#0c0c0c',
      type: 'Google Meet',
      email: 'john.doe@example.com',
      phone: '+1 (555) 123-4567',
      notes: 'Customer is interested in the premium package. Asked about scaling limits.',
      dateStr: new Date(new Date().setDate(new Date().getDate() + 1)).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      timeStr: '9:00 AM - 10:00 AM',
      teammates: ['Sarah Jenkins']
    },
    { 
      id: 2, 
      name: 'Sarah Smith - Demo', 
      date: getOffsetDate(0), // Today
      startHour: 10.5, // 10:30 AM
      durationHours: 1.5, // 1.5 hours
      color: '#e2d3e0', // Soft purple
      textColor: '#0c0c0c',
      type: 'Zoom',
      email: 'sarah.smith@example.com',
      phone: '+1 (555) 987-6543',
      notes: 'Wants a live demonstration of the Telegram bot integration.',
      dateStr: new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      timeStr: '10:30 AM - 12:00 PM',
      teammates: ['Michael Scott', 'Jim Halpert']
    },
    { 
      id: 3, 
      name: 'Mike Johnson - Follow up', 
      date: getOffsetDate(2), // 2 days from now
      startHour: 14, // 2:00 PM
      durationHours: 0.5, // 30 mins
      color: '#c9dbdb', // Soft teal
      textColor: '#0c0c0c',
      type: 'Phone Call',
      email: 'mike.j@example.com',
      phone: '+1 (555) 456-7890',
      notes: 'Following up on the proposal sent last week.',
      dateStr: new Date(new Date().setDate(new Date().getDate() + 2)).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      timeStr: '2:00 PM - 2:30 PM',
      teammates: []
    },
    { 
      id: 4, 
      name: 'Designers Meeting', 
      date: getOffsetDate(-1), // Yesterday
      startHour: 11, // 11:00 AM
      durationHours: 2, // 2 hours
      color: '#d4dae8', // Soft blue
      textColor: '#0c0c0c',
      type: 'Google Meet',
      email: 'design@vexyr.ai',
      phone: '',
      notes: 'Weekly sync with the design team.',
      dateStr: new Date(new Date().setDate(new Date().getDate() - 1)).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      timeStr: '11:00 AM - 1:00 PM',
      teammates: ['Alice', 'Bob']
    },
    { 
      id: 5, 
      name: 'Brain storming', 
      date: getOffsetDate(0), // Today
      startHour: 13, // 1:00 PM
      durationHours: 1.5, // 1.5 hours
      color: 'var(--cream)',
      textColor: 'var(--ink)',
      type: 'In Person',
      email: 'team@vexyr.ai',
      phone: '',
      notes: 'Brainstorming new features for Q4.',
      dateStr: new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      timeStr: '1:00 PM - 2:30 PM',
      teammates: ['Sarah Jenkins', 'Alice']
    },
  ]

  return (
    <div>
      <div className="dash-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="dash-title">Appointments</h1>
          <p className="dash-subtitle">Manage your AI-booked meetings and connect external calendars.</p>
        </div>
        
        <CalendarSyncButtons isSyncAllowed={isSyncAllowed} />
      </div>

      <CalendarView appointments={appointments} />
    </div>
  )
}
