'use client'

import { useState } from 'react'
import { X, Calendar as CalendarIcon, Clock, User, FileText, Mail, Phone } from 'lucide-react'
import { scheduleAppointment } from '@/app/actions/appointments'
import { toast } from 'react-hot-toast'

interface ScheduleAppointmentModalProps {
  tenantId: string
  onClose: () => void
}

export default function ScheduleAppointmentModal({ tenantId, onClose }: ScheduleAppointmentModalProps) {
  const [loading, setLoading] = useState(false)
  
  // Helper for tomorrow's date
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    title: 'Consultation',
    date: tomorrowStr,
    time: '10:00',
    durationMinutes: '60',
    notes: ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const startDateTime = new Date(`${formData.date}T${formData.time}`)
      const endDateTime = new Date(startDateTime.getTime() + parseInt(formData.durationMinutes) * 60000)

      const result = await scheduleAppointment(
        tenantId,
        formData.customerName,
        formData.customerEmail,
        formData.customerPhone,
        formData.title,
        startDateTime.toISOString(),
        endDateTime.toISOString(),
        formData.notes
      )

      if (result.success) {
        toast.success('Appointment scheduled successfully!')
        onClose()
      } else {
        toast.error(result.error || 'Failed to schedule appointment')
      }
    } catch (error) {
      console.error(error)
      toast.error('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="slide-overlay open" onClick={onClose} />
      <div 
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'var(--cream)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          width: '450px',
          maxWidth: '90vw',
          padding: '2rem',
          boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
          zIndex: 1000,
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
      >
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}
        >
          <X size={20} />
        </button>
        
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '1.5rem', fontFamily: 'Cormorant Garamond' }}>
          Schedule Appointment
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 500, color: 'var(--ink)', marginBottom: '0.5rem' }}>
              <User size={16} color="var(--gold)" />
              Customer Name
            </label>
            <input
              type="text"
              name="customerName"
              value={formData.customerName}
              onChange={handleChange}
              placeholder="e.g. Jane Doe"
              required
              className="dash-input"
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 500, color: 'var(--ink)', marginBottom: '0.5rem' }}>
                <Mail size={16} color="var(--gold)" />
                Email
              </label>
              <input
                type="email"
                name="customerEmail"
                value={formData.customerEmail}
                onChange={handleChange}
                placeholder="jane@example.com"
                className="dash-input"
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 500, color: 'var(--ink)', marginBottom: '0.5rem' }}>
                <Phone size={16} color="var(--gold)" />
                Phone
              </label>
              <input
                type="tel"
                name="customerPhone"
                value={formData.customerPhone}
                onChange={handleChange}
                placeholder="+1 234 567 8900"
                className="dash-input"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 500, color: 'var(--ink)', marginBottom: '0.5rem' }}>
              <FileText size={16} color="var(--gold)" />
              Service / Title
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. Haircut & Styling"
              required
              className="dash-input"
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 500, color: 'var(--ink)', marginBottom: '0.5rem' }}>
                <CalendarIcon size={16} color="var(--gold)" />
                Date
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
                className="dash-input"
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 500, color: 'var(--ink)', marginBottom: '0.5rem' }}>
                <Clock size={16} color="var(--gold)" />
                Time
              </label>
              <input
                type="time"
                name="time"
                value={formData.time}
                onChange={handleChange}
                required
                className="dash-input"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 500, color: 'var(--ink)', marginBottom: '0.5rem' }}>
              Duration
            </label>
            <select
              name="durationMinutes"
              value={formData.durationMinutes}
              onChange={handleChange}
              className="dash-input"
              style={{ width: '100%', cursor: 'pointer' }}
            >
              <option value="15">15 Minutes</option>
              <option value="30">30 Minutes</option>
              <option value="45">45 Minutes</option>
              <option value="60">1 Hour</option>
              <option value="90">1.5 Hours</option>
              <option value="120">2 Hours</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 500, color: 'var(--ink)', marginBottom: '0.5rem' }}>
              Notes (Optional)
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Any special requests or details..."
              className="dash-input"
              style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
            />
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
            <button 
              type="button" 
              onClick={onClose} 
              className="btn-secondary" 
              style={{ flex: 1, padding: '0.75rem', borderRadius: '8px' }}
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary" 
              style={{ flex: 2, padding: '0.75rem', borderRadius: '8px' }}
              disabled={loading}
            >
              {loading ? 'Scheduling...' : 'Schedule Appointment'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
