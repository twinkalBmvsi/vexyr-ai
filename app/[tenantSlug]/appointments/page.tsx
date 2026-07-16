import CalendarView from '@/components/dashboard/CalendarView'

export default async function AppointmentsPage() {
  // Mock appointments with extra details for the modal
  const appointments = [
    { 
      id: 1, 
      name: 'John Doe - Lead Call', 
      time: '10:00 AM', 
      date: 'Today, Aug 14', 
      duration: '30 min', 
      type: 'Google Meet',
      email: 'john.doe@example.com',
      phone: '+1 (555) 123-4567',
      notes: 'Customer is interested in the premium package. Asked about scaling limits.'
    },
    { 
      id: 2, 
      name: 'Sarah Smith - Demo', 
      time: '2:30 PM', 
      date: 'Today, Aug 14', 
      duration: '45 min', 
      type: 'Zoom',
      email: 'sarah.smith@example.com',
      phone: '+1 (555) 987-6543',
      notes: 'Wants a live demonstration of the Telegram bot integration.'
    },
    { 
      id: 3, 
      name: 'Mike Johnson - Follow up', 
      time: '11:00 AM', 
      date: 'Tomorrow, Aug 15', 
      duration: '15 min', 
      type: 'Phone Call',
      email: 'mike.j@example.com',
      phone: '+1 (555) 456-7890',
      notes: 'Following up on the proposal sent last week.'
    },
  ]

  return (
    <div>
      <div className="dash-header">
        <h1 className="dash-title">Appointments</h1>
        <p className="dash-subtitle">Manage your AI-booked meetings and connect external calendars.</p>
      </div>

      <CalendarView appointments={appointments} />
    </div>
  )
}
