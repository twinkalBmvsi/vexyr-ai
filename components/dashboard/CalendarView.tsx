'use client'

import { useState } from 'react'
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, X, Mail, Phone, Video, Users, CheckCircle2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import type { BusinessHoursConfig } from '@/app/actions/settings'

type GridAppointment = {
  id: string | number
  name: string
  date: string // YYYY-MM-DD
  startHour: number // e.g. 9.5 for 9:30 AM
  durationHours: number // e.g. 1.5
  color: string
  textColor?: string
  type: string
  email: string
  phone: string
  notes: string
  dateStr: string
  timeStr: string
  status: string
  teammates?: string[]
}

function isSameDate(date1Str: string, date2Str: string) {
  if (!date1Str || !date2Str) return false
  if (date1Str === date2Str) return true

  const parts1 = date1Str.split('-')
  const parts2 = date2Str.split('-')
  if (parts1.length === 3 && parts2.length === 3) {
    return (
      parseInt(parts1[0], 10) === parseInt(parts2[0], 10) &&
      parseInt(parts1[1], 10) === parseInt(parts2[1], 10) &&
      parseInt(parts1[2], 10) === parseInt(parts2[2], 10)
    )
  }
  return false
}

export default function CalendarView({ appointments, tenantId, businessHours }: { appointments: GridAppointment[], tenantId: string, businessHours: BusinessHoursConfig }) {
  const [selectedApt, setSelectedApt] = useState<GridAppointment | null>(null)
  const [activeTab, setActiveTab] = useState<'Month' | 'Week' | 'Day'>('Week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isRescheduling, setIsRescheduling] = useState(false)
  const [rescheduleData, setRescheduleData] = useState({ date: '', time: '', durationMinutes: '60' })
  const [loadingAction, setLoadingAction] = useState(false)
  
  const handleAction = async (action: 'completed' | 'cancelled') => {
    if (!selectedApt) return
    setLoadingAction(true)
    try {
      // @ts-ignore
      const { updateAppointmentStatus } = await import('@/app/actions/appointments')
      const res = await updateAppointmentStatus(selectedApt.id.toString(), action)
      if (res.success) {
        toast.success(`Appointment marked as ${action}`)
        setSelectedApt(null)
      } else {
        toast.error(res.error || 'Action failed')
      }
    } catch (e) {
      toast.error('An error occurred')
    } finally {
      setLoadingAction(false)
    }
  }

  const handleReschedule = async () => {
    if (!selectedApt) return
    setLoadingAction(true)
    try {
      const startDateTime = new Date(`${rescheduleData.date}T${rescheduleData.time}`)
      
      // Local frontend validation
      if (startDateTime.getTime() < new Date().getTime()) {
        toast.error("Cannot reschedule to a past time.")
        setLoadingAction(false)
        return
      }

      const endDateTime = new Date(startDateTime.getTime() + parseInt(rescheduleData.durationMinutes) * 60000)

      // @ts-ignore
      const { rescheduleAppointment } = await import('@/app/actions/appointments')
      const res = await rescheduleAppointment(selectedApt.id.toString(), startDateTime.toISOString(), endDateTime.toISOString())
      
      if (res.success) {
        toast.success('Appointment rescheduled')
        setIsRescheduling(false)
        setSelectedApt(null)
      } else {
        toast.error(res.error || 'Action failed')
      }
    } catch (e) {
      toast.error('An error occurred')
    } finally {
      setLoadingAction(false)
    }
  }

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

  const timeZone = (businessHours as any).timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone

  // Helper to format date as YYYY-MM-DD in the correct timezone
  const toYMD = (d: Date) => {
    const f = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
    return f.format(d)
  }

  // --- Dynamic Date Calculations ---
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
  const currentMonthName = monthNames[currentDate.getMonth()]
  const currentYear = currentDate.getFullYear()

  // Week View: Get 7 days for currently viewed week without mutating currentDate
  const weekDays: any[] = []
  const curr = new Date(currentDate)
  const dayOfWeek = curr.getDay() // 0 is Sun, 1 is Mon
  const distToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(curr.getFullYear(), curr.getMonth(), curr.getDate() + distToMonday)

  for (let i = 0; i < 7; i++) {
    const currDay = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)
    const isToday = new Date().toDateString() === currDay.toDateString()
    const isOff = businessHours.offDays.includes(currDay.getDay())
    weekDays.push({
      name: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
      num: currDay.getDate(),
      dateObj: currDay,
      active: isToday,
      isOff
    })
  }

  // Month View: Get 42 cells (6 weeks) for currently viewed month
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const startingDayOfWeek = firstDayOfMonth.getDay() // 0 = Sun, 1 = Mon
  const startOffset = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1
  const monthDaysGrid = []
  for (let i = 0; i < 42; i++) {
    const cellDate = new Date(firstDayOfMonth.getFullYear(), firstDayOfMonth.getMonth(), 1 - startOffset + i)
    monthDaysGrid.push({
      dateObj: cellDate,
      dateNum: cellDate.getDate(),
      isCurrentMonth: cellDate.getMonth() === currentDate.getMonth(),
      isToday: new Date().toDateString() === cellDate.toDateString(),
      dayIndex: i % 7
    })
  }

  // Day View: Get info for currently viewed single day
  const activeDayIndex = currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1
  const activeDayName = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][activeDayIndex]
  const activeDayNum = currentDate.getDate()

  // Hours from Business Hours Settings
  const startDayHour = businessHours.startHour;
  const hoursCount = Math.max(1, businessHours.endHour - businessHours.startHour);
  const hours = Array.from({ length: hoursCount }, (_, i) => i + startDayHour);
  const slotHeight = 80;

  const todayStr = new Date().toISOString().split('T')[0]
  const isRescheduleToday = rescheduleData.date === todayStr
  const currentRescheduleTime = isRescheduleToday ? `${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}` : undefined

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
          </div>
        </div>

        {/* Quick Appointments Bar Inside Calendar Component */}
        <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', background: 'var(--paper)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
            Booked ({appointments.length}):
          </span>
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', flex: 1, paddingBottom: '0.25rem' }}>
            {appointments.length === 0 ? (
              <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontStyle: 'italic' }}>No appointments booked yet.</span>
            ) : (
              appointments.map(apt => (
                <div 
                  key={apt.id} 
                  onClick={() => {
                    const parts = (apt.date || '').split('-').map(Number)
                    if (parts.length === 3 && !isNaN(parts[0])) {
                      setCurrentDate(new Date(parts[0], parts[1] - 1, parts[2]))
                    }
                    setSelectedApt(apt)
                    setIsRescheduling(false)
                  }}
                  style={{
                    background: apt.color || 'var(--gold-light)',
                    color: apt.textColor || '#0c0c0c',
                    padding: '0.4rem 0.75rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    border: '1px solid var(--border)'
                  }}
                >
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2a7a4a' }} />
                  <strong>{apt.name}</strong>
                  <span style={{ opacity: 0.8, fontSize: '0.75rem' }}>({apt.dateStr || apt.date})</span>
                </div>
              ))
            )}
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
                const cellApts = appointments.filter(a => isSameDate(a.date, cellYMD))

                return (
                  <div key={i} className={`calendar-month-cell ${!cell.isCurrentMonth ? 'empty' : ''}`} style={{ background: businessHours.offDays.includes(cell.dateObj.getDay()) && cell.isCurrentMonth ? 'var(--paper)' : '' }}>
                    {cell.isCurrentMonth && (
                      <>
                        <div className={`calendar-month-date ${cell.isToday ? 'active' : ''}`} style={{ opacity: businessHours.offDays.includes(cell.dateObj.getDay()) ? 0.4 : 1 }}>
                          {cell.dateNum}
                        </div>
                        {/* Plot events mapping to this exact date */}
                        {cellApts.map(apt => (
                          <div 
                            key={apt.id} 
                            className="calendar-month-event"
                            style={{ backgroundColor: apt.color, color: apt.textColor || 'var(--ink)' }}
                            onClick={() => {
                              setSelectedApt(apt)
                              setIsRescheduling(false)
                            }}
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
                  <div className={`calendar-day-card ${d.active ? 'active' : ''}`} style={{ opacity: d.isOff ? 0.5 : 1 }}>
                    <span className="calendar-day-name">{d.name} {d.isOff && '(Off)'}</span>
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
              {weekDays.map((d, dayIndex) => {
                const cellYMD = toYMD(weekDays[dayIndex].dateObj)
                const cellApts = appointments.filter(a => isSameDate(a.date, cellYMD))

                return (
                  <div key={dayIndex} className="calendar-day-col" style={{ background: d.isOff ? 'rgba(0,0,0,0.02)' : '' }}>
                    {hours.map((_, i) => (
                      <div key={i} className="calendar-grid-line"></div>
                    ))}

                    {/* Render Appointments for this precise date */}
                    {cellApts.map(apt => {
                      const top = Math.max(0, (apt.startHour - startDayHour) * slotHeight);
                      const height = apt.durationHours * slotHeight;

                      return (
                        <div 
                          key={apt.id} 
                          className="calendar-event"
                          style={{ 
                            top: `${top}px`, 
                            height: `${height}px`,
                            backgroundColor: apt.color,
                            color: apt.textColor || 'var(--ink)',
                          }}
                          onClick={() => {
                            setSelectedApt(apt)
                            setIsRescheduling(false)
                          }}
                        >
                          <h4 className="calendar-event-title">{apt.name}</h4>
                          <span className="calendar-event-time">{apt.timeStr}</span>
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
                )
              })}
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

              {/* Day Column */}
              <div className="calendar-day-col-wide">
                {hours.map((_, i) => (
                  <div key={i} className="calendar-grid-line"></div>
                ))}

                {appointments.filter(a => isSameDate(a.date, toYMD(currentDate))).map(apt => {
                  const top = Math.max(0, (apt.startHour - startDayHour) * slotHeight);
                  const height = apt.durationHours * slotHeight;

                  return (
                    <div 
                      key={apt.id} 
                      className="calendar-day-event-wide"
                      style={{ 
                        top: `${top}px`, 
                        height: `${height}px`,
                        backgroundColor: apt.color,
                        color: apt.textColor || 'var(--ink)',
                      }}
                      onClick={() => {
                        setSelectedApt(apt)
                        setIsRescheduling(false)
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <h4 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'inherit' }}>{apt.name}</h4>
                        <span style={{ fontFamily: 'DM Mono', fontSize: '0.85rem', color: 'inherit', opacity: 0.7, background: 'rgba(255,255,255,0.4)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{apt.timeStr}</span>
                      </div>
                      
                      <p style={{ fontSize: '0.85rem', color: 'inherit', opacity: 0.8, maxWidth: '600px', lineHeight: 1.5 }}>
                        {apt.notes}
                      </p>

                      <div style={{ marginTop: 'auto', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'inherit', opacity: 0.7 }}>
                          <Video size={14} /> {apt.type}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Floating Modal Popup */}
        {selectedApt && (
          <>
            <div className="slide-overlay open" style={{ background: 'rgba(0,0,0,0.1)', backdropFilter: 'none' }} onClick={() => setSelectedApt(null)} />
            <div 
              style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'var(--cream)',
                border: '1px solid var(--border)',
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

              {isRescheduling ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Select new date and time for this appointment.</p>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--ink)', marginBottom: '0.4rem', display: 'block' }}>Date</label>
                    <input type="date" value={rescheduleData.date} min={todayStr} onChange={e => setRescheduleData({...rescheduleData, date: e.target.value})} className="dash-input" style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--ink)', marginBottom: '0.4rem', display: 'block' }}>Time</label>
                    <input type="time" value={rescheduleData.time} min={currentRescheduleTime} onChange={e => setRescheduleData({...rescheduleData, time: e.target.value})} className="dash-input" style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--ink)', marginBottom: '0.4rem', display: 'block' }}>Duration</label>
                    <select value={rescheduleData.durationMinutes} onChange={e => setRescheduleData({...rescheduleData, durationMinutes: e.target.value})} className="dash-input" style={{ width: '100%' }}>
                      <option value="15">15 Minutes</option>
                      <option value="30">30 Minutes</option>
                      <option value="45">45 Minutes</option>
                      <option value="60">1 Hour</option>
                      <option value="90">1.5 Hours</option>
                      <option value="120">2 Hours</option>
                    </select>
                  </div>
                </div>
              ) : (
                <>
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

                  {selectedApt.phone && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>
                        <Phone size={14} /> Phone
                      </p>
                      <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>{selectedApt.phone}</p>
                    </div>
                  )}

                  {selectedApt.email && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>
                        <Mail size={14} /> Email
                      </p>
                      <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>{selectedApt.email}</p>
                    </div>
                  )}

                  <div style={{ marginBottom: '1.5rem' }}>
                    <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>
                      Notes / Description
                    </p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--ink)', background: 'var(--paper)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      {selectedApt.notes}
                    </p>
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                {isRescheduling ? (
                  <>
                    <button className="btn-secondary" onClick={() => setIsRescheduling(false)} style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', fontSize: '0.8rem' }} disabled={loadingAction}>Cancel</button>
                    <button className="btn-primary" onClick={handleReschedule} style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', fontSize: '0.8rem' }} disabled={loadingAction}>{loadingAction ? '...' : 'Confirm Reschedule'}</button>
                  </>
                ) : (
                  <>
                    <button className="btn-secondary" onClick={() => setSelectedApt(null)} style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', fontSize: '0.8rem' }}>Close</button>
                    {(selectedApt.status === 'pending' || selectedApt.status === 'confirmed' || selectedApt.status === 'rescheduled') && (
                      <>
                        <button className="btn-secondary" onClick={() => {
                          const [hourStr, minStr] = selectedApt.timeStr.split(' - ')[0].split(':')
                          const isPm = minStr.includes('PM')
                          let h = parseInt(hourStr)
                          if (isPm && h !== 12) h += 12
                          if (!isPm && h === 12) h = 0
                          const formattedTime = `${h.toString().padStart(2, '0')}:${minStr.replace(/[^0-9]/g, '')}`
                          setRescheduleData({
                            date: selectedApt.date,
                            time: formattedTime,
                            durationMinutes: (selectedApt.durationHours * 60).toString()
                          })
                          setIsRescheduling(true)
                        }} style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', fontSize: '0.8rem', background: 'var(--paper)' }}>Reschedule</button>
                        
                        <button className="btn-secondary" onClick={() => handleAction('cancelled')} style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', fontSize: '0.8rem', color: '#dc2626', borderColor: '#fca5a5' }} disabled={loadingAction}>{loadingAction ? '...' : 'Cancel'}</button>
                        <button className="btn-primary" onClick={() => handleAction('completed')} style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', fontSize: '0.8rem', background: '#2a7a4a' }} disabled={loadingAction}>{loadingAction ? '...' : 'Complete'}</button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
