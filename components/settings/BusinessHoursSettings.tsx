'use client'

import { useState } from 'react'
import { Clock3, Save } from 'lucide-react'
import { BusinessHoursConfig, saveBusinessHours } from '@/app/actions/settings'
import { toast } from 'react-hot-toast'

interface BusinessHoursSettingsProps {
  tenantId: string
  initialConfig: BusinessHoursConfig
}

export default function BusinessHoursSettings({ tenantId, initialConfig }: BusinessHoursSettingsProps) {
  const [config, setConfig] = useState<BusinessHoursConfig>(initialConfig)
  const [loading, setLoading] = useState(false)

  const daysOfWeek = [
    { id: 1, label: 'Mon' },
    { id: 2, label: 'Tue' },
    { id: 3, label: 'Wed' },
    { id: 4, label: 'Thu' },
    { id: 5, label: 'Fri' },
    { id: 6, label: 'Sat' },
    { id: 0, label: 'Sun' },
  ]

  const handleSave = async () => {
    setLoading(true)
    try {
      const result = await saveBusinessHours(tenantId, config)
      if (result.success) {
        toast.success('Business hours saved successfully')
      } else {
        toast.error(result.error || 'Failed to save business hours')
      }
    } catch (e) {
      toast.error('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const toggleDayOff = (day: number) => {
    setConfig(prev => {
      const isOff = prev.offDays.includes(day)
      return {
        ...prev,
        offDays: isOff 
          ? prev.offDays.filter(d => d !== day) 
          : [...prev.offDays, day]
      }
    })
  }

  return (
    <section className="settings-refined-section">
      <div className="settings-refined-heading">
        <Clock3 size={18} />
        <div>
          <h3>Operating Hours & Days Off</h3>
          <p>Define when your organization is open. Appointments cannot be booked outside these times or on your days off.</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', maxWidth: '400px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--ink)', marginBottom: '0.5rem' }}>Opening Time</label>
            <select 
              className="dash-input" 
              style={{ width: '100%', cursor: 'pointer' }}
              value={config.startHour}
              onChange={(e) => setConfig({ ...config, startHour: parseInt(e.target.value) })}
            >
              {Array.from({ length: 24 }).map((_, i) => (
                <option key={i} value={i}>
                  {i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--ink)', marginBottom: '0.5rem' }}>Closing Time</label>
            <select 
              className="dash-input" 
              style={{ width: '100%', cursor: 'pointer' }}
              value={config.endHour}
              onChange={(e) => setConfig({ ...config, endHour: parseInt(e.target.value) })}
            >
              {Array.from({ length: 24 }).map((_, i) => {
                // E.g., if start is 9, don't allow closing at 8
                if (i <= config.startHour) return null
                return (
                  <option key={i} value={i}>
                    {i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}
                  </option>
                )
              })}
            </select>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--ink)', marginBottom: '0.5rem' }}>Days Off (Weekends/Holidays)</label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {daysOfWeek.map(day => {
              const isOff = config.offDays.includes(day.id)
              return (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => toggleDayOff(day.id)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: isOff ? 'rgba(239, 68, 68, 0.1)' : 'var(--paper)',
                    color: isOff ? '#dc2626' : 'var(--ink)',
                    border: `1px solid ${isOff ? '#fca5a5' : 'var(--border)'}`
                  }}
                >
                  {day.label}
                </button>
              )
            })}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.5rem' }}>Select the days your organization is closed. The AI and Calendar will block these days.</p>
        </div>

        <div>
          <button 
            className="btn-primary" 
            onClick={handleSave} 
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', borderRadius: '8px' }}
          >
            <Save size={16} />
            {loading ? 'Saving...' : 'Save Hours'}
          </button>
        </div>
      </div>
    </section>
  )
}
