'use client'

import { Lock } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function CalendarSyncButtons({ isSyncAllowed }: { isSyncAllowed: boolean }) {
  const handleSyncClick = (provider: string) => {
    if (!isSyncAllowed) {
      toast.error('Calendar sync is only available on Growth & Enterprise plans, or with the $9/mo add-on.', {
        duration: 4000,
        style: {
          background: 'var(--paper)',
          color: 'var(--ink)',
          border: '1px solid var(--border)',
        }
      })
      return
    }

    // Future functionality for OAuth flow
    toast.success(`Redirecting to ${provider} OAuth... (Coming soon)`)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <span style={{ fontSize: '0.75rem', fontFamily: 'DM Mono', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '0.5rem' }}>Sync:</span>
      
      <button 
        className={isSyncAllowed ? "sync-btn" : "sync-btn locked"}
        onClick={() => handleSyncClick('Google')}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '40px', height: '40px', borderRadius: '10px',
          background: 'var(--paper)', border: '1px solid var(--border-strong)',
          cursor: isSyncAllowed ? 'pointer' : 'not-allowed', 
          transition: 'all 0.2s', color: 'var(--ink)',
          opacity: isSyncAllowed ? 1 : 0.6,
          position: 'relative'
        }} 
        title="Connect Google Calendar"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
        {!isSyncAllowed && (
          <div style={{ position: 'absolute', top: '-6px', right: '-6px', background: 'var(--cream)', borderRadius: '50%', padding: '2px', border: '1px solid var(--border)' }}>
            <Lock size={12} color="var(--ink)" />
          </div>
        )}
      </button>

      <button 
        className={isSyncAllowed ? "sync-btn-outline" : "sync-btn-outline locked"}
        onClick={() => handleSyncClick('Outlook')}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '40px', height: '40px', borderRadius: '10px',
          background: 'transparent', border: '1px solid var(--border)',
          cursor: isSyncAllowed ? 'pointer' : 'not-allowed', 
          transition: 'all 0.2s', color: 'var(--muted)',
          opacity: isSyncAllowed ? 1 : 0.6,
          position: 'relative'
        }} 
        title="Connect Outlook"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
        {!isSyncAllowed && (
          <div style={{ position: 'absolute', top: '-6px', right: '-6px', background: 'var(--cream)', borderRadius: '50%', padding: '2px', border: '1px solid var(--border)' }}>
            <Lock size={12} color="var(--muted)" />
          </div>
        )}
      </button>
    </div>
  )
}
