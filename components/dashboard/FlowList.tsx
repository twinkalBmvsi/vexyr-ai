'use client'

import { useState } from 'react'
import { Plus, Zap, ZapOff, Trash2, Edit3, Workflow, AlertCircle, ChevronRight, Copy } from 'lucide-react'
import Link from 'next/link'
import { toggleFlowActive, deleteFlow, createFlow, duplicateFlow } from '@/app/actions/flows'
import { toast } from 'react-hot-toast'

interface Flow {
  id: string
  name: string
  description?: string | null
  trigger_keyword?: string | null
  nodes: any[]
  is_active: boolean
  created_at: string
  updated_at: string
}

interface FlowListProps {
  tenantId: string
  tenantSlug: string
  initialFlows: Flow[]
}

export default function FlowList({ tenantId, tenantSlug, initialFlows }: FlowListProps) {
  const [flows, setFlows] = useState<Flow[]>(initialFlows)
  const [showNewModal, setShowNewModal] = useState(false)
  const [newFlowName, setNewFlowName] = useState('')
  const [newFlowKeyword, setNewFlowKeyword] = useState('')
  const [newFlowDesc, setNewFlowDesc] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null)

  const handleToggle = async (flow: Flow) => {
    const prev = [...flows]
    setFlows(fs => fs.map(f => f.id === flow.id ? { ...f, is_active: !f.is_active } : f))

    const { error } = await toggleFlowActive(flow.id, tenantId, !flow.is_active)
    if (error) {
      setFlows(prev)
      toast.error('Failed to update flow status')
    } else {
      toast.success(flow.is_active ? 'Flow deactivated' : 'Flow activated')
    }
  }

  const handleDelete = async (flow: Flow) => {
    if (!confirm(`Delete "${flow.name}"? This cannot be undone.`)) return
    setDeletingId(flow.id)
    const { error } = await deleteFlow(flow.id, tenantId)
    if (error) {
      toast.error('Failed to delete flow')
    } else {
      setFlows(fs => fs.filter(f => f.id !== flow.id))
      toast.success('Flow deleted')
    }
    setDeletingId(null)
  }

  const handleDuplicate = async (flow: Flow) => {
    setDuplicatingId(flow.id)
    const { flow: newFlow, error } = await duplicateFlow(flow.id, tenantId)
    if (error || !newFlow) {
      toast.error('Failed to duplicate flow')
    } else {
      setFlows(fs => [newFlow as Flow, ...fs])
      toast.success('Flow duplicated')
    }
    setDuplicatingId(null)
  }

  const handleCreate = async () => {
    if (!newFlowName.trim()) return
    setIsCreating(true)
    const { flow, error } = await createFlow({
      tenantId,
      name: newFlowName.trim(),
      description: newFlowDesc.trim() || undefined,
      triggerKeyword: newFlowKeyword.trim() || undefined
    })
    if (error || !flow) {
      toast.error('Failed to create flow')
    } else {
      setFlows(fs => [flow as Flow, ...fs])
      setShowNewModal(false)
      setNewFlowName('')
      setNewFlowKeyword('')
      setNewFlowDesc('')
      toast.success('Flow created! Now add some nodes.')
      // Navigate to editor
      window.location.href = `/${tenantSlug}/flows/${flow.id}`
    }
    setIsCreating(false)
  }

  return (
    <div>
      {/* Header */}
      <div className="dash-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="dash-title">FlowForge</h1>
          <p className="dash-subtitle">Design structured conversation journeys. Zero LLM tokens — 100% predictable.</p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}
        >
          <Plus size={18} />
          New Flow
        </button>
      </div>

      {/* Empty State */}
      {flows.length === 0 && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          textAlign: 'center', padding: '5rem 2rem',
          background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: '12px',
          gap: '1.5rem'
        }}>
          <div style={{ padding: '1.5rem', background: 'rgba(201,168,76,0.1)', borderRadius: '50%' }}>
            <Workflow size={48} color="var(--gold)" />
          </div>
          <div>
            <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: '1.8rem', marginBottom: '0.75rem' }}>No flows yet</h2>
            <p style={{ color: 'var(--muted)', maxWidth: '400px', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Create your first flow to start building structured conversations — appointment booking, service menus, and more.
            </p>
            <button onClick={() => setShowNewModal(true)} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={18} /> Create Flow
            </button>
          </div>
        </div>
      )}

      {/* Flow Cards */}
      {flows.length > 0 && (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {flows.map(flow => (
            <div
              key={flow.id}
              className="dash-card"
              style={{
                display: 'flex', alignItems: 'center', gap: '1.5rem',
                border: flow.is_active ? '1px solid rgba(42,122,74,0.3)' : '1px solid var(--border)',
                transition: 'border 0.2s ease'
              }}
            >
              {/* Icon */}
              <div style={{
                padding: '0.75rem', borderRadius: '10px', flexShrink: 0,
                background: flow.is_active ? 'rgba(42,122,74,0.1)' : 'rgba(201,168,76,0.1)'
              }}>
                <Workflow size={22} color={flow.is_active ? '#2a7a4a' : 'var(--gold)'} />
              </div>

              {/* Info */}
              <div style={{ flexGrow: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{flow.name}</h3>
                  {flow.is_active ? (
                    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '100px', background: 'rgba(42,122,74,0.1)', color: '#2a7a4a', border: '1px solid rgba(42,122,74,0.25)', fontSize: '0.72rem', fontFamily: 'DM Mono', letterSpacing: '0.05em' }}>ACTIVE</span>
                  ) : (
                    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '100px', background: 'rgba(0,0,0,0.05)', color: 'var(--muted)', border: '1px solid var(--border)', fontSize: '0.72rem', fontFamily: 'DM Mono', letterSpacing: '0.05em' }}>INACTIVE</span>
                  )}
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
                  {flow.description || <em style={{ opacity: 0.5 }}>No description</em>}
                </p>
                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                  {flow.trigger_keyword && (
                    <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                      Trigger: <code style={{ background: 'var(--paper)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontFamily: 'DM Mono', fontSize: '0.78rem' }}>{flow.trigger_keyword.toUpperCase()}</code>
                    </span>
                  )}
                  <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{flow.nodes.length} nodes</span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                    Updated {new Date(flow.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                {/* Toggle active */}
                <button
                  onClick={() => handleToggle(flow)}
                  title={flow.is_active ? 'Deactivate flow' : 'Activate flow'}
                  style={{
                    padding: '0.5rem 0.75rem', borderRadius: '8px', cursor: 'pointer', border: 'none',
                    background: flow.is_active ? 'rgba(220,38,38,0.08)' : 'rgba(42,122,74,0.1)',
                    color: flow.is_active ? '#dc2626' : '#2a7a4a',
                    display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 500
                  }}
                >
                  {flow.is_active ? <ZapOff size={15} /> : <Zap size={15} />}
                  {flow.is_active ? 'Deactivate' : 'Activate'}
                </button>

                {/* Edit */}
                <Link
                  href={`/${tenantSlug}/flows/${flow.id}`}
                  style={{
                    padding: '0.5rem 0.75rem', borderRadius: '8px', cursor: 'pointer',
                    border: '1px solid var(--border)', background: 'transparent', color: 'var(--ink)',
                    display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem',
                    textDecoration: 'none', fontWeight: 500
                  }}
                >
                  <Edit3 size={15} /> Edit
                </Link>

                {/* Duplicate */}
                <button
                  onClick={() => handleDuplicate(flow)}
                  disabled={duplicatingId === flow.id}
                  title="Duplicate flow"
                  style={{
                    padding: '0.5rem', borderRadius: '8px', cursor: 'pointer', border: '1px solid var(--border)',
                    background: 'transparent', color: 'var(--ink)',
                    display: 'flex', alignItems: 'center'
                  }}
                >
                  <Copy size={15} />
                </button>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(flow)}
                  disabled={deletingId === flow.id}
                  title="Delete flow"
                  style={{
                    padding: '0.5rem', borderRadius: '8px', cursor: 'pointer', border: 'none',
                    background: 'transparent', color: 'var(--muted)',
                    display: 'flex', alignItems: 'center'
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Banner */}
      {flows.length > 0 && (
        <div style={{
          marginTop: '2rem', padding: '1rem 1.25rem',
          background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.2)',
          borderRadius: '8px', display: 'flex', gap: '0.75rem', alignItems: 'flex-start'
        }}>
          <AlertCircle size={18} color="var(--gold)" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
          <p style={{ fontSize: '0.83rem', color: 'var(--muted)', lineHeight: 1.5 }}>
            Active flows intercept incoming messages on WhatsApp &amp; Telegram <em>before</em> the AI agent. 
            When a customer sends the trigger keyword, the flow runs automatically — no LLM tokens consumed.
            If no flow matches, the message falls through to your AI agent as normal.
          </p>
        </div>
      )}

      {/* New Flow Modal */}
      {showNewModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(5px)', zIndex: 200, display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div className="dash-card" style={{ width: '100%', maxWidth: '480px', padding: '2rem' }}>
            <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: '1.6rem', marginBottom: '1.5rem' }}>New Flow</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 500, display: 'block', marginBottom: '0.4rem' }}>Flow Name *</label>
                <input
                  type="text"
                  value={newFlowName}
                  onChange={e => setNewFlowName(e.target.value)}
                  placeholder="e.g. Appointment Booking"
                  style={{
                    width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px',
                    border: '1px solid var(--border)', background: 'var(--paper)',
                    color: 'var(--ink)', fontSize: '0.9rem', fontFamily: 'DM Sans', boxSizing: 'border-box'
                  }}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 500, display: 'block', marginBottom: '0.4rem' }}>
                  Trigger Keyword <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span>
                </label>
                <input
                  type="text"
                  value={newFlowKeyword}
                  onChange={e => setNewFlowKeyword(e.target.value)}
                  placeholder="e.g. HI, BOOK, START"
                  style={{
                    width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px',
                    border: '1px solid var(--border)', background: 'var(--paper)',
                    color: 'var(--ink)', fontSize: '0.9rem', fontFamily: 'DM Mono', boxSizing: 'border-box'
                  }}
                />
                <p style={{ fontSize: '0.76rem', color: 'var(--muted)', marginTop: '0.3rem' }}>
                  Customer sends this exact word to start the flow.
                </p>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 500, display: 'block', marginBottom: '0.4rem' }}>
                  Description <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span>
                </label>
                <textarea
                  value={newFlowDesc}
                  onChange={e => setNewFlowDesc(e.target.value)}
                  placeholder="e.g. Handles appointment scheduling via WhatsApp"
                  rows={2}
                  style={{
                    width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px',
                    border: '1px solid var(--border)', background: 'var(--paper)',
                    color: 'var(--ink)', fontSize: '0.9rem', fontFamily: 'DM Sans',
                    resize: 'vertical', boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowNewModal(false); setNewFlowName(''); setNewFlowKeyword(''); setNewFlowDesc('') }}
                style={{
                  padding: '0.6rem 1.2rem', borderRadius: '8px', border: '1px solid var(--border)',
                  background: 'transparent', color: 'var(--ink)', cursor: 'pointer', fontSize: '0.9rem'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newFlowName.trim() || isCreating}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                {isCreating ? 'Creating...' : <><Plus size={16} /> Create &amp; Edit</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
