'use client'

import { useState } from 'react'
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, X, Mail, Phone, Video, Users } from 'lucide-react'

type GridAppointment = {
  id: number
  name: string
  date: string // YYYY-MM-DD
  startHour: number // e.g. 9.5 for 9:30 AM
  durationHours: number // e.g. 1.5
  color: string
  // Details
  type: string
  email: string
  phone: string
  notes: string
  dateStr: string
  timeStr: string
  teammates?: string[]
}

export default function CalendarView({ appointments }: { appointments: GridAppointment[] }) {
  const [selectedApt, setSelectedApt] = useState<GridAppointment | null>(null)
  const [activeTab, setActiveTab] = useState<'Month' | 'Week' | 'Day'>('Week')
  const [currentDate, setCurrentDate] = useState(new Date())

  const navigate = (direction: 1 | -1) => {
    const newDate = new Date(currentDate)
    if (activeTab === 'Month') {
      newDate.setMonth(newDate.getMonth() + direction)
    } else if (activeTab === 'Week') {
      newDate.setDate(newDate.getDate() + (direction * 7))
    } else if (activeTab === 'Day') {
      newDate.setDate(newDate.getDate() + direction)
    }
    setCurrentDate(newDate)
  }

  const goToday = () => setCurrentDate(new Date())

  // Helper to format local date as YYYY-MM-DD to avoid timezone shifting
  const toYMD = (d: Date) => {
    const offset = d.getTimezoneOffset()
    const local = new Date(d.getTime() - (offset * 60 * 1000))
    return local.toISOString().split('T')[0]
  }

  // --- Dynamic Date Calculations ---
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
  const currentMonthName = monthNames[currentDate.getMonth()]
  const currentYear = currentDate.getFullYear()

  // Week View: Get 7 days for the currently viewed week
  const weekDays = []
  const d = new Date(currentDate)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
  const monday = new Date(d.setDate(diff))
  for (let i = 0; i < 7; i++) {
    const currDay = new Date(monday)
    currDay.setDate(monday.getDate() + i)
    const isToday = new Date().toDateString() === currDay.toDateString()
    weekDays.push({
      name: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
      num: currDay.getDate(),
      dateObj: currDay,
      active: isToday
    })
  }

  // Month View: Get 42 cells (6 weeks) for the currently viewed month
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const startingDayOfWeek = firstDayOfMonth.getDay() // 0 = Sun, 1 = Mon, etc.
  const startOffset = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1 // Make Mon = 0
  const monthDaysGrid = []
  for (let i = 0; i < 42; i++) {
    const cellDate = new Date(firstDayOfMonth)
    cellDate.setDate(1 - startOffset + i)
    monthDaysGrid.push({
      dateObj: cellDate,
      dateNum: cellDate.getDate(),
      isCurrentMonth: cellDate.getMonth() === currentDate.getMonth(),
      isToday: new Date().toDateString() === cellDate.toDateString(),
      dayIndex: i % 7 // 0=Mon, 6=Sun
    })
  }

  // Day View: Get info for the currently viewed single day
  const activeDayIndex = currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1
  const activeDayName = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][activeDayIndex]
  const activeDayNum = currentDate.getDate()

  // Hours: 8 AM to 6 PM (11 hours total, 0 to 10 index)
  const startDayHour = 8;
  const hoursCount = 11;
  const hours = Array.from({ length: hoursCount }, (_, i) => i + startDayHour);

  // Height of one hour in the grid
  const slotHeight = 80;

  return (
    <>
      <div className="calendar-container">
      {/* Top Navigation */}
      <div className="calendar-topbar">
        <div className="calendar-title-area">
          <h2 className="calendar-title">{currentMonthName} {currentYear}</h2>
          <button className="calendar-nav-btn" onClick={goToday} style={{ marginLeft: '1rem' }}>Today</button>
          <div style={{ display: 'flex', gap: '0.2rem' }}>
            <button className="calendar-arrow" onClick={() => navigate(-1)}><ChevronLeft size={20} /></button>
            <button className="calendar-arrow" onClick={() => navigate(1)}><ChevronRight size={20} /></button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <div className="calendar-toggle-group">
            <button className={`calendar-toggle-btn ${activeTab === 'Month' ? 'active' : ''}`} onClick={() => setActiveTab('Month')}>Month</button>
            <button className={`calendar-toggle-btn ${activeTab === 'Week' ? 'active' : ''}`} onClick={() => setActiveTab('Week')}>Week</button>
            <button className={`calendar-toggle-btn ${activeTab === 'Day' ? 'active' : ''}`} onClick={() => setActiveTab('Day')}>Day</button>
          </div>
          <button className="btn-primary" style={{ padding: '0.6rem 1.5rem', borderRadius: '8px' }}>Join</button>
        </div>
      </div>

      {activeTab === 'Month' && (
        <>
          <div className="calendar-month-days-header">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} className="calendar-day-cell" style={{ fontSize: '0.8rem', fontFamily: 'DM Mono', textTransform: 'uppercase', color: 'var(--muted)' }}>
                {day}
              </div>
            ))}
          </div>
          <div className="calendar-month-grid">
            {monthDaysGrid.map((cell, i) => {
              const cellYMD = toYMD(cell.dateObj)

              return (
                <div key={i} className={`calendar-month-cell ${!cell.isCurrentMonth ? 'empty' : ''}`}>
                  {cell.isCurrentMonth && (
                    <>
                      <div className={`calendar-month-date ${cell.isToday ? 'active' : ''}`}>
                        {cell.dateNum}
                      </div>
                      {/* Plot events mapping to this exact date */}
                      {appointments.filter(a => a.date === cellYMD).map(apt => (
                        <div 
                          key={apt.id} 
                          className="calendar-month-event"
                          style={{ backgroundColor: apt.color }}
                          onClick={() => setSelectedApt(apt)}
                        >
                          {apt.timeStr.split(' ')[0]} {apt.name}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {activeTab === 'Week' && (
        <div className="calendar-view-wrapper">
          {/* Days Header */}
          <div className="calendar-days-header">
            <div className="calendar-day-cell">
              <span style={{ fontSize: '0.7rem', color: 'var(--muted)', transform: 'rotate(-90deg)', display: 'inline-block', marginTop: '1rem' }}>GMT+3</span>
            </div>
            {weekDays.map((d, i) => (
              <div key={i} className="calendar-day-cell">
                <div className={`calendar-day-card ${d.active ? 'active' : ''}`}>
                  <span className="calendar-day-name">{d.name}</span>
                  <span className="calendar-day-num">{d.num}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Time Grid */}
          <div className="calendar-grid-body">
            {/* Time Labels Column */}
            <div className="calendar-time-col">
              {hours.map((h, i) => (
                <div key={i} className="calendar-time-slot">
                  <span className="calendar-time-label">
                    {h === 12 ? '12 pm' : h > 12 ? `${h - 12} pm` : `${h} am`}
                  </span>
                </div>
              ))}
            </div>

            {/* Day Columns */}
            {weekDays.map((_, dayIndex) => (
              <div key={dayIndex} className="calendar-day-col">
                {hours.map((_, i) => (
                  <div key={i} className="calendar-grid-line"></div>
                ))}

                {/* Render Appointments for this precise date */}
                {appointments.filter(a => a.date === toYMD(weekDays[dayIndex].dateObj)).map(apt => {
                  // Calculate Y position based on startHour (relative to startDayHour)
                  const top = (apt.startHour - startDayHour) * slotHeight;
                  const height = apt.durationHours * slotHeight;

                  return (
                    <div 
                      key={apt.id} 
                      className="calendar-event"
                      style={{ 
                        top: `${top}px`, 
                        height: `${height}px`,
                        backgroundColor: apt.color,
                      }}
                      onClick={() => setSelectedApt(apt)}
                    >
                      <h4 className="calendar-event-title">{apt.name}</h4>
                      <span className="calendar-event-time">{apt.timeStr}</span>
                      {/* Optional avatars mock */}
                      {apt.teammates && apt.teammates.length > 0 && (
                        <div style={{ display: 'flex', marginTop: '0.5rem' }}>
                          <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--ink)', border: '2px solid '+apt.color }} />
                          <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--muted)', border: '2px solid '+apt.color, marginLeft: '-8px' }} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'Day' && (
        <div className="calendar-view-wrapper">
          {/* Day Header */}
          <div className="calendar-days-header" style={{ gridTemplateColumns: '80px 1fr' }}>
            <div className="calendar-day-cell" style={{ borderRight: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--muted)', transform: 'rotate(-90deg)', display: 'inline-block', marginTop: '1rem' }}>GMT+3</span>
            </div>
            <div className="calendar-day-cell">
              <div className="calendar-day-card active" style={{ padding: '1rem 2rem' }}>
                <span className="calendar-day-name" style={{ fontSize: '1rem' }}>{activeDayName}</span>
                <span className="calendar-day-num" style={{ fontSize: '2.5rem' }}>{activeDayNum}</span>
              </div>
            </div>
          </div>

          <div className="calendar-day-view-body">
            {/* Time Labels */}
            <div className="calendar-day-time-col">
              {hours.map((h, i) => (
                <div key={i} className="calendar-time-slot">
                  <span className="calendar-time-label">
                    {h === 12 ? '12 pm' : h > 12 ? `${h - 12} pm` : `${h} am`}
                  </span>
                </div>
              ))}
            </div>

            {/* Day Column (Today is Wed, dayIndex = 2) */}
            <div className="calendar-day-col-wide">
              {hours.map((_, i) => (
                <div key={i} className="calendar-grid-line"></div>
              ))}

              {appointments.filter(a => a.date === toYMD(currentDate)).map(apt => {
                const top = (apt.startHour - startDayHour) * slotHeight;
                const height = apt.durationHours * slotHeight;

                return (
                  <div 
                    key={apt.id} 
                    className="calendar-day-event-wide"
                    style={{ 
                      top: `${top}px`, 
                      height: `${height}px`,
                      backgroundColor: apt.color,
                    }}
                    onClick={() => setSelectedApt(apt)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h4 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--ink)' }}>{apt.name}</h4>
                      <span style={{ fontFamily: 'DM Mono', fontSize: '0.85rem', color: 'var(--ink)', opacity: 0.7, background: 'rgba(255,255,255,0.4)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{apt.timeStr}</span>
                    </div>
                    
                    <p style={{ fontSize: '0.85rem', color: 'var(--ink)', opacity: 0.8, maxWidth: '600px', lineHeight: 1.5 }}>
                      {apt.notes}
                    </p>

                    <div style={{ marginTop: 'auto', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--ink)', opacity: 0.7 }}>
                        <Video size={14} /> {apt.type}
                      </span>
                      {apt.teammates && apt.teammates.length > 0 && (
                        <div style={{ display: 'flex' }}>
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--ink)', border: '2px solid '+apt.color }} />
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--muted)', border: '2px solid '+apt.color, marginLeft: '-10px' }} />
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Floating Modal (styled to look like the screenshot popup) */}
      {selectedApt && (
        <>
          <div className="slide-overlay open" style={{ background: 'rgba(0,0,0,0.1)', backdropFilter: 'none' }} onClick={() => setSelectedApt(null)} />
          <div 
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: '#ffffff',
              borderRadius: '16px',
              width: '380px',
              padding: '1.5rem',
              boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
              zIndex: 1000
            }}
          >
            <button 
              onClick={() => setSelectedApt(null)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}
            >
              <X size={16} />
            </button>
            
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '1.25rem' }}>
              {selectedApt.name}
            </h3>

            {/* Mock Tabs */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--muted)', cursor: 'pointer' }}>Projects</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink)', borderBottom: '2px solid var(--gold)', paddingBottom: '0.5rem', marginBottom: '-0.5rem', cursor: 'pointer' }}>Appointments</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--muted)', cursor: 'pointer' }}>Reminders</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>
                  <CalendarIcon size={14} /> Date
                </p>
                <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>{selectedApt.dateStr}</p>
              </div>
              <div>
                <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>
                  <Clock size={14} /> Time
                </p>
                <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>{selectedApt.timeStr}</p>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.75rem' }}>
                <Users size={14} /> Teammates
              </p>
              {selectedApt.teammates && selectedApt.teammates.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {selectedApt.teammates.map((tm, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--paper)', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--gold)' }} />
                        <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{tm}</span>
                      </div>
                      <X size={14} color="var(--muted)" style={{ cursor: 'pointer' }} />
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>No teammates assigned.</p>
              )}
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
               <button className="btn-primary" style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', fontSize: '0.8rem' }}>Join Meeting</button>
            </div>
          </div>
        </>
      )}
    </div>

    </>
  )
}
