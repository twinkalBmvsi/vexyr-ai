'use client'

import { useState, useEffect } from 'react'
import { UserPlus, Trash2, Mail, ShieldAlert, Settings2, X } from 'lucide-react'

type TeamMember = {
  id: string
  user_id: string
  full_name: string | null
  email?: string
  role: string
  access_pages?: string[]
  status?: 'active' | 'pending'
  isInvite?: boolean
}

const AVAILABLE_PAGES = [
  { id: 'appointments', label: 'Appointments' },
  { id: 'agents', label: 'Agents' },
  { id: 'test-chat', label: 'Test Chat' },
  { id: 'connections', label: 'Channels' },
  { id: 'customers', label: 'Customers' },
  { id: 'store', label: 'Store' },
  { id: 'live-chats', label: 'Live Chats' },
]

const SETTINGS_PAGES = [
  { id: 'settings', label: 'General Settings' },
  { id: 'settings/billing', label: 'Billing' },
  { id: 'settings/team', label: 'Team Management' },
  { id: 'settings/emails', label: 'Custom Emails' },
  { id: 'settings/follow-ups', label: 'Auto Follow-ups' },
  { id: 'settings/broadcasts', label: 'Marketing Broadcasts' },
  { id: 'settings/security', label: 'Security' },
]

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
  const [updatingPermissionsId, setUpdatingPermissionsId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  const [accessModalOpen, setAccessModalOpen] = useState(false)
  const [selectedMemberForAccess, setSelectedMemberForAccess] = useState<TeamMember | null>(null)
  const [tempAccessPages, setTempAccessPages] = useState<string[]>([])
  
  const isOwner = userRole === 'owner'

  useEffect(() => {
    if (accessModalOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [accessModalOpen])

  const handleUpdatePermissions = async (memberId: string, newAccessPages: string[]) => {
    if (!isOwner) return
    setError(null)
    setSuccess(null)
    setUpdatingPermissionsId(memberId)

    try {
      const res = await fetch('/api/team/permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, tenantId, accessPages: newAccessPages })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update permissions')
      }

      setMembers(currentMembers => 
        currentMembers.map(m => m.id === memberId ? { ...m, access_pages: newAccessPages } : m)
      )
      setSuccess('Permissions updated successfully')
      setAccessModalOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update permissions')
    } finally {
      setUpdatingPermissionsId(null)
    }
  }

  const openAccessModal = (member: TeamMember) => {
    setSelectedMemberForAccess(member)
    setTempAccessPages(member.access_pages || [])
    setAccessModalOpen(true)
  }

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

  const handleResend = async (email: string) => {
    if (!isOwner || !email) return
    
    setError(null)
    setSuccess(null)
    setUpdatingPermissionsId(`resend-${email}`)

    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, tenantId })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to resend invitation')
      }

      setSuccess(`Invitation resent successfully to ${email}!`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend invitation')
    } finally {
      setUpdatingPermissionsId(null)
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
              <th style={{ padding: '1rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', fontWeight: 500 }}>Page Access</th>
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
                      <div style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {member.full_name || 'Pending User'}
                        {member.status === 'pending' && (
                          <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'rgba(234, 179, 8, 0.1)', color: '#ca8a04', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Invite Pending
                          </span>
                        )}
                      </div>
                      {member.email && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.1rem' }}>{member.email}</div>
                      )}
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
                <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                  {member.role === 'owner' ? (
                    <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>All Access</span>
                  ) : member.status === 'pending' ? (
                    <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Not Accepted Yet</span>
                  ) : (
                    <button
                      onClick={() => isOwner && openAccessModal(member)}
                      disabled={!isOwner}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--border)',
                        color: 'var(--ink)',
                        padding: '0.4rem 0.75rem',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        cursor: isOwner ? 'pointer' : 'default',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        transition: 'background 0.2s'
                      }}
                      onMouseOver={e => isOwner && (e.currentTarget.style.background = 'rgba(0,0,0,0.02)')}
                      onMouseOut={e => isOwner && (e.currentTarget.style.background = 'transparent')}
                    >
                      <Settings2 size={14} />
                      Manage Access
                    </button>
                  )}
                </td>
                <td style={{ padding: '1rem', textAlign: 'right', verticalAlign: 'top' }}>
                  {isOwner && member.role !== 'owner' && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      {member.status === 'pending' && member.email && (
                        <button
                          onClick={() => handleResend(member.email!)}
                          disabled={updatingPermissionsId === `resend-${member.email}`}
                          style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--ink)', cursor: updatingPermissionsId === `resend-${member.email}` ? 'wait' : 'pointer', padding: '0.4rem 0.75rem', borderRadius: '4px', transition: 'background 0.2s', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center' }}
                          onMouseOver={e => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'}
                          onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                          title="Resend Invite"
                        >
                          {updatingPermissionsId === `resend-${member.email}` ? 'Resending...' : 'Resend'}
                        </button>
                      )}
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
                          title={member.status === 'pending' ? "Revoke Invite" : "Remove Member"}
                          aria-label={`Remove ${member.full_name || 'team member'}`}
                        >
                          <Trash2 size={18} pointerEvents="none" />
                        </button>
                      </form>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.9rem' }}>
                  No team members found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {accessModalOpen && selectedMemberForAccess && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', zIndex: 9999,
          display: 'grid', placeItems: 'center',
          backdropFilter: 'blur(2px)'
        }}>
          <div style={{
            background: 'var(--paper)', width: '100%', maxWidth: '400px',
            borderRadius: '8px', padding: '1.5rem', boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            position: 'relative',
            border: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--ink)' }}>
                Page Access: {selectedMemberForAccess.full_name}
              </h3>
              <button onClick={() => setAccessModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
                <X size={20} />
              </button>
            </div>
            
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1rem' }}>
              Select the pages this member is allowed to access.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {AVAILABLE_PAGES.map(page => {
                const hasAccess = tempAccessPages.includes(page.id)
                return (
                  <label key={page.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={hasAccess} 
                      onChange={(e) => {
                        if (e.target.checked) {
                          setTempAccessPages(prev => [...prev, page.id])
                        } else {
                          setTempAccessPages(prev => prev.filter(p => p !== page.id))
                        }
                      }}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span style={{ color: 'var(--ink)' }}>{page.label}</span>
                  </label>
                )
              })}
            </div>

            <div style={{ marginBottom: '2rem', background: 'rgba(0,0,0,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Settings Access</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {SETTINGS_PAGES.map(page => {
                  const hasAccess = tempAccessPages.includes(page.id)
                  return (
                    <label key={page.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={hasAccess} 
                        onChange={(e) => {
                          if (e.target.checked) {
                            setTempAccessPages(prev => [...prev, page.id])
                          } else {
                            setTempAccessPages(prev => prev.filter(p => p !== page.id))
                          }
                        }}
                        style={{ width: '16px', height: '16px' }}
                      />
                      <span style={{ color: 'var(--ink)' }}>{page.label}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button 
                className="btn-secondary" 
                onClick={() => setAccessModalOpen(false)}
                disabled={updatingPermissionsId === selectedMemberForAccess.id}
              >
                Cancel
              </button>
              <button 
                className="btn-primary" 
                onClick={() => handleUpdatePermissions(selectedMemberForAccess.id, tempAccessPages)}
                disabled={updatingPermissionsId === selectedMemberForAccess.id}
              >
                {updatingPermissionsId === selectedMemberForAccess.id ? 'Saving...' : 'Save Access'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
