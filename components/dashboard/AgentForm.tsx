'use client'

import { useState } from 'react'
import { Save } from 'lucide-react'

export default function AgentForm({ agentId, tenantSlug }: { agentId: string, tenantSlug: string }) {
  const isNew = agentId === 'new'
  const [showTooltip, setShowTooltip] = useState(false)
  
  const [formData, setFormData] = useState({
    name: isNew ? '' : 'Sales Assistant',
    identity: isNew ? '' : 'Friendly, professional, helpful.',
    initialPrompt: isNew ? '' : 'You are a sales assistant for Glamour Studio. Answer questions politely.',
    whatsapp: isNew ? false : true,
    telegram: isNew ? false : false
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Here we would submit to a Server Action
    setShowTooltip(true)
    setTimeout(() => setShowTooltip(false), 3000)
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
                onClick={() => setFormData({ ...formData, whatsapp: !formData.whatsapp })}
              />
            </div>

            <div className="toggle-switch">
              <span className="toggle-label">Telegram</span>
              <div 
                className={`toggle-btn ${formData.telegram ? 'active' : ''}`}
                onClick={() => setFormData({ ...formData, telegram: !formData.telegram })}
              />
            </div>

            <div style={{ marginTop: '2rem' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '1rem' }}>
                Toggle which messaging platforms this specific agent will respond to. Make sure you have connected these channels in the Connections tab.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
        <button type="submit" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative' }}>
          <Save size={16} /> Save Configuration
          {showTooltip && (
            <div style={{
              position: 'absolute',
              bottom: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginBottom: '0.5rem',
              padding: '0.5rem 1rem',
              background: 'var(--ink)',
              color: 'var(--paper)',
              fontSize: '0.8rem',
              borderRadius: '6px',
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              zIndex: 10
            }}>
              Saved successfully!
              <div style={{
                position: 'absolute',
                top: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                borderWidth: '5px',
                borderStyle: 'solid',
                borderColor: 'var(--ink) transparent transparent transparent'
              }} />
            </div>
          )}
        </button>
      </div>
    </form>
  )
}
