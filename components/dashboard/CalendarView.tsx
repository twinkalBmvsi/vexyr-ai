'use client'

import { useState } from 'react'
import { Calendar as CalendarIcon, Clock, Link as LinkIcon, ExternalLink, X, Mail, Phone, Video } from 'lucide-react'

type Appointment = {
  id: number
  name: string
  time: string
  date: string
  duration: string
  type: string
  email: string
  phone: string
  notes: string
}

export default function CalendarView({ appointments }: { appointments: Appointment[] }) {
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null)

  return (
    <div className="dash-grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '3rem' }}>
      
      {/* LEFT COLUMN: APPOINTMENTS */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: '1.8rem' }}>Upcoming</h2>
          <button className="btn-primary" style={{ padding: '0.6rem 1.5rem' }}>+ Manual Booking</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {['Today, Aug 14', 'Tomorrow, Aug 15', 'Friday, Aug 16'].map((dateGroup, index) => (
            <div key={index}>
              <h3 style={{ fontFamily: 'DM Mono', fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                {dateGroup}
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {appointments.filter((a, i) => (index === 0 ? i < 2 : index === 1 ? i === 2 : false)).map(apt => (
                  <div key={apt.id} className="dash-card" style={{ padding: '1.5rem', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                      <div style={{ background: 'rgba(201, 168, 76, 0.1)', padding: '1rem', borderRadius: '8px', textAlign: 'center', minWidth: '80px' }}>
                        <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--gold)', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>TIME</span>
                        <span style={{ fontFamily: 'DM Mono', fontSize: '0.9rem', color: 'var(--ink)' }}>{apt.time}</span>
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 500, color: 'var(--ink)', marginBottom: '0.3rem' }}>{apt.name}</h3>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                          <span style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', fontSize: '0.75rem', color: 'var(--muted)' }}>
                            <Clock size={12} /> {apt.duration}
                          </span>
                          <span style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', fontSize: '0.75rem', color: 'var(--muted)' }}>
                            <ExternalLink size={12} /> {apt.type}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <button 
                        className="btn-secondary" 
                        style={{ padding: '0.5rem 1rem' }}
                        onClick={() => setSelectedApt(apt)}
                      >
                        Details
                      </button>
                    </div>
                  </div>
                ))}
                {index === 2 && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--muted)', fontStyle: 'italic' }}>No appointments scheduled.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT COLUMN: CALENDAR SYNC */}
      <div>
        <div className="dash-card">
          <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: '1.8rem', marginBottom: '1.5rem' }}>Calendar Sync</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '2rem' }}>
            Connect your external calendars so your AI agents can check your availability in real-time before booking meetings.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ border: '1px solid var(--border-strong)', padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <CalendarIcon size={20} color="var(--ink)" />
                <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Google Calendar</span>
              </div>
              <button style={{ background: 'none', border: 'none', color: 'var(--gold)', fontSize: '0.75rem', fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer' }}>
                Connect
              </button>
            </div>

            <div style={{ border: '1px solid var(--border)', padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: 0.7 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <CalendarIcon size={20} color="var(--muted)" />
                <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--muted)' }}>Outlook / Office 365</span>
              </div>
              <button style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '0.75rem', fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer' }}>
                Connect
              </button>
            </div>
            
            <div style={{ border: '1px solid var(--border)', padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: 0.7 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <LinkIcon size={20} color="var(--muted)" />
                <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--muted)' }}>Calendly</span>
              </div>
              <button style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '0.75rem', fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer' }}>
                Connect
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SLIDE OVER MODAL */}
      <div 
        className={`slide-overlay ${selectedApt ? 'open' : ''}`} 
        onClick={() => setSelectedApt(null)} 
      />
      
      <div className={`slide-panel ${selectedApt ? 'open' : ''}`}>
        <div className="slide-header">
          <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: '1.5rem', fontWeight: 600 }}>Appointment Details</h2>
          <button className="close-btn" onClick={() => setSelectedApt(null)}>
            <X size={20} />
          </button>
        </div>

        {selectedApt && (
          <div className="slide-content">
            <h3 style={{ fontSize: '1.35rem', fontWeight: 500, marginBottom: '1.5rem' }}>{selectedApt.name}</h3>
            
            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <CalendarIcon size={16} color="var(--gold)" />
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</p>
                  <p style={{ fontSize: '0.9rem' }}>{selectedApt.date}</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Clock size={16} color="var(--gold)" />
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Time</p>
                  <p style={{ fontSize: '0.9rem' }}>{selectedApt.time} ({selectedApt.duration})</p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                  <Video size={14} /> Meeting Type
                </p>
                <p style={{ fontSize: '0.95rem' }}>{selectedApt.type}</p>
              </div>

              <div>
                <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                  <Mail size={14} /> Contact Email
                </p>
                <p style={{ fontSize: '0.95rem' }}>{selectedApt.email}</p>
              </div>

              <div>
                <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                  <Phone size={14} /> Contact Phone
                </p>
                <p style={{ fontSize: '0.95rem' }}>{selectedApt.phone}</p>
              </div>

              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                  AI Agent Notes
                </p>
                <div style={{ background: 'var(--cream)', padding: '1rem', borderRadius: '8px', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  {selectedApt.notes}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '3rem', display: 'flex', gap: '1rem' }}>
              <button className="btn-primary" style={{ flex: 1, padding: '0.8rem' }}>Join Meeting</button>
              <button className="btn-secondary" style={{ flex: 1, padding: '0.8rem' }}>Reschedule</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
