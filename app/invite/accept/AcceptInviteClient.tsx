'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
export default function AcceptInviteClient({ 
  token, 
  tenantName, 
  tenantSlug, 
  isNewUser,
  currentUserEmail,
  inviteEmail,
  isWrongUser
}: { 
  token: string, 
  tenantName: string, 
  tenantSlug: string, 
  isNewUser: boolean,
  currentUserEmail?: string,
  inviteEmail?: string,
  isWrongUser?: boolean
}) {
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
      if (isNewUser) {
        router.push(`/${tenantSlug}/set-password`)
      } else {
        router.push(`/${tenantSlug}`)
      }
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
          {isWrongUser ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '1rem', backgroundColor: 'rgba(255, 68, 68, 0.1)', color: '#ff4444', borderRadius: '0.5rem', fontSize: '0.875rem' }}>
                You are logged in as <strong>{currentUserEmail}</strong>, but this invite was sent to <strong>{inviteEmail}</strong>.
              </div>
              <button 
                className="btn-secondary" 
                onClick={async () => {
                  const supabase = (await import('@/utils/supabase/client')).createClient()
                  await supabase.auth.signOut()
                  router.push('/login?next=' + encodeURIComponent(`/invite/accept?token=${token}`))
                }}
              >
                Switch Account
              </button>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}
