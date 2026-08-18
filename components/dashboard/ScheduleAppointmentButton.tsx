'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import ScheduleAppointmentModal from './ScheduleAppointmentModal'

export default function ScheduleAppointmentButton({ tenantId }: { tenantId: string }) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <button 
        className="btn-primary" 
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem', borderRadius: '8px', fontSize: '0.9rem' }}
        onClick={() => setIsModalOpen(true)}
      >
        <Plus size={16} />
        Schedule Appointment
      </button>

      {isModalOpen && (
        <ScheduleAppointmentModal 
          tenantId={tenantId} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}
    </>
  )
}
