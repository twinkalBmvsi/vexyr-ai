'use client'

import { useState } from 'react'
import { UserPlus, Trash2, Mail, ShieldAlert } from 'lucide-react'

type TeamMember = {
  id: string
  user_id: string
  full_name: string | null
  role: string
}

export default function TeamManagerClient({ 
  tenantId, 
  userRole, 
  initialMembers 
}: { 
  tenantId: string
  userRole: string
  initialMembers: TeamMember[] 
}) {
  const [members, setMembers] = useState(initialMembers)
  const [inviteEmail, setInviteEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  const isOwner = userRole === 'owner'

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isOwner) return
    
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, tenantId })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to invite user')
      }

      setSuccess('Invitation sent successfully!')
      if (data.member) {
        setMembers(currentMembers => [...currentMembers, data.member])
      }
      setInviteEmail('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite user')
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (memberId: string) => {
    if (!isOwner) return
    if (!confirm('Are you sure you want to remove this user from the workspace?')) return

    setError(null)
    setSuccess(null)
    setRemovingMemberId(memberId)

    try {
      const res = await fetch('/api/team/remove', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ memberId, tenantId })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to remove user')
      }

      setMembers(currentMembers => currentMembers.filter(member => member.id !== memberId))
      setSuccess('User removed successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove user')
    } finally {
      setRemovingMemberId(null)
    }
  }

  return (
    <div>
      <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: '1.8rem', marginBottom: '1.5rem', color: 'var(--ink)' }}>Team Management</h2>
      
      {!isOwner && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: 'rgba(234, 179, 8, 0.1)', color: '#ca8a04', borderRadius: '8px', marginBottom: '2rem' }}>
          <ShieldAlert size={20} />
          <span style={{ fontSize: '0.85rem' }}>You are a manager. Only workspace owners can invite or remove team members.</span>
        </div>
      )}

      {error && (
        <div style={{ padding: '1rem', background: 'rgba(220, 38, 38, 0.1)', color: '#dc2626', borderRadius: '4px', fontSize: '0.85rem', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ padding: '1rem', background: 'rgba(34, 197, 94, 0.1)', color: '#16a34a', borderRadius: '4px', fontSize: '0.85rem', marginBottom: '1rem' }}>
          {success}
        </div>
      )}

      {isOwner && (
        <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '1.5rem', marginBottom: '3rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '1rem', color: 'var(--ink)' }}>Invite New Member</h3>
          <form onSubmit={handleInvite} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.5rem' }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="var(--muted)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="email" 
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  required
                  style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '0.9rem' }}
                />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserPlus size={16} />
              {loading ? 'Sending...' : 'Send Invite'}
            </button>
          </form>
        </div>
      )}

      <h3 style={{ fontSize: '1.2rem', fontWeight: 500, marginBottom: '1.5rem', color: 'var(--ink)' }}>Team Members</h3>
      
      <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '1rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', fontWeight: 500 }}>Name</th>
              <th style={{ padding: '1rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', fontWeight: 500 }}>Role</th>
              <th style={{ padding: '1rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', fontWeight: 500, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map(member => (
              <tr key={member.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--gold)', color: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 600 }}>
                      {member.full_name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--ink)' }}>{member.full_name || 'Pending User'}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: '12px', 
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    background: member.role === 'owner' ? 'rgba(234, 179, 8, 0.1)' : 'rgba(0,0,0,0.05)',
                    color: member.role === 'owner' ? '#ca8a04' : 'var(--muted)'
                  }}>
                    {member.role}
                  </span>
                </td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  {isOwner && member.role !== 'owner' && (
                    <form
                      action="/api/team/remove"
                      method="post"
                      onSubmit={(event) => {
                        event.preventDefault()
                        void handleRemove(member.id)
                      }}
                      style={{ display: 'inline-flex' }}
                    >
                      <input type="hidden" name="memberId" value={member.id} />
                      <input type="hidden" name="tenantId" value={tenantId} />
                      <button 
                        type="submit"
                        disabled={removingMemberId === member.id}
                        style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: removingMemberId === member.id ? 'wait' : 'pointer', padding: '0.5rem', borderRadius: '4px', transition: 'background 0.2s', opacity: removingMemberId === member.id ? 0.5 : 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(220,38,38,0.1)'}
                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                        title="Remove Member"
                        aria-label={`Remove ${member.full_name || 'team member'}`}
                      >
                        <Trash2 size={18} pointerEvents="none" />
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td colSpan={3} style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.9rem' }}>
                  No team members found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
