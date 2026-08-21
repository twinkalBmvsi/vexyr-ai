'use client'

import { useState } from 'react'
import { CalendarSync, Settings, MessageSquare, Save } from 'lucide-react'
import { toast } from 'react-hot-toast'
import type { FollowUpConfig } from '@/app/actions/followup'

export default function FollowUpSettingsClient({ tenantId, initialConfig }: { tenantId: string, initialConfig: FollowUpConfig }) {
  const [config, setConfig] = useState<FollowUpConfig>(initialConfig)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // @ts-ignore
      const { saveFollowUpConfig } = await import('@/app/actions/followup')
      const res = await saveFollowUpConfig(tenantId, config)
      
      if (res.success) {
        toast.success('Follow-up settings saved successfully')
      } else {
        toast.error(res.error || 'Failed to save settings')
      }
    } catch (e) {
      console.error(e)
      toast.error('An error occurred while saving')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <div style={{ 
        background: 'var(--paper)', 
        border: '1px solid var(--border)', 
        borderRadius: '12px', 
        padding: '2rem',
        marginBottom: '2rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ padding: '0.8rem', background: 'rgba(212, 175, 55, 0.1)', borderRadius: '8px', color: 'var(--gold)' }}>
            <CalendarSync size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--ink)' }}>Follow-up Engine</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Automatically engage customers after their visit.</p>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '48px', height: '24px' }}>
              <input 
                type="checkbox" 
                checked={config.enabled} 
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                style={{ opacity: 0, width: 0, height: 0 }} 
              />
              <span className="slider round" style={{ 
                position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, 
                backgroundColor: config.enabled ? '#2a7a4a' : '#ccc', transition: '.4s', borderRadius: '24px' 
              }}>
                <span style={{
                  position: 'absolute',
                  content: '""',
                  height: '18px',
                  width: '18px',
                  left: config.enabled ? '26px' : '3px',
                  bottom: '3px',
                  backgroundColor: 'white',
                  transition: '.4s',
                  borderRadius: '50%'
                }} />
              </span>
            </label>
          </div>
        </div>
        
        <div style={{ padding: '1rem', background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: '8px', marginBottom: '1.5rem', opacity: config.enabled ? 1 : 0.5, pointerEvents: config.enabled ? 'auto' : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Settings size={16} color="var(--muted)" />
              <span style={{ fontSize: '0.9rem', color: 'var(--ink)', fontWeight: 500 }}>Target appointments completed more than</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <select 
                className="dash-input" 
                value={config.delayHours}
                onChange={(e) => setConfig({ ...config, delayHours: parseInt(e.target.value, 10) })}
                style={{ padding: '0.4rem 0.75rem', width: '80px', fontWeight: 600 }}
              >
                {Array.from({ length: 24 }, (_, i) => i + 1).map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
              <span style={{ fontSize: '0.9rem', color: 'var(--ink)', fontWeight: 500 }}>hours ago.</span>
            </div>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.75rem', marginLeft: '1.5rem' }}>
            The engine runs every hour in the background. It will process any appointment that has passed this threshold.
          </p>
        </div>

        <div style={{ marginBottom: '1.5rem', opacity: config.enabled ? 1 : 0.5, pointerEvents: config.enabled ? 'auto' : 'none' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '0.5rem' }}>
            Follow-up Agent Name
          </label>
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '1rem' }}>
            The AI will use this name and persona when communicating with the customer. It won't appear in your regular Agents list.
          </p>
          <input 
            type="text"
            className="dash-input" 
            value={config.agentName}
            onChange={(e) => setConfig({ ...config, agentName: e.target.value })}
            style={{ width: '100%', maxWidth: '400px' }}
            placeholder="e.g. Customer Success Team"
          />
        </div>

        <div style={{ marginBottom: '1.5rem', opacity: config.enabled ? 1 : 0.5, pointerEvents: config.enabled ? 'auto' : 'none' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '0.5rem' }}>
            AI Instructions
          </label>
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '1rem' }}>
            Tell your AI agent exactly how to talk when following up. You can ask it to request a Google Review or offer a special discount for their next booking.
          </p>
          <textarea 
            className="dash-input" 
            rows={5} 
            value={config.instructions}
            onChange={(e) => setConfig({ ...config, instructions: e.target.value })}
            style={{ width: '100%', resize: 'vertical' }}
            placeholder="e.g. Ask them if they were satisfied with the service..."
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            className="btn-primary" 
            onClick={handleSave} 
            disabled={isSaving}
            style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {isSaving ? 'Saving...' : <><Save size={16} /> Save Settings</>}
          </button>
        </div>
      </div>
      
      <div style={{ 
        background: 'rgba(212, 175, 55, 0.05)', 
        border: '1px solid rgba(212, 175, 55, 0.2)', 
        borderRadius: '12px', 
        padding: '1.5rem'
      }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--gold)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MessageSquare size={16} /> How it works
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.6 }}>
          When an appointment is marked as "Completed", a background timer begins based on your chosen hours above. Once the timer expires, the AI reads your instructions and generates a personalized, context-aware message for that specific customer. The message is then sent automatically via their original contact method (WhatsApp, Telegram, or Email). You can monitor all sent follow-ups in the <strong>Live Chats</strong> tab.
        </p>
      </div>
    </>
  )
}
