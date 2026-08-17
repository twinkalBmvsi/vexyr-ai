'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { MessageCircle, Smartphone, CheckCircle2, AlertCircle, X, ExternalLink, Loader2, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { saveChannelConfig } from '@/app/actions/channels'
import { registerTelegramWebhook } from '@/app/actions/telegram'

export default function ChannelConnections({
  tenantSlug,
  initialHasWhatsapp,
  initialHasTelegram,
  initialWaNumber,
  initialTgConfig = { token: '' },
  initialWaConfig = { token: '', phoneId: '', wabaId: '' }
}: {
  tenantSlug: string;
  initialHasWhatsapp: boolean;
  initialHasTelegram: boolean;
  initialWaNumber: string;
  initialTgConfig?: { token: string };
  initialWaConfig?: { token: string; phoneId: string; wabaId: string };
}) {
  const [activeModal, setActiveModal] = useState<'whatsapp' | 'telegram' | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [hasWhatsapp, setHasWhatsapp] = useState(initialHasWhatsapp)
  const [hasTelegram, setHasTelegram] = useState(initialHasTelegram)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [isRegisteringWebhook, setIsRegisteringWebhook] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const [waConfig, setWaConfig] = useState(initialWaConfig)
  const [tgConfig, setTgConfig] = useState(initialTgConfig)

  useEffect(() => {
    setWaConfig(initialWaConfig)
  }, [initialWaConfig])

  useEffect(() => {
    setTgConfig(initialTgConfig)
  }, [initialTgConfig])

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
            {hasWhatsapp ? (
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

          {hasWhatsapp ? (
            <div style={{ background: 'rgba(12,12,12,0.03)', padding: '1rem', borderRadius: '8px', marginBottom: '2rem' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>Connected Number / Status</p>
              <p style={{ fontFamily: 'DM Mono', fontSize: '0.9rem', color: 'var(--ink)' }}>{initialWaNumber || 'WhatsApp API Configured'}</p>
            </div>
          ) : (
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '2rem' }}>
              Connect a WhatsApp Business API account to allow your AI agents to interact with customers on WhatsApp.
            </p>
          )}

          <div style={{ marginTop: 'auto' }}>
            <button
              className={hasWhatsapp ? "btn-secondary" : "btn-primary"}
              style={{ width: '100%' }}
              onClick={() => {
                setActiveModal('whatsapp')
              }}
            >
              {hasWhatsapp ? 'Manage Connection' : 'Connect WhatsApp'}
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
            {hasTelegram ? (
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

          {hasTelegram ? (
            <div style={{ background: 'rgba(12,12,12,0.03)', padding: '1rem', borderRadius: '8px', marginBottom: '2rem' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>Status & Token</p>
              <p style={{ fontFamily: 'DM Mono', fontSize: '0.85rem', color: 'var(--ink)', wordBreak: 'break-all' }}>
                {tgConfig.token ? `${tgConfig.token.substring(0, 10)}... (Configured)` : 'Telegram Bot Token Configured'}
              </p>
            </div>
          ) : (
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '2rem' }}>
              Connect a Telegram Bot to allow your AI agents to interact with customers on Telegram.
            </p>
          )}

          <div style={{ marginTop: 'auto' }}>
            <button
              className={hasTelegram ? "btn-secondary" : "btn-primary"}
              style={{ width: '100%' }}
              onClick={() => setActiveModal('telegram')}
            >
              {hasTelegram ? 'Manage Connection' : 'Connect Telegram'}
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
                  {hasTelegram && (
                    <div style={{ 
                      marginBottom: '1.5rem', 
                      padding: '1rem 1.25rem', 
                      background: 'rgba(42, 122, 74, 0.08)', 
                      borderRadius: '8px', 
                      border: '1px solid rgba(42, 122, 74, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}>
                      <ShieldCheck size={20} color="#2a7a4a" />
                      <div>
                        <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#2a7a4a', margin: 0 }}>
                          Telegram Connection Configured
                        </p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: 0 }}>
                          Your Bot Token is stored and active in the backend.
                        </p>
                      </div>
                    </div>
                  )}

                  <div style={{ marginBottom: '2.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '1rem' }}>Configuration Steps</h3>
                    <ol style={{ paddingLeft: '1.25rem', color: 'var(--muted)', fontSize: '0.9rem', lineHeight: 1.7 }}>
                      <li style={{ marginBottom: '0.5rem' }}>Open Telegram and search for <strong>@BotFather</strong>.</li>
                      <li style={{ marginBottom: '0.5rem' }}>Send the command <code>/newbot</code> and follow the instructions to create a new bot.</li>
                      <li style={{ marginBottom: '0.5rem' }}>Copy the HTTP API Token provided by BotFather.</li>
                      <li>Paste or update the token in the field below.</li>
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

                  <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(12,12,12,0.03)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '0.5rem' }}>Webhook Registration</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1rem' }}>
                      To receive messages, register your webhook URL. If running locally, enter your ngrok URL (e.g., <code>https://abc.ngrok-free.app</code>). In production, leave it blank to auto-detect.
                    </p>
                    <div className="dash-form-group" style={{ marginBottom: '1rem' }}>
                      <label className="dash-label">Base URL (optional)</label>
                      <input
                        type="text"
                        className="dash-input"
                        placeholder="https://your-ngrok-url.ngrok-free.app"
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                      />
                    </div>
                    <button
                      className="btn-secondary"
                      disabled={isRegisteringWebhook || (!tgConfig.token && !hasTelegram)}
                      onClick={async () => {
                        setIsRegisteringWebhook(true)
                        try {
                          const res = await registerTelegramWebhook(tenantSlug, webhookUrl)
                          if (res.success) {
                            toast.success(res.message || 'Webhook registered!')
                          } else {
                            toast.error(res.error || 'Failed to register webhook')
                          }
                        } catch (e) {
                          toast.error('Unexpected error registering webhook')
                        } finally {
                          setIsRegisteringWebhook(false)
                        }
                      }}
                    >
                      {isRegisteringWebhook ? 'Registering...' : 'Register Webhook'}
                    </button>
                  </div>
                </>
              )}

              {activeModal === 'whatsapp' && (
                <>
                  {hasWhatsapp && (
                    <div style={{ 
                      marginBottom: '1.5rem', 
                      padding: '1rem 1.25rem', 
                      background: 'rgba(42, 122, 74, 0.08)', 
                      borderRadius: '8px', 
                      border: '1px solid rgba(42, 122, 74, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}>
                      <ShieldCheck size={20} color="#2a7a4a" />
                      <div>
                        <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#2a7a4a', margin: 0 }}>
                          WhatsApp API Configured
                        </p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: 0 }}>
                          Your WhatsApp credentials are saved and active.
                        </p>
                      </div>
                    </div>
                  )}

                  <div style={{ marginBottom: '2.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '1rem' }}>Configuration Steps</h3>
                    <ol style={{ paddingLeft: '1.25rem', color: 'var(--muted)', fontSize: '0.9rem', lineHeight: 1.7 }}>
                      <li style={{ marginBottom: '0.5rem' }}>Go to the <a href="https://developers.facebook.com/" target="_blank" rel="noreferrer" style={{ color: 'var(--gold)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>Meta for Developers <ExternalLink size={12} /></a> dashboard.</li>
                      <li style={{ marginBottom: '0.5rem' }}>Create a new App or select an existing one with WhatsApp set up.</li>
                      <li style={{ marginBottom: '0.5rem' }}>Navigate to <strong>WhatsApp &gt; API Setup</strong> to find your Phone Number ID and WABA ID.</li>
                      <li>Generate a Permanent Token in System Users settings and paste below.</li>
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
                    tgConfig.token = tgConfig.token.trim()
                  }

                  setIsSaving(true)
                  try {
                    const provider = activeModal
                    const config = provider === 'whatsapp' ? waConfig : tgConfig

                    const result = await saveChannelConfig(tenantSlug, provider, config)

                    if (result.success) {
                      toast.success(`${provider === 'whatsapp' ? 'WhatsApp' : 'Telegram'} configuration saved!`)
                      if (provider === 'whatsapp') setHasWhatsapp(true)
                      if (provider === 'telegram') setHasTelegram(true)
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
