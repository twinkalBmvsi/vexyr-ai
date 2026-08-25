'use client'

import { useState } from 'react'
import { Send, AlertCircle, CheckCircle2, Info, Users, Loader2 } from 'lucide-react'
import DOMPurify from 'isomorphic-dompurify'

export default function BroadcastsClient({ tenantId, customers = [] }: { tenantId: string, customers?: any[] }) {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [statuses, setStatuses] = useState<Record<string, 'idle' | 'sending' | 'sent' | 'error'>>({})
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim() || !body.trim()) {
      setError('Subject and message body are required.')
      return
    }
    
    // Open the custom modal instead of the browser native alert
    setShowConfirmModal(true)
  }

  const executeSend = async () => {
    setShowConfirmModal(false)
    setIsLoading(true)
    setError(null)
    setSuccess(null)
    setStatuses({}) // Reset previous statuses

    try {
      const res = await fetch('/api/marketing/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, subject, body }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to start broadcast')
      }

      if (!res.body) {
        throw new Error('ReadableStream not supported in this browser.')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let done = false
      let finalCount = 0

      while (!done) {
        const { value, done: doneReading } = await reader.read()
        done = doneReading
        if (value) {
          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                
                if (data.type === 'progress') {
                  setStatuses(prev => ({
                    ...prev,
                    [data.email]: data.status
                  }))
                } else if (data.type === 'complete') {
                  finalCount = data.sentCount
                }
              } catch (e) {
                // Ignore parse errors on partial chunks
              }
            }
          }
        }
      }

      setSuccess(`Broadcast complete! Delivered to ${finalCount} customers.`)
      setSubject('')
      setBody('')
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem', alignItems: 'start' }}>
      
      {/* Left Column: Composer */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: 'rgba(220, 38, 38, 0.1)', color: '#dc2626', borderRadius: '8px', fontSize: '0.9rem' }}>
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {success && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: 'rgba(34, 197, 94, 0.1)', color: '#16a34a', borderRadius: '8px', fontSize: '0.9rem' }}>
          <CheckCircle2 size={18} />
          {success}
        </div>
      )}

      <div style={{ padding: '1rem', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--muted)', fontSize: '0.85rem' }}>
          <Info size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <p>
            You can use HTML to design your promotional emails. 
            The system will automatically append an unsubscribe link to the bottom of your email for compliance.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          
          {/* Editor Form */}
          <form onSubmit={handleInitialSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 500 }}>Email Subject</label>
              <input 
                type="text" 
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., Get 20% off your next visit!"
                className="form-input"
                required
                disabled={isLoading}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flexGrow: 1 }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 500 }}>Email HTML Source</label>
              <textarea 
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="<html><body>...</body></html>"
                required
                disabled={isLoading}
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

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 2rem', opacity: isLoading ? 0.7 : 1, cursor: isLoading ? 'not-allowed' : 'pointer' }}
              >
                <Send size={18} />
                {isLoading ? 'Sending Broadcast...' : 'Send Broadcast to All Customers'}
              </button>
            </div>
          </form>

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
                    srcDoc={DOMPurify.sanitize(body, { WHOLE_DOCUMENT: true, ADD_TAGS: ['style', 'meta', 'title'] })}
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

      {/* Right Column: Audience List */}
      <div className="dash-card" style={{ padding: '1.5rem', position: 'sticky', top: '2rem', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 150px)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ padding: '0.5rem', background: 'rgba(201,168,76,0.1)', borderRadius: '8px' }}>
            <Users size={20} color="var(--gold)" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, fontFamily: 'DM Sans', margin: 0 }}>Audience</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: 0 }}>{customers.length} recipients</p>
          </div>
        </div>

        <div style={{ flexGrow: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
          {customers.length === 0 ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem' }}>
              No customers found with email addresses.
            </div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {customers.map((c) => {
                const status = statuses[c.email] || 'idle'
                
                return (
                  <li key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--bg)', borderRadius: '6px', border: '1px solid var(--border)', opacity: status === 'idle' && isLoading ? 0.5 : 1, transition: 'all 0.2s' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--ink)' }}>{c.name || 'Unknown'}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)', wordBreak: 'break-all' }}>{c.email}</span>
                    </div>
                    
                    <div style={{ paddingLeft: '1rem', flexShrink: 0 }}>
                      {status === 'sending' && <Loader2 size={16} color="var(--gold)" className="spin" />}
                      {status === 'sent' && <CheckCircle2 size={18} color="#16a34a" />}
                      {status === 'error' && <AlertCircle size={18} color="#dc2626" />}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
      
      {/* Custom Confirmation Modal */}
      {showConfirmModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: '12px', padding: '2rem', maxWidth: '450px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ padding: '0.75rem', background: 'rgba(220, 38, 38, 0.1)', color: '#dc2626', borderRadius: '50%' }}>
                <Send size={24} />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>Send Broadcast?</h2>
            </div>
            
            <p style={{ color: 'var(--muted)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '2rem' }}>
              Are you sure you want to send this promotional email to <strong>{customers.length}</strong> active customers? 
              This action cannot be undone and will immediately begin dispatching emails from your server.
            </p>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="btn-secondary"
                style={{ padding: '0.5rem 1.5rem', background: 'transparent', border: '1px solid var(--border)', color: 'var(--ink)', borderRadius: '6px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={executeSend}
                className="btn-primary"
                style={{ padding: '0.5rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                Yes, Send Broadcast
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
