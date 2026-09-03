'use client'

import { useState, useCallback } from 'react'
import {
  Plus, Trash2, ChevronDown, ChevronUp, Save, ArrowLeft,
  MessageSquare, List, TextCursorInput, Zap, CheckSquare, GripVertical,
  AlertTriangle, Eye, EyeOff, LayoutList, Network
} from 'lucide-react'
import Link from 'next/link'
import { updateFlowNodes, updateFlowMeta } from '@/app/actions/flows'
import { toast } from 'react-hot-toast'
import type { FlowNode, FlowNodeType } from '@/utils/flowEngine'
import FlowPreview from '@/components/dashboard/FlowPreview'
import dynamic from 'next/dynamic'

// Load canvas lazily to avoid SSR issues with ReactFlow
const FlowCanvas = dynamic(() => import('@/components/dashboard/FlowCanvas'), { ssr: false })

// ─── Node type config ────────────────────────────────────────────────────────

const NODE_TYPE_CONFIG: Record<FlowNodeType, { label: string; icon: any; color: string; bg: string }> = {
  message:   { label: 'Message',    icon: MessageSquare,   color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  options:   { label: 'Options',    icon: List,            color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  input:     { label: 'Input',      icon: TextCursorInput, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)'  },
  action:    { label: 'Action',     icon: Zap,             color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
  condition: { label: 'Condition',  icon: AlertTriangle,   color: '#f97316', bg: 'rgba(249,115,22,0.1)'  },
  end:       { label: 'End',        icon: CheckSquare,     color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
}

const ACTION_OPTIONS = [
  { value: 'book_appointment',       label: 'Book Appointment'    },
  { value: 'cancel_appointment',     label: 'Cancel Appointment'  },
  { value: 'reschedule_appointment', label: 'Reschedule Appointment' },
]

const VALIDATION_OPTIONS = [
  { value: 'any',    label: 'Any text'           },
  { value: 'text',   label: 'Text'               },
  { value: 'number', label: 'Number'             },
  { value: 'date',   label: 'Date (DD/MM/YYYY)'  },
  { value: 'email',  label: 'Email address'      },
  { value: 'phone',  label: 'Phone number'       },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateId(): string {
  return `n_${Math.random().toString(36).slice(2, 9)}`
}

function buildDefaultNode(type: FlowNodeType, nodes: FlowNode[]): FlowNode {
  const id = generateId()
  const prevId = nodes.length > 0 ? nodes[nodes.length - 1].id : null
  
  // Auto-link the previous last node to this one
  if (prevId) {
    const prev = nodes.find(n => n.id === prevId)
    if (prev && prev.type !== 'options' && prev.type !== 'end') {
      prev.next = id
    }
  }

  switch (type) {
    case 'message':   return { id, type: 'message',   content: '',       next: null }
    case 'options':   return { id, type: 'options',   content: 'Choose an option:', options: [{ label: 'Option 1', value: 'option_1', next: '' }], next: null }
    case 'input':     return { id, type: 'input',     content: '',       variable: '', validation: 'any', next: null }
    case 'action':    return { id, type: 'action',    action: 'book_appointment', params: {}, next: null }
    case 'end':       return { id, type: 'end',       content: 'Thank you! Have a great day.', next: null }
    default:          return { id, type,              content: '',       next: null }
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface FlowEditorProps {
  flow: {
    id: string
    name: string
    description?: string | null
    trigger_keyword?: string | null
    nodes: FlowNode[]
    is_active: boolean
    active_channels?: string[]
  }
  tenantId: string
  tenantSlug: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FlowEditor({ flow: initialFlow, tenantId, tenantSlug }: FlowEditorProps) {
  const [nodes, setNodes] = useState<FlowNode[]>(initialFlow.nodes || [])
  const [flowName, setFlowName] = useState(initialFlow.name)
  const [triggerKeyword, setTriggerKeyword] = useState(initialFlow.trigger_keyword || '')
  const [flowDesc, setFlowDesc] = useState(initialFlow.description || '')
  const [activeChannels, setActiveChannels] = useState<string[]>(initialFlow.active_channels || ['whatsapp', 'telegram'])
  const [isSaving, setIsSaving] = useState(false)
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(
    initialFlow.nodes.length > 0 ? initialFlow.nodes[0].id : null
  )
  const [showPreview, setShowPreview] = useState(true)
  const [viewMode, setViewMode] = useState<'list' | 'canvas'>('list')

  // ── Node mutations ──────────────────────────────────────────────────────────

  const addNode = (type: FlowNodeType) => {
    setNodes(prev => {
      const newNodes = [...prev]
      const newNode = buildDefaultNode(type, newNodes)
      newNodes.push(newNode)
      setExpandedNodeId(newNode.id)
      return newNodes
    })
  }

  const removeNode = (id: string) => {
    setNodes(prev => {
      const filtered = prev.filter(n => n.id !== id)
      // Clean up dangling next references
      filtered.forEach(n => {
        if (n.next === id) n.next = null
        if (n.options) {
          n.options.forEach(o => { if (o.next === id) o.next = '' })
        }
      })
      return filtered
    })
  }

  const updateNode = (id: string, updates: Partial<FlowNode>) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n))
  }

  const moveNode = (id: string, dir: 'up' | 'down') => {
    setNodes(prev => {
      const idx = prev.findIndex(n => n.id === id)
      if (dir === 'up' && idx === 0) return prev
      if (dir === 'down' && idx === prev.length - 1) return prev
      const arr = [...prev]
      const target = dir === 'up' ? idx - 1 : idx + 1
      ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
      return arr
    })
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const [nodesResult, metaResult] = await Promise.all([
        updateFlowNodes(initialFlow.id, tenantId, nodes),
        updateFlowMeta(initialFlow.id, tenantId, {
          name: flowName,
          description: flowDesc || undefined,
          trigger_keyword: triggerKeyword || undefined,
          active_channels: activeChannels
        })
      ])
      if (nodesResult.error || metaResult.error) {
        toast.error('Failed to save flow')
      } else {
        toast.success('Flow saved!')
      }
    } catch {
      toast.error('Failed to save flow')
    }
    setIsSaving(false)
  }

  // ── Node list → readable IDs for dropdowns ─────────────────────────────────

  const nodeSelectOptions = nodes.map((n, i) => ({
    value: n.id,
    label: `${i + 1}. [${NODE_TYPE_CONFIG[n.type].label}] ${n.content?.slice(0, 30) || n.action || '(empty)'}`
  }))

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: '100%' }}>

      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
        marginBottom: '1.5rem', padding: '1rem 1.25rem',
        background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: '10px'
      }}>
        <Link
          href={`/${tenantSlug}/flows`}
          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--muted)', textDecoration: 'none', fontSize: '0.85rem' }}
        >
          <ArrowLeft size={15} /> All Flows
        </Link>
        <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />
        <input
          value={flowName}
          onChange={e => setFlowName(e.target.value)}
          style={{
            fontFamily: 'DM Sans', fontWeight: 600, fontSize: '1rem', border: 'none',
            background: 'transparent', color: 'var(--ink)', outline: 'none', flexGrow: 1, minWidth: '120px'
          }}
          placeholder="Flow name..."
        />

        {/* View mode toggle */}
        <div style={{
          display: 'flex', borderRadius: '8px', overflow: 'hidden',
          border: '1px solid var(--border)', flexShrink: 0
        }}>
          <button
            onClick={() => setViewMode('list')}
            title="List view"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.45rem 0.85rem', border: 'none', cursor: 'pointer',
              fontSize: '0.78rem', fontWeight: 500, fontFamily: 'DM Sans',
              background: viewMode === 'list' ? 'var(--gold)' : 'transparent',
              color: viewMode === 'list' ? '#000' : 'var(--muted)',
              transition: 'all 0.15s'
            }}
          >
            <LayoutList size={13} /> List
          </button>
          <button
            onClick={() => setViewMode('canvas')}
            title="Canvas view"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.45rem 0.85rem', border: 'none', cursor: 'pointer',
              fontSize: '0.78rem', fontWeight: 500, fontFamily: 'DM Sans',
              background: viewMode === 'canvas' ? 'var(--gold)' : 'transparent',
              color: viewMode === 'canvas' ? '#000' : 'var(--muted)',
              transition: 'all 0.15s',
              borderLeft: '1px solid var(--border)'
            }}
          >
            <Network size={13} /> Canvas
          </button>
        </div>

        {/* Preview toggle */}
        <button
          onClick={() => setShowPreview(p => !p)}
          title={showPreview ? 'Hide preview' : 'Show preview'}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem' }}
        >
          {showPreview ? <EyeOff size={15} /> : <Eye size={15} />}
          {showPreview ? 'Hide Preview' : 'Show Preview'}
        </button>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Save size={15} />
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Meta row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <label style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--muted)', display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Trigger Keyword</label>
          <input
            value={triggerKeyword}
            onChange={e => setTriggerKeyword(e.target.value.toUpperCase())}
            placeholder="e.g. HI, BOOK"
            style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '7px', border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--ink)', fontFamily: 'DM Mono', fontSize: '0.85rem', boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--muted)', display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</label>
          <input
            value={flowDesc}
            onChange={e => setFlowDesc(e.target.value)}
            placeholder="What does this flow do?"
            style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '7px', border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--ink)', fontSize: '0.85rem', boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--muted)', display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Channels</label>
          <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--paper)', border: '1px solid var(--border)', padding: '0.3rem', borderRadius: '7px' }}>
            <button
              onClick={() => setActiveChannels(prev => prev.includes('whatsapp') ? prev.filter(c => c !== 'whatsapp') : [...prev, 'whatsapp'])}
              style={{ flex: 1, padding: '0.3rem', borderRadius: '5px', border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, background: activeChannels.includes('whatsapp') ? 'rgba(37, 211, 102, 0.15)' : 'transparent', color: activeChannels.includes('whatsapp') ? '#25D366' : 'var(--muted)' }}
            >
              WhatsApp
            </button>
            <button
              onClick={() => setActiveChannels(prev => prev.includes('telegram') ? prev.filter(c => c !== 'telegram') : [...prev, 'telegram'])}
              style={{ flex: 1, padding: '0.3rem', borderRadius: '5px', border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, background: activeChannels.includes('telegram') ? 'rgba(34, 158, 217, 0.15)' : 'transparent', color: activeChannels.includes('telegram') ? '#229ED9' : 'var(--muted)' }}
            >
              Telegram
            </button>
          </div>
        </div>
      </div>

      {/* ── Canvas Mode ── */}
      {viewMode === 'canvas' && (
        <div style={{ display: 'grid', gridTemplateColumns: showPreview ? '1fr 400px' : '1fr', gap: '1.5rem', alignItems: 'start' }}>
          <div style={{
            height: 'calc(100vh - 280px)',
            minHeight: '500px',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '1px solid var(--border)'
          }}>
            <FlowCanvas
              flowNodes={nodes}
              onChange={setNodes}
              onSave={handleSave}
              isSaving={isSaving}
            />
          </div>
          
          {/* Canvas Preview */}
          {showPreview && (
            <div style={{ height: 'calc(100vh - 280px)', minHeight: '500px' }}>
              <FlowPreview nodes={nodes} />
            </div>
          )}
        </div>
      )}

      {/* ── List Mode ── */}
      {viewMode === 'list' && (
        <div style={{ display: 'grid', gridTemplateColumns: showPreview ? '1fr 400px' : '1fr', gap: '1.5rem', alignItems: 'start' }}>

        {/* ── Left: Node Editor ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

          {nodes.length === 0 && (
            <div style={{
              padding: '3rem 2rem', textAlign: 'center', background: 'var(--paper)',
              border: '2px dashed var(--border)', borderRadius: '12px', color: 'var(--muted)'
            }}>
              <p style={{ marginBottom: '0.5rem', fontWeight: 500 }}>No nodes yet</p>
              <p style={{ fontSize: '0.83rem' }}>Add your first node below to start building the conversation.</p>
            </div>
          )}

          {nodes.map((node, idx) => {
            const cfg = NODE_TYPE_CONFIG[node.type]
            const Icon = cfg.icon
            const isExpanded = expandedNodeId === node.id

            return (
              <div key={node.id} style={{ position: 'relative' }}>
                {/* Connection line */}
                {idx < nodes.length - 1 && (
                  <div style={{
                    position: 'absolute', left: '24px', bottom: '-12px',
                    width: '2px', height: '12px', background: 'var(--border)', zIndex: 1
                  }} />
                )}

                <div
                  className="dash-card"
                  style={{
                    padding: 0, overflow: 'hidden',
                    border: isExpanded ? `1.5px solid ${cfg.color}` : '1px solid var(--border)',
                    transition: 'border 0.15s ease'
                  }}
                >
                  {/* Header */}
                  <div
                    onClick={() => setExpandedNodeId(isExpanded ? null : node.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.8rem 1rem',
                      cursor: 'pointer', userSelect: 'none', background: isExpanded ? `${cfg.bg}` : 'transparent'
                    }}
                  >
                    <div style={{ padding: '0.45rem', borderRadius: '7px', background: cfg.bg, flexShrink: 0 }}>
                      <Icon size={15} color={cfg.color} />
                    </div>
                    <div style={{ flexGrow: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '0.72rem', fontFamily: 'DM Mono', color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{cfg.label}</span>
                      <p style={{ fontSize: '0.85rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                        {node.content?.slice(0, 50) || node.action || <em style={{ opacity: 0.4 }}>—</em>}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <button onClick={e => { e.stopPropagation(); moveNode(node.id, 'up') }} disabled={idx === 0} style={{ background: 'transparent', border: 'none', cursor: 'pointer', opacity: idx === 0 ? 0.2 : 0.5, padding: '0.2rem' }}><ChevronUp size={14} /></button>
                      <button onClick={e => { e.stopPropagation(); moveNode(node.id, 'down') }} disabled={idx === nodes.length - 1} style={{ background: 'transparent', border: 'none', cursor: 'pointer', opacity: idx === nodes.length - 1 ? 0.2 : 0.5, padding: '0.2rem' }}><ChevronDown size={14} /></button>
                      <button onClick={e => { e.stopPropagation(); removeNode(node.id) }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#dc2626', opacity: 0.6, padding: '0.2rem' }}><Trash2 size={14} /></button>
                    </div>
                  </div>

                  {/* Expanded editor */}
                  {isExpanded && (
                    <div style={{ padding: '1rem', borderTop: `1px solid ${cfg.color}30`, display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      <NodeEditor
                        node={node}
                        nodes={nodes}
                        nodeSelectOptions={nodeSelectOptions}
                        onChange={updates => updateNode(node.id, updates)}
                      />
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* Add Node Buttons */}
          <div style={{ padding: '1rem 0', borderTop: '1px dashed var(--border)', marginTop: '0.5rem' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.75rem' }}>Add Node</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {(Object.entries(NODE_TYPE_CONFIG) as [FlowNodeType, any][])
                .filter(([type]) => type !== 'condition')
                .map(([type, cfg]) => {
                const Icon = cfg.icon
                return (
                  <button
                    key={type}
                    onClick={() => addNode(type)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.85rem',
                      borderRadius: '7px', border: '1px solid var(--border)', background: 'transparent',
                      color: cfg.color, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500
                    }}
                  >
                    <Icon size={13} /> {cfg.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── Right: Live Preview ── */}
        {showPreview && (
          <div style={{ position: 'sticky', top: '1rem', height: 'calc(100vh - 280px)', minHeight: '500px' }}>
            <FlowPreview nodes={nodes} flowName={flowName} triggerKeyword={triggerKeyword || undefined} />
          </div>
        )}
      </div>
      )}
    </div>
  )
}

// ─── Node-specific editor forms ────────────────────────────────────────────────

function NodeEditor({
  node,
  nodes,
  nodeSelectOptions,
  onChange
}: {
  node: FlowNode
  nodes: FlowNode[]
  nodeSelectOptions: { value: string; label: string }[]
  onChange: (updates: Partial<FlowNode>) => void
}) {
  const inputStyle = {
    width: '100%', padding: '0.55rem 0.75rem', borderRadius: '7px',
    border: '1px solid var(--border)', background: 'var(--paper)',
    color: 'var(--ink)', fontSize: '0.85rem', fontFamily: 'DM Sans', boxSizing: 'border-box' as const
  }
  const labelStyle = { fontSize: '0.78rem', fontWeight: 500 as const, color: 'var(--muted)', display: 'block' as const, marginBottom: '0.3rem' }

  const NextSelector = ({ value, onSelect }: { value?: string | null; onSelect: (v: string | null) => void }) => (
    <div>
      <label style={labelStyle}>Go to next node</label>
      <select
        value={value || ''}
        onChange={e => onSelect(e.target.value || null)}
        style={{ ...inputStyle, fontFamily: 'DM Mono', fontSize: '0.82rem' }}
      >
        <option value="">(End flow)</option>
        {nodeSelectOptions.filter(o => o.value !== node.id).map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )

  if (node.type === 'message') {
    return (
      <>
        <div>
          <label style={labelStyle}>Message text</label>
          <textarea
            rows={3}
            value={node.content || ''}
            onChange={e => onChange({ content: e.target.value })}
            placeholder="Hello! Welcome to {{businessName}} 👋"
            style={{ ...inputStyle, resize: 'vertical' }}
          />
          <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.3rem' }}>
            Use <code style={{ fontFamily: 'DM Mono', background: 'rgba(0,0,0,0.07)', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>{'{{variable_name}}'}</code> to insert collected data.
          </p>
        </div>
        <NextSelector value={node.next} onSelect={v => onChange({ next: v })} />
      </>
    )
  }

  if (node.type === 'options') {
    return (
      <>
        <div>
          <label style={labelStyle}>Prompt text</label>
          <input type="text" value={node.content || ''} onChange={e => onChange({ content: e.target.value })} placeholder="Choose an option:" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Options (each leads to a different node)</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {(node.options || []).map((opt, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 140px auto', gap: '0.5rem', alignItems: 'start' }}>
                <input
                  type="text"
                  value={opt.label}
                  onChange={e => {
                    const opts = [...(node.options || [])]
                    opts[i] = { ...opts[i], label: e.target.value, value: e.target.value.toLowerCase().replace(/\s+/g, '_') }
                    onChange({ options: opts })
                  }}
                  placeholder={`Option ${i + 1} label`}
                  style={inputStyle}
                />
                <select
                  value={opt.next || ''}
                  onChange={e => {
                    const opts = [...(node.options || [])]
                    opts[i] = { ...opts[i], next: e.target.value }
                    onChange({ options: opts })
                  }}
                  style={{ ...inputStyle, fontFamily: 'DM Mono', fontSize: '0.8rem', padding: '0.55rem 0.4rem' }}
                >
                  <option value="">(End)</option>
                  {nodeSelectOptions.filter(o => o.value !== node.id).map(o => (
                    <option key={o.value} value={o.value}>{o.label.slice(0, 30)}</option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    const opts = [...(node.options || [])].filter((_, j) => j !== i)
                    onChange({ options: opts })
                  }}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#dc2626', padding: '0.55rem 0.25rem', marginTop: '0' }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            <button
              onClick={() => {
                const opts = [...(node.options || []), { label: `Option ${(node.options?.length || 0) + 1}`, value: `option_${(node.options?.length || 0) + 1}`, next: '' }]
                onChange({ options: opts })
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.75rem', border: '1px dashed var(--border)', borderRadius: '7px', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.8rem', width: 'fit-content' }}
            >
              <Plus size={12} /> Add Option
            </button>
          </div>
        </div>
      </>
    )
  }

  if (node.type === 'input') {
    return (
      <>
        <div>
          <label style={labelStyle}>Question / Prompt text</label>
          <input type="text" value={node.content || ''} onChange={e => onChange({ content: e.target.value })} placeholder="Please enter your full name:" style={inputStyle} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label style={labelStyle}>Save response as variable</label>
            <input
              type="text"
              value={node.variable || ''}
              onChange={e => onChange({ variable: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
              placeholder="customer_name"
              style={{ ...inputStyle, fontFamily: 'DM Mono', fontSize: '0.83rem' }}
            />
          </div>
          <div>
            <label style={labelStyle}>Validation</label>
            <select value={node.validation || 'any'} onChange={e => onChange({ validation: e.target.value as any })} style={{ ...inputStyle, fontFamily: 'DM Mono', fontSize: '0.83rem' }}>
              {VALIDATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        <NextSelector value={node.next} onSelect={v => onChange({ next: v })} />
      </>
    )
  }

  if (node.type === 'action') {
    return (
      <>
        <div>
          <label style={labelStyle}>Action type</label>
          <select value={node.action || ''} onChange={e => onChange({ action: e.target.value })} style={{ ...inputStyle, fontFamily: 'DM Mono', fontSize: '0.83rem' }}>
            {ACTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Parameter mappings <span style={{ fontWeight: 400 }}>(variable → flow variable)</span></label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {Object.entries(node.params || {}).map(([key, val], i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.4rem' }}>
                <input type="text" value={key} onChange={e => {
                  const p = { ...(node.params || {}) }
                  const v = p[key]
                  delete p[key]
                  p[e.target.value] = v
                  onChange({ params: p })
                }} placeholder="param_name" style={{ ...inputStyle, fontFamily: 'DM Mono', fontSize: '0.8rem' }} />
                <input type="text" value={val} onChange={e => {
                  const p = { ...(node.params || {}), [key]: e.target.value }
                  onChange({ params: p })
                }} placeholder="{{variable}}" style={{ ...inputStyle, fontFamily: 'DM Mono', fontSize: '0.8rem' }} />
                <button onClick={() => {
                  const p = { ...(node.params || {}) }; delete p[key]
                  onChange({ params: p })
                }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#dc2626' }}><Trash2 size={12} /></button>
              </div>
            ))}
            <button onClick={() => onChange({ params: { ...(node.params || {}), '': '' } })} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.6rem', border: '1px dashed var(--border)', borderRadius: '6px', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.78rem', width: 'fit-content' }}>
              <Plus size={11} /> Add Param
            </button>
          </div>
        </div>
        <NextSelector value={node.next} onSelect={v => onChange({ next: v })} />
      </>
    )
  }

  if (node.type === 'end') {
    return (
      <div>
        <label style={labelStyle}>Final message</label>
        <textarea
          rows={3}
          value={node.content || ''}
          onChange={e => onChange({ content: e.target.value })}
          placeholder="✅ Your appointment is confirmed! Booking ID: {{appointment_id}}"
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>
    )
  }

  return <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Node type not supported yet.</p>
}

