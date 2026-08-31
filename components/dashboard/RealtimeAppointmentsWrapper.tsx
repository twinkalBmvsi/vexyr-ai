'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import CalendarView from './CalendarView'
import { toast } from 'react-hot-toast'
import type { BusinessHoursConfig } from '@/app/actions/settings'

type GridAppointment = {
  id: string | number
  name: string
  date: string // YYYY-MM-DD
  startHour: number
  durationHours: number
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
  customerName: string
}

export default function RealtimeAppointmentsWrapper({
  initialAppointments,
  tenantId,
  businessHours
}: {
  initialAppointments: GridAppointment[]
  tenantId: string
  businessHours: BusinessHoursConfig
}) {
  const [appointments, setAppointments] = useState<GridAppointment[]>(initialAppointments)
  const supabase = createClient()

  // Helper matching the server-side toYMD logic
  const toYMD = useCallback((d: Date) => {
    const timeZone = (businessHours as any).timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone
    const f = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
    return f.format(d)
  }, [businessHours])

  const formatDbAppointment = useCallback(async (apt: any): Promise<GridAppointment> => {
    // Fetch customer details if available
    let customerName = 'Customer'
    let customerPhone = ''
    let customerEmail = ''

    if (apt.customer_id) {
      const { data: customerData } = await supabase
        .from('customers')
        .select('name, phone, email')
        .eq('id', apt.customer_id)
        .single()
      
      if (customerData) {
        customerName = customerData.name || 'Customer'
        customerPhone = customerData.phone || ''
        customerEmail = customerData.email || ''
      }
    }

    const start = new Date(apt.start_time)
    const end = new Date(apt.end_time)
    const durationHours = Math.max(0.5, (end.getTime() - start.getTime()) / (1000 * 60 * 60))
    const timeZone = (businessHours as any).timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone
    
    const startFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false
    })
    
    const startParts = startFormatter.format(start).split(':')
    const startHourInt = parseInt(startParts[0], 10)
    const startMinInt = parseInt(startParts[1], 10)
    const startHour = startHourInt + (startMinInt / 60)

    const dateStr = start.toLocaleDateString('en-US', { timeZone, weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    const timeStr = `${start.toLocaleTimeString('en-US', { timeZone, hour: 'numeric', minute: '2-digit' })} - ${end.toLocaleTimeString('en-US', { timeZone, hour: 'numeric', minute: '2-digit' })}`

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
  }, [supabase, businessHours, toYMD])

  useEffect(() => {
    // Ensure we start with the latest initialAppointments in case props change
    setAppointments(initialAppointments)

    const channel = supabase
      .channel(`appointments:${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events: INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'appointments',
          filter: `tenant_id=eq.${tenantId}`
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newApt = payload.new
            const formatted = await formatDbAppointment(newApt)
            setAppointments((prev) => [...prev, formatted])
            toast.success(`New appointment booked: ${formatted.name}`)
          } else if (payload.eventType === 'UPDATE') {
            const updatedApt = payload.new
            const formatted = await formatDbAppointment(updatedApt)
            setAppointments((prev) => prev.map((a) => (a.id === formatted.id ? formatted : a)))
            
            if (updatedApt.status === 'cancelled') {
              toast.error(`Appointment cancelled: ${formatted.name}`)
            } else {
              toast.success(`Appointment updated: ${formatted.name}`)
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id
            setAppointments((prev) => prev.filter((a) => a.id !== deletedId))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tenantId, supabase, initialAppointments, formatDbAppointment])

  const activeAppointments = appointments.filter((apt) => apt.status !== 'cancelled' && apt.status !== 'completed')

  return (
    <CalendarView
      appointments={activeAppointments}
      tenantId={tenantId}
      businessHours={businessHours}
    />
  )
}
