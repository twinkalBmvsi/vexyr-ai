import CalendarView from '@/components/dashboard/CalendarView'

export default async function AppointmentsPage() {
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
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.75rem', fontFamily: 'DM Mono', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '0.5rem' }}>Sync:</span>
          
          <button 
            className="sync-btn"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '40px', height: '40px', borderRadius: '10px',
              background: 'var(--paper)', border: '1px solid var(--border-strong)',
              cursor: 'pointer', transition: 'all 0.2s', color: 'var(--ink)'
            }} 
            title="Connect Google Calendar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </button>

          <button 
            className="sync-btn-outline"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '40px', height: '40px', borderRadius: '10px',
              background: 'transparent', border: '1px solid var(--border)',
              cursor: 'pointer', transition: 'all 0.2s', color: 'var(--muted)'
            }} 
            title="Connect Outlook"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </button>
        </div>
      </div>

      <CalendarView appointments={appointments} />
    </div>
  )
}
