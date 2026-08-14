'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function AcceptInviteClient({ token, tenantName }: { token: string, tenantName: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleAccept = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/team/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to accept invitation')
      }

      toast.success('Successfully joined the team!')
      router.push('/')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to accept invitation')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <h1 className="auth-title">Join Workspace</h1>
        <p className="auth-subtitle" style={{ marginBottom: '2.5rem' }}>
          You have been invited to join <strong>{tenantName}</strong> on Vexyr.
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button 
            className="btn-secondary" 
            onClick={() => router.push('/')}
            disabled={loading}
          >
            Decline
          </button>
          <button 
            className="btn-primary" 
            onClick={handleAccept}
            disabled={loading}
          >
            {loading ? 'Accepting...' : 'Accept Invite'}
          </button>
        </div>
      </div>
    </div>
  )
}
