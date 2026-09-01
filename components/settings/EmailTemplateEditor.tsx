'use client'

import { useState, useEffect } from 'react'
import { Save, Loader2, Info } from 'lucide-react'
import { saveEmailTemplate } from '@/app/actions/emails'
import DOMPurify from 'isomorphic-dompurify'

interface Template {
  id: string
  template_type: string
  subject: string
  body: string
}

const TEMPLATE_TYPES = [
  { value: 'appointment_confirmation', label: 'Appointment Confirmation' },
  { value: 'appointment_cancellation', label: 'Appointment Cancellation' },
  { value: 'appointment_reschedule', label: 'Appointment Reschedule' },
  { value: 'appointment_complete', label: 'Appointment Complete' },
  { value: 'auto_followup', label: 'Auto Follow-up' },
  { value: 'team_invite', label: 'Team Member Invitation' },
]

export default function EmailTemplateEditor({
  tenantId,
  initialTemplates,
  hasAutoFollowups = false
}: {
  tenantId: string
  initialTemplates: Template[]
  hasAutoFollowups?: boolean
}) {
  const [selectedType, setSelectedType] = useState('appointment_confirmation')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  // Load the selected template's data when the type changes
  useEffect(() => {
    const template = initialTemplates.find(t => t.template_type === selectedType)
    if (template) {
      setSubject(template.subject)
      setBody(template.body)
    } else {
      // Defaults if not created yet
      setSubject('')
      setBody('')
    }
    setMessage({ type: '', text: '' })
  }, [selectedType, initialTemplates])

  const handleSave = async () => {
    setIsSaving(true)
    setMessage({ type: '', text: '' })
    try {
      await saveEmailTemplate(tenantId, selectedType, subject, body)
      setMessage({ type: 'success', text: 'Template saved successfully!' })
      // We don't need to manually update initialTemplates here because server action revalidates the page
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save template.' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Template Selector */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ fontSize: '0.9rem', fontWeight: 500 }}>Select Email to Edit</label>
        <select 
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="form-input"
          style={{ maxWidth: '400px' }}
        >
          {TEMPLATE_TYPES.map(t => (
            <option 
              key={t.value} 
              value={t.value}
              disabled={t.value === 'auto_followup' && !hasAutoFollowups}
            >
              {t.label} {t.value === 'auto_followup' && !hasAutoFollowups ? '(Locked - Requires Subscription)' : ''}
            </option>
          ))}
        </select>
      </div>

      <div style={{ padding: '1rem', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--muted)', fontSize: '0.85rem' }}>
          <Info size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <p>
            You can use dynamic variables in your subject and body to personalize the emails. 
            Available variables for this template: 
            <br/><br/>
            {['appointment_confirmation', 'appointment_cancellation', 'appointment_reschedule', 'auto_followup', 'appointment_complete'].includes(selectedType) && (
              <>
                <code style={{ background: 'var(--bg)', padding: '2px 4px', borderRadius: '4px' }}>{"{{customer_name}}"}</code>
                <code style={{ background: 'var(--bg)', padding: '2px 4px', borderRadius: '4px', marginLeft: '0.5rem' }}>{"{{business_name}}"}</code>
                <code style={{ background: 'var(--bg)', padding: '2px 4px', borderRadius: '4px', marginLeft: '0.5rem' }}>{"{{appointment_title}}"}</code>
              </>
            )}
            {['appointment_confirmation', 'appointment_cancellation', 'appointment_reschedule', 'appointment_complete'].includes(selectedType) && (
              <>
                <code style={{ background: 'var(--bg)', padding: '2px 4px', borderRadius: '4px', marginLeft: '0.5rem' }}>{"{{appointment_date}}"}</code>
                <code style={{ background: 'var(--bg)', padding: '2px 4px', borderRadius: '4px', marginLeft: '0.5rem' }}>{"{{appointment_time}}"}</code>
              </>
            )}
            {selectedType === 'team_invite' && (
              <>
                <code style={{ background: 'var(--bg)', padding: '2px 4px', borderRadius: '4px' }}>{"{{business_name}}"}</code>
                <code style={{ background: 'var(--bg)', padding: '2px 4px', borderRadius: '4px', marginLeft: '0.5rem' }}>{"{{team_member_name}}"}</code>
                <code style={{ background: 'var(--bg)', padding: '2px 4px', borderRadius: '4px', marginLeft: '0.5rem' }}>{"{{invite_link}}"}</code>
              </>
            )}
          </p>
        </div>

        {/* Stacked Layout for Editor and Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          
          {/* Editor Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 500 }}>Email Subject</label>
              <input 
                type="text" 
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., Your appointment with {{business_name}} is confirmed!"
                className="form-input"
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flexGrow: 1 }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 500 }}>Email HTML Source</label>
              <textarea 
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="<html><body>...</body></html>"
                style={{ 
                  flexGrow: 1, 
                  minHeight: '400px', 
                  padding: '1rem', 
                  fontFamily: 'monospace', 
                  fontSize: '13px', 
                  background: '#1a1b26', 
                  color: '#a9b1d6', 
                  border: '1px solid var(--border)', 
                  borderRadius: '4px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                {isSaving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                {isSaving ? 'Saving...' : 'Save Template'}
              </button>
              {message.text && (
                <span style={{ fontSize: '0.85rem', color: message.type === 'error' ? '#dc2626' : '#2a7a4a' }}>
                  {message.text}
                </span>
              )}
            </div>
          </div>

          {/* Live Preview Pane */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', height: '100%' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 500 }}>Live Preview</label>
            <div style={{ 
              background: '#f3f4f6', 
              borderRadius: '8px', 
              padding: '2rem', 
              border: '1px solid var(--border)', 
              flexGrow: 1,
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}>
              <div style={{ 
                background: '#ffffff', 
                borderRadius: '8px', 
                overflow: 'hidden', 
                minHeight: '100%',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
              }}>
                {body ? (
                  <iframe
                    title="Email Preview"
                    srcDoc={DOMPurify.sanitize(body, { WHOLE_DOCUMENT: true, ADD_TAGS: ['style', 'meta', 'title'] })
                      .replace(/\{\{customer_name\}\}/g, 'Jane Doe')
                      .replace(/\{\{business_name\}\}/g, 'Acme Corp')
                      .replace(/\{\{appointment_date\}\}/g, 'Wednesday, August 19, 2026')
                      .replace(/\{\{appointment_time\}\}/g, '04:00 PM')
                      .replace(/\{\{appointment_title\}\}/g, 'Hair Coloring - Jane Doe')
                      .replace(/\{\{invite_link\}\}/g, 'https://example.com/invite/12345')
                      .replace(/\{\{team_member_name\}\}/g, 'Alex Smith')}
                    style={{ width: '100%', height: '100%', minHeight: '600px', border: 'none' }}
                  />
                ) : (
                  <div style={{ padding: '2rem', color: '#9ca3af', fontStyle: 'italic' }}>
                    Start typing HTML to preview...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
