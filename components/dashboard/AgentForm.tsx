'use client'

import { useState, useEffect } from 'react'
import { Save, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { saveAgentConfig } from '@/app/actions/agents'

interface AgentFormProps {
  agentId: string
  tenantSlug: string
  initialData?: {
    name?: string
    identity?: string
    initialPrompt?: string
  } | null
  initialWhatsapp?: boolean
  initialTelegram?: boolean
}

export default function AgentForm({
  agentId,
  tenantSlug,
  initialData,
  initialWhatsapp = true,
  initialTelegram = false
}: AgentFormProps) {
  const router = useRouter()
  const isNew = agentId === 'new'
  const [isSaving, setIsSaving] = useState(false)
  
  const [formData, setFormData] = useState({
    name: initialData?.name || (isNew ? '' : 'Sales Assistant'),
    identity: initialData?.identity || (isNew ? '' : 'Friendly, professional, helpful.'),
    initialPrompt: initialData?.initialPrompt || (isNew ? '' : 'You are a sales assistant for Glamour Studio. Answer questions politely.'),
    whatsapp: initialWhatsapp,
    telegram: initialTelegram
  })

  // Sync state when initial props update (e.g. after page refresh or revalidation)
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      name: initialData?.name || prev.name,
      identity: initialData?.identity || prev.identity,
      initialPrompt: initialData?.initialPrompt || prev.initialPrompt,
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

  return (
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
              <label className="dash-label">Tone & Tuning</label>
              <input 
                type="text" 
                className="dash-input" 
                value={formData.identity}
                onChange={e => setFormData({ ...formData, identity: e.target.value })}
                placeholder="e.g. Friendly, professional, uses emojis"
                required
              />
            </div>

            <div className="dash-form-group">
              <label className="dash-label">Initial System Prompt</label>
              <textarea 
                className="dash-textarea" 
                value={formData.initialPrompt}
                onChange={e => setFormData({ ...formData, initialPrompt: e.target.value })}
                placeholder="Give your agent detailed instructions on how to handle customers..."
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

      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
        <button 
          type="submit" 
          disabled={isSaving}
          className="btn-primary" 
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: isSaving ? 0.7 : 1 }}
        >
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {isSaving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </form>
  )
}
