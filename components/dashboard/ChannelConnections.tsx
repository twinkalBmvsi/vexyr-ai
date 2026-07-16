'use client'

import { useState } from 'react'
import { MessageCircle, Smartphone, CheckCircle2, AlertCircle, X, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ChannelConnections({
  initialHasWhatsapp,
  initialHasTelegram,
  initialWaNumber
}: {
  initialHasWhatsapp: boolean;
  initialHasTelegram: boolean;
  initialWaNumber: string;
}) {
  const [activeModal, setActiveModal] = useState<'whatsapp' | 'telegram' | null>(null)

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
              onClick={() => setActiveModal('whatsapp')}
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
      {activeModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
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
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
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
                      <li style={{ marginBottom: '0.5rem' }}>Send the <code style={{ background: 'var(--border)', padding: '0.1rem 0.3rem', borderRadius: '4px', color: 'var(--ink)' }}>/newbot</code> command and follow the prompts to create your bot.</li>
                      <li style={{ marginBottom: '0.5rem' }}>Once created, BotFather will give you a long <strong>HTTP API Token</strong>.</li>
                      <li>Copy that token and paste it in the field below.</li>
                    </ol>
                  </div>

                  <div className="dash-form-group">
                    <label className="dash-label">Bot API Token</label>
                    <input 
                      type="text" 
                      className="dash-input" 
                      placeholder="e.g. 123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
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
                      <li style={{ marginBottom: '0.5rem' }}>Go to the <a href="https://developers.facebook.com/" target="_blank" rel="noreferrer" style={{ color: 'var(--gold)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>Meta for Developers <ExternalLink size={12}/></a> dashboard.</li>
                      <li style={{ marginBottom: '0.5rem' }}>Create a new App with the <strong>WhatsApp</strong> product.</li>
                      <li style={{ marginBottom: '0.5rem' }}>Generate a Permanent System User Access Token in the Business Settings.</li>
                      <li>Copy the Access Token, Phone Number ID, and WABA ID into the fields below.</li>
                    </ol>
                  </div>

                  <div className="dash-form-group">
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
                onClick={() => {
                  toast.success(`${activeModal === 'whatsapp' ? 'WhatsApp' : 'Telegram'} configuration saved!`)
                  setActiveModal(null)
                }}
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
