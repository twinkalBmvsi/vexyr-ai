'use client'

import { useState, useEffect } from 'react'
import { Save, Loader2, Trash2, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { saveAgentConfig, deleteAgent } from '@/app/actions/agents'

interface AgentFormProps {
  agentId: string
  tenantSlug: string
  initialData?: {
    name?: string
    businessName?: string
    description?: string
    services?: string
  } | null
  initialWhatsapp?: boolean
  initialTelegram?: boolean
}

export default function AgentForm({
  agentId,
  tenantSlug,
  initialData,
  initialWhatsapp = false,
  initialTelegram = false
}: AgentFormProps) {
  const router = useRouter()
  const isNew = agentId === 'new'
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  
  const [formData, setFormData] = useState({
    name: initialData?.name || (isNew ? '' : 'Sales Assistant'),
    businessName: initialData?.businessName || '',
    description: initialData?.description || '',
    services: initialData?.services || '',
    whatsapp: initialWhatsapp,
    telegram: initialTelegram
  })

  // Sync state when initial props update (e.g. after page refresh or revalidation)
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      name: initialData?.name || prev.name,
      businessName: initialData?.businessName || prev.businessName,
      description: initialData?.description || prev.description,
      services: initialData?.services || prev.services,
      whatsapp: initialWhatsapp,
      telegram: initialTelegram
    }))
  }, [initialData, initialWhatsapp, initialTelegram])

  const handleToggleChannel = async (channel: 'whatsapp' | 'telegram') => {
    const updatedValue = !formData[channel]
    const updatedFormData = {
      ...formData,
      [channel]: updatedValue
    }
    
    // Optimistically update state
    setFormData(updatedFormData)

    // Save configuration immediately to backend
    try {
      const res = await saveAgentConfig(tenantSlug, agentId, updatedFormData)
      if (res.success) {
        const channelName = channel === 'whatsapp' ? 'WhatsApp' : 'Telegram'
        const statusStr = updatedValue ? 'activated' : 'deactivated'
        toast.success(`${channelName} channel ${statusStr}!`)
        router.refresh()
      } else {
        toast.error(res.error || 'Failed to update channel status')
        // Rollback state if failed
        setFormData(formData)
      }
    } catch (err) {
      console.error('Error toggling channel:', err)
      toast.error('Failed to update channel status')
      setFormData(formData)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const res = await saveAgentConfig(tenantSlug, agentId, formData)
      if (res.success) {
        toast.success('Agent configuration saved successfully!')
        if (isNew && res.agentId) {
          router.push(`/${tenantSlug}/agents/${res.agentId}`)
        } else {
          router.refresh()
        }
      } else {
        toast.error(res.error || 'Failed to save configuration')
      }
    } catch (err: any) {
      console.error('Error saving agent config:', err)
      toast.error('An unexpected error occurred while saving.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const res = await deleteAgent(tenantSlug, agentId)
      if (res.success) {
        toast.success('Agent deleted successfully.')
        router.push(`/${tenantSlug}/agents`)
      } else {
        toast.error(res.error || 'Failed to delete agent')
        setShowDeleteModal(false)
      }
    } catch (err: any) {
      console.error('Error deleting agent:', err)
      toast.error('An unexpected error occurred while deleting.')
      setShowDeleteModal(false)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>

      {/* ── Delete Confirmation Modal ── */}
      {showDeleteModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            background: 'var(--paper)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '440px',
            width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{
                background: 'rgba(220, 38, 38, 0.1)',
                padding: '0.6rem',
                borderRadius: '50%',
                display: 'flex'
              }}>
                <AlertTriangle size={22} color="#dc2626" />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
                Delete Agent
              </h3>
            </div>

            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '0.75rem' }}>
              Are you sure you want to delete <strong style={{ color: 'var(--ink)' }}>{formData.name}</strong>?
            </p>
            <p style={{ color: '#dc2626', fontSize: '0.82rem', lineHeight: 1.6, marginBottom: '1.75rem' }}>
              This action cannot be undone. All linked channels will be unlinked from this agent immediately.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                style={{
                  padding: '0.6rem 1.2rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--ink)',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontFamily: 'inherit'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                style={{
                  padding: '0.6rem 1.2rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#dc2626',
                  color: '#fff',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  fontSize: '0.9rem',
                  fontFamily: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  opacity: isDeleting ? 0.7 : 1
                }}
              >
                {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {isDeleting ? 'Deleting...' : 'Yes, Delete Agent'}
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="dash-grid" style={{ gap: '3rem' }}>
          
          {/* LEFT COLUMN: IDENTITY & PROMPT */}
          <div style={{ gridColumn: 'span 2' }}>
            <div className="dash-card">
              <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: '1.8rem', marginBottom: '1.5rem' }}>Agent Identity</h2>
              
              <div className="dash-form-group">
                <label className="dash-label">Agent Name</label>
                <input 
                  type="text" 
                  className="dash-input" 
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Sales Assistant"
                  required
                />
              </div>

              <div className="dash-form-group">
                <label className="dash-label">Business Name</label>
                <input 
                  type="text" 
                  className="dash-input" 
                  value={formData.businessName}
                  onChange={e => setFormData({ ...formData, businessName: e.target.value })}
                  placeholder="e.g. ABC Dental Clinic"
                  required
                />
              </div>

              <div className="dash-form-group">
                <label className="dash-label">Description</label>
                <input 
                  type="text" 
                  className="dash-input" 
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Short description of the organization"
                />
              </div>

              <div className="dash-form-group">
                <label className="dash-label">Services Provided</label>
                <textarea 
                  className="dash-textarea" 
                  value={formData.services}
                  onChange={e => setFormData({ ...formData, services: e.target.value })}
                  placeholder="e.g. Teeth cleaning, whitening, root canals..."
                  required
                />
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: CHANNELS */}
          <div>
            <div className="dash-card">
              <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: '1.8rem', marginBottom: '1.5rem' }}>Active Channels</h2>
              
              <div className="toggle-switch">
                <span className="toggle-label">WhatsApp</span>
                <div 
                  className={`toggle-btn ${formData.whatsapp ? 'active' : ''}`}
                  onClick={() => handleToggleChannel('whatsapp')}
                  style={{ cursor: 'pointer' }}
                />
              </div>

              <div className="toggle-switch">
                <span className="toggle-label">Telegram</span>
                <div 
                  className={`toggle-btn ${formData.telegram ? 'active' : ''}`}
                  onClick={() => handleToggleChannel('telegram')}
                  style={{ cursor: 'pointer' }}
                />
              </div>

              <div style={{ marginTop: '2rem' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '1rem' }}>
                  Toggle which messaging platforms this specific agent will respond to. Toggling auto-saves active channels directly to the backend. Make sure you have connected these channels in the Connections tab.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Delete button — only show for existing agents */}
          {!isNew && (
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              disabled={isSaving || isDeleting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.25rem',
                borderRadius: '6px',
                border: '1px solid rgba(220, 38, 38, 0.4)',
                background: 'rgba(220, 38, 38, 0.07)',
                color: '#dc2626',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontFamily: 'inherit',
                fontWeight: 500,
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(220, 38, 38, 0.15)'
                ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#dc2626'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(220, 38, 38, 0.07)'
                ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(220, 38, 38, 0.4)'
              }}
            >
              <Trash2 size={15} />
              Delete Agent
            </button>
          )}

          <button 
            type="submit" 
            disabled={isSaving}
            className="btn-primary" 
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: isSaving ? 0.7 : 1, marginLeft: isNew ? 'auto' : '0' }}
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </>
  )
}
