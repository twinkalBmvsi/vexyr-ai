'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { MessageCircle, Smartphone, CheckCircle2, AlertCircle, X, ExternalLink, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { saveChannelConfig } from '@/app/actions/channels'

export default function ChannelConnections({
  tenantSlug,
  initialHasWhatsapp,
  initialHasTelegram,
  initialWaNumber
}: {
  tenantSlug: string;
  initialHasWhatsapp: boolean;
  initialHasTelegram: boolean;
  initialWaNumber: string;
}) {
  const [activeModal, setActiveModal] = useState<'whatsapp' | 'telegram' | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const [waConfig, setWaConfig] = useState({
    token: '',
    phoneId: '',
    wabaId: ''
  })

  const [tgConfig, setTgConfig] = useState({
    token: ''
  })

  return (
    <>
      <div className="dash-grid" style={{ gap: '2rem' }}>
        {/* WhatsApp Connection */}
        <div className="dash-card">
          <div className="dash-card-header">
            <span className="dash-card-title">WhatsApp Business API</span>
            <MessageCircle size={24} color="#25D366" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {initialHasWhatsapp ? (
              <>
                <CheckCircle2 size={18} color="#2a7a4a" />
                <span style={{ fontSize: '0.85rem', color: 'var(--ink)' }}>Connected successfully</span>
              </>
            ) : (
              <>
                <AlertCircle size={18} color="var(--gold)" />
                <span style={{ fontSize: '0.85rem', color: 'var(--ink)' }}>Not connected</span>
              </>
            )}
          </div>

          {initialHasWhatsapp ? (
            <div style={{ background: 'rgba(12,12,12,0.03)', padding: '1rem', borderRadius: '8px', marginBottom: '2rem' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>Connected Number</p>
              <p style={{ fontFamily: 'DM Mono', fontSize: '0.9rem', color: 'var(--ink)' }}>{initialWaNumber || '+1 (555) 019-2834'}</p>
            </div>
          ) : (
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '2rem' }}>
              Connect a WhatsApp Business API account to allow your AI agents to interact with customers on WhatsApp.
            </p>
          )}

          <div style={{ marginTop: 'auto' }}>
            <button
              className={initialHasWhatsapp ? "btn-secondary" : "btn-primary"}
              style={{ width: '100%' }}
              onClick={() => {
                setActiveModal('whatsapp')
              }}
            >
              {initialHasWhatsapp ? 'Manage Connection' : 'Connect WhatsApp'}
            </button>
          </div>
        </div>

        {/* Telegram Connection */}
        <div className="dash-card">
          <div className="dash-card-header">
            <span className="dash-card-title">Telegram Bot API</span>
            <Smartphone size={24} color="#0088cc" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {initialHasTelegram ? (
              <>
                <CheckCircle2 size={18} color="#2a7a4a" />
                <span style={{ fontSize: '0.85rem', color: 'var(--ink)' }}>Connected successfully</span>
              </>
            ) : (
              <>
                <AlertCircle size={18} color="var(--gold)" />
                <span style={{ fontSize: '0.85rem', color: 'var(--ink)' }}>Not connected</span>
              </>
            )}
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '2rem' }}>
            Connect a Telegram Bot to allow your AI agents to interact with customers on Telegram.
          </p>

          <div style={{ marginTop: 'auto' }}>
            <button
              className={initialHasTelegram ? "btn-secondary" : "btn-primary"}
              style={{ width: '100%' }}
              onClick={() => setActiveModal('telegram')}
            >
              {initialHasTelegram ? 'Manage Connection' : 'Connect Telegram'}
            </button>
          </div>
        </div>
      </div>

      {/* MODAL OVERLAY */}
      {mounted && activeModal && createPortal(
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(12,12,12,0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            background: 'var(--paper)',
            width: '100%',
            maxWidth: '600px',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '90vh'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.5rem 2rem',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: '1.8rem', color: 'var(--ink)' }}>
                {activeModal === 'whatsapp' ? 'Configure WhatsApp' : 'Configure Telegram'}
              </h2>
              <button
                onClick={() => setActiveModal(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '2rem', overflowY: 'auto' }}>

              {activeModal === 'telegram' && (
                <>
                  <div style={{ marginBottom: '2.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '1rem' }}>Configuration Steps</h3>
                    <ol style={{ paddingLeft: '1.25rem', color: 'var(--muted)', fontSize: '0.9rem', lineHeight: 1.7 }}>
                      <li style={{ marginBottom: '0.5rem' }}>Open Telegram and search for <strong>@BotFather</strong>.</li>
                      <li style={{ marginBottom: '0.5rem' }}>Send the command <code>/newbot</code> and follow the instructions to create a new bot.</li>
                      <li style={{ marginBottom: '0.5rem' }}>Copy the HTTP API Token provided by BotFather.</li>
                      <li>Paste the token in the field below to connect your bot.</li>
                    </ol>
                  </div>

                  <div className="dash-form-group">
                    <label className="dash-label">Bot Token</label>
                    <input
                      type="password"
                      className="dash-input"
                      placeholder="123456789:ABCdefGHIjklmNOPqrsTUVwxyz"
                      value={tgConfig.token}
                      onChange={(e) => setTgConfig({ ...tgConfig, token: e.target.value })}
                    />
                  </div>
                </>
              )}

              {activeModal === 'whatsapp' && (
                <>
                  <div style={{ marginBottom: '2.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '1rem' }}>Configuration Steps</h3>
                    <ol style={{ paddingLeft: '1.25rem', color: 'var(--muted)', fontSize: '0.9rem', lineHeight: 1.7 }}>
                      <li style={{ marginBottom: '0.5rem' }}>Go to the <a href="https://developers.facebook.com/" target="_blank" rel="noreferrer" style={{ color: 'var(--gold)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>Meta for Developers <ExternalLink size={12} /></a> dashboard.</li>
                      <li style={{ marginBottom: '0.5rem' }}>Create a new App or select an existing one with WhatsApp set up.</li>
                      <li style={{ marginBottom: '0.5rem' }}>Navigate to <strong>WhatsApp &gt; API Setup</strong> to find your Phone Number ID and WABA ID.</li>
                      <li>Generate a Permanent Token in the System Users settings and paste it below.</li>
                    </ol>
                  </div>

                  <div className="dash-form-group" style={{ marginBottom: '1.5rem' }}>
                    <label className="dash-label">Access Token</label>
                    <input
                      type="password"
                      className="dash-input"
                      placeholder="EAAI... (Permanent Token)"
                      value={waConfig.token}
                      onChange={(e) => setWaConfig({ ...waConfig, token: e.target.value })}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div className="dash-form-group">
                      <label className="dash-label">Phone Number ID</label>
                      <input
                        type="text"
                        className="dash-input"
                        placeholder="e.g. 1029384756"
                        value={waConfig.phoneId}
                        onChange={(e) => setWaConfig({ ...waConfig, phoneId: e.target.value })}
                      />
                    </div>
                    <div className="dash-form-group">
                      <label className="dash-label">WABA ID</label>
                      <input
                        type="text"
                        className="dash-input"
                        placeholder="e.g. 1092837465"
                        value={waConfig.wabaId}
                        onChange={(e) => setWaConfig({ ...waConfig, wabaId: e.target.value })}
                      />
                    </div>
                  </div>
                </>
              )}

            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '1.5rem 2rem',
              borderTop: '1px solid var(--border)',
              background: 'rgba(12,12,12,0.02)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '1rem'
            }}>
              <button
                className="btn-secondary"
                onClick={() => setActiveModal(null)}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                disabled={isSaving}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: isSaving ? 0.7 : 1 }}
                onClick={async () => {
                  if (!activeModal) return;
                  
                  // Validation
                  if (activeModal === 'whatsapp') {
                    if (!waConfig.token.trim() || !waConfig.phoneId.trim() || !waConfig.wabaId.trim()) {
                      toast.error('Please fill in all WhatsApp fields')
                      return
                    }
                  } else if (activeModal === 'telegram') {
                    if (!tgConfig.token.trim()) {
                      toast.error('Please enter the Bot Token')
                      return
                    }
                  }

                  setIsSaving(true)
                  try {
                    const provider = activeModal
                    const config = provider === 'whatsapp' ? waConfig : tgConfig

                    const result = await saveChannelConfig(tenantSlug, provider, config)

                    if (result.success) {
                      toast.success(`${provider === 'whatsapp' ? 'WhatsApp' : 'Telegram'} configuration saved!`)
                      setActiveModal(null)
                    } else {
                      toast.error(result.error || 'Failed to save configuration')
                    }
                  } catch (e) {
                    toast.error('An unexpected error occurred')
                  } finally {
                    setIsSaving(false)
                  }
                }}
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
                {isSaving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
