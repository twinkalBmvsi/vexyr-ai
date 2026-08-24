import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/service-role'
import { redirect } from 'next/navigation'
import AcceptInviteClient from './AcceptInviteClient'

export default async function AcceptInvitePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams

  if (!token) {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <h1 className="auth-title">Invalid Link</h1>
          <p className="auth-subtitle">This invitation link is invalid or missing a token.</p>
        </div>
      </div>
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const nextUrl = encodeURIComponent(`/invite/accept?token=${token}`)
    redirect(`/login?next=${nextUrl}`)
  }

  const adminClient = createAdminClient()
  const { data: invite, error } = await adminClient
    .from('team_invites')
    .select('*, tenants(name, slug)')
    .eq('token', token)
    .single()

  if (error || !invite) {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <h1 className="auth-title">Invalid Invite</h1>
          <p className="auth-subtitle">We couldn't find this invitation. It may have been revoked.</p>
        </div>
      </div>
    )
  }

  if (invite.status === 'accepted') {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <h1 className="auth-title">Already Accepted</h1>
          <p className="auth-subtitle">You have already accepted this invitation.</p>
          <a href="/" className="btn-primary" style={{ display: 'inline-block', marginTop: '1.5rem', textDecoration: 'none' }}>Go to Dashboard</a>
        </div>
      </div>
    )
  }

  if (new Date(invite.expires_at) < new Date()) {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <h1 className="auth-title">Invite Expired</h1>
          <p className="auth-subtitle">This invitation has expired. Please ask the workspace owner to send a new one.</p>
        </div>
      </div>
    )
  }

  const tenantName = invite.tenants?.name || 'the workspace'
  const tenantSlug = invite.tenants?.slug || ''
  
  // Consider them a "new user" if they don't belong to any workspaces yet AND they haven't set their full name.
  // - Brand new users have 0 workspaces and no full_name (isNewUser = true)
  // - Existing active users have > 0 workspaces (isNewUser = false)
  // - Removed existing users have 0 workspaces but DO have a full_name (isNewUser = false)
  const { count } = await adminClient
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const isNewUser = count === 0 && !user.user_metadata?.full_name

  const isWrongUser = user.email?.toLowerCase() !== invite.email.toLowerCase()

  return (
    <AcceptInviteClient 
      token={token} 
      tenantName={tenantName} 
      tenantSlug={tenantSlug} 
      isNewUser={isNewUser} 
      currentUserEmail={user.email}
      inviteEmail={invite.email}
      isWrongUser={isWrongUser}
    />
  )
}
