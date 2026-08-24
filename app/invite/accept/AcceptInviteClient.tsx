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
      
      const protocol = window.location.protocol
      const host = window.location.host
      
      // Determine the root domain (strip any existing subdomains if they exist)
      let rootDomain = host
      if (host.includes('localhost') || host.includes('localtest.me')) {
        // e.g., localhost:3000
        rootDomain = host.split('.').slice(-1)[0] === 'me' ? host.split('.').slice(-2).join('.') : host.split('.').slice(-1)[0]
        // But host is already localhost:3000. 
        // A safer way is to strip the first part if it's a known subdomain, but since /invite/accept is on root, host IS rootDomain.
      }
      
      // Actually, since NEXT_PUBLIC_ROOT_DOMAIN is safest if set:
      const envRootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN
      const port = host.includes(':') ? `:${host.split(':')[1]}` : ''
      const finalRootDomain = envRootDomain ? `${envRootDomain}${port}` : host

      const targetUrl = `${protocol}//${tenantSlug}.${finalRootDomain}`

      // Fetch current session to pass tokens to the subdomain via SSO handoff
      const supabase = (await import('@/utils/supabase/client')).createClient()
      const { data: { session } } = await supabase.auth.getSession()

      const dest = isNewUser ? '/set-password' : '/'

      if (session) {
        window.location.href = `${targetUrl}/auth/handoff?access_token=${session.access_token}&refresh_token=${session.refresh_token}&next=${encodeURIComponent(dest)}`
      } else {
        window.location.href = `${targetUrl}${dest}`
      }
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
