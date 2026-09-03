'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
  BackgroundVariant,
  Panel,
  MarkerType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  MessageSquare, List, TextCursorInput, Zap, CheckSquare,
  AlertTriangle, Plus, Trash2, Save, X, ChevronRight
} from 'lucide-react'
import type { FlowNode, FlowNodeType } from '@/utils/flowEngine'

// ─── App theme tokens (mirroring globals.css CSS vars for use in JS) ──────────
const T = {
  paper:       '#0c0c0c',
  cream:       '#14120c',
  ink:         '#f5f2ec',
  gold:        '#c9a84c',
  goldLight:   '#e8d5a3',
  muted:       '#8c8880',
  border:      'rgba(255,255,255,0.08)',
  borderStrong:'rgba(255,255,255,0.15)',
}

// ─── Node type config (dark-theme friendly) ───────────────────────────────────
const NODE_TYPE_CONFIG: Record<FlowNodeType, {
  label: string; icon: any; color: string; bg: string; border: string
}> = {
  message:   { label: 'Message',   icon: MessageSquare,   color: '#60a5fa', bg: 'rgba(59,130,246,0.12)',  border: 'rgba(96,165,250,0.25)'  },
  options:   { label: 'Options',   icon: List,            color: T.gold,    bg: 'rgba(201,168,76,0.12)', border: 'rgba(201,168,76,0.3)'   },
  input:     { label: 'Input',     icon: TextCursorInput, color: '#a78bfa', bg: 'rgba(139,92,246,0.12)',  border: 'rgba(167,139,250,0.25)' },
  action:    { label: 'Action',    icon: Zap,             color: '#34d399', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(52,211,153,0.25)'  },
  condition: { label: 'Condition', icon: AlertTriangle,   color: '#fb923c', bg: 'rgba(249,115,22,0.12)',  border: 'rgba(251,146,60,0.25)'  },
  end:       { label: 'End',       icon: CheckSquare,     color: T.muted,   bg: 'rgba(140,136,128,0.1)', border: 'rgba(140,136,128,0.2)'  },
}

const ACTION_OPTIONS = [
  { value: 'book_appointment',       label: 'Book Appointment'         },
  { value: 'cancel_appointment',     label: 'Cancel Appointment'       },
  { value: 'reschedule_appointment', label: 'Reschedule Appointment'   },
]

const VALIDATION_OPTIONS = [
  { value: 'any',    label: 'Any text'          },
  { value: 'text',   label: 'Text'              },
  { value: 'number', label: 'Number'            },
  { value: 'date',   label: 'Date (DD/MM/YYYY)' },
  { value: 'email',  label: 'Email address'     },
  { value: 'phone',  label: 'Phone number'      },
]

// ─── Conversion helpers ───────────────────────────────────────────────────────

function flowNodesToRF(flowNodes: FlowNode[]): { nodes: Node[]; edges: Edge[] } {
  const COLS = 3
  const H_GAP = 280
  const V_GAP = 170

  const rfNodes: Node[] = flowNodes.map((fn, idx) => ({
    id: fn.id,
    type: 'flowNode',
    position: fn.position ?? {
      x: (idx % COLS) * H_GAP + (Math.floor(idx / COLS) % 2 === 0 ? 0 : H_GAP / 2),
      y: Math.floor(idx / COLS) * V_GAP,
    },
    data: { ...fn },
  }))

  const rfEdges: Edge[] = []

  flowNodes.forEach(fn => {
    if (fn.next) {
      rfEdges.push({
        id: `e_${fn.id}_${fn.next}`,
        source: fn.id,
        target: fn.next,
        sourceHandle: 'output',
        markerEnd: { type: MarkerType.ArrowClosed, color: T.gold },
        style: { stroke: T.gold, strokeWidth: 1.5 },
        type: 'smoothstep',
      })
    }
    if (fn.type === 'options' && fn.options) {
      fn.options.forEach((opt, i) => {
        if (opt.next) {
          rfEdges.push({
            id: `e_${fn.id}_opt${i}_${opt.next}`,
            source: fn.id,
            target: opt.next,
            sourceHandle: `option_${i}`,
            label: opt.label,
            labelStyle: { fill: T.muted, fontSize: 10, fontFamily: 'DM Mono' },
            labelBgStyle: { fill: T.cream, stroke: T.border, strokeWidth: 1 },
            labelBgPadding: [4, 6] as [number, number],
            markerEnd: { type: MarkerType.ArrowClosed, color: T.gold },
            style: { stroke: T.gold, strokeWidth: 1.5, strokeDasharray: '4 3' },
            type: 'smoothstep',
          })
        }
      })
    }
  })

  return { nodes: rfNodes, edges: rfEdges }
}

function rfNodesToFlow(rfNodes: Node[], existingFlowNodes: FlowNode[], rfEdges: Edge[]): FlowNode[] {
  const edgeMap = new Map<string, string>()
  const optionEdgeMap = new Map<string, Map<number, string>>()

  rfEdges.forEach(e => {
    if (e.sourceHandle === 'output' || !e.sourceHandle) {
      edgeMap.set(e.source, e.target)
    } else if (e.sourceHandle?.startsWith('option_')) {
      const idx = parseInt(e.sourceHandle.replace('option_', ''))
      if (!optionEdgeMap.has(e.source)) optionEdgeMap.set(e.source, new Map())
      optionEdgeMap.get(e.source)!.set(idx, e.target)
    }
  })

  return rfNodes.map(rfNode => {
    const existing = existingFlowNodes.find(fn => fn.id === rfNode.id)
    const base: FlowNode = existing ? { ...existing } : { ...(rfNode.data as FlowNode) }
    base.position = rfNode.position

    if (base.type !== 'options') {
      base.next = edgeMap.get(base.id) ?? null
    } else {
      base.next = null
      if (base.options) {
        base.options = base.options.map((opt, i) => ({
          ...opt,
          next: optionEdgeMap.get(base.id)?.get(i) ?? opt.next ?? ''
        }))
      }
    }

    return base
  })
}

// ─── Custom ReactFlow node card ───────────────────────────────────────────────

function FlowNodeCard({ data, selected }: NodeProps) {
  const node = data as FlowNode & { onSelect: (n: FlowNode) => void; onDelete: (id: string) => void }
  const cfg = NODE_TYPE_CONFIG[node.type]
  const Icon = cfg.icon

  return (
    <div
      onClick={() => node.onSelect(node)}
      style={{
        background: selected ? T.cream : '#111',
        border: `1.5px solid ${selected ? cfg.color : T.borderStrong}`,
        borderRadius: '10px',
        width: '220px',
        boxShadow: selected
          ? `0 0 0 3px ${cfg.color}22, 0 8px 24px rgba(0,0,0,0.5)`
          : '0 2px 12px rgba(0,0,0,0.5)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        overflow: 'hidden',
        fontFamily: 'DM Sans, sans-serif',
      }}
    >
      {/* Target handle */}
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        style={{
          background: cfg.color, width: 10, height: 10,
          border: `2px solid ${T.paper}`, top: -5
        }}
      />

      {/* Header */}
      <div style={{
        background: cfg.bg,
        padding: '0.5rem 0.75rem',
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        borderBottom: `1px solid ${cfg.border}`
      }}>
        <div style={{
          padding: '0.3rem', borderRadius: '5px',
          background: `${cfg.color}20`, flexShrink: 0
        }}>
          <Icon size={13} color={cfg.color} />
        </div>
        <span style={{
          fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.08em', color: cfg.color, flexGrow: 1,
          fontFamily: 'DM Mono, monospace'
        }}>
          {cfg.label}
        </span>
        <button
          onClick={e => { e.stopPropagation(); node.onDelete(node.id) }}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: '#ef4444', opacity: 0.5, padding: '0.1rem',
            display: 'flex', alignItems: 'center', transition: 'opacity 0.15s'
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '0.65rem 0.8rem' }}>
        {(node.type === 'message' || node.type === 'end') && (
          <p style={{
            fontSize: '0.78rem', color: T.ink, lineHeight: 1.45,
            margin: 0, opacity: node.content ? 1 : 0.35,
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as any
          }}>
            {node.content || 'No message set…'}
          </p>
        )}

        {node.type === 'options' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <p style={{ fontSize: '0.74rem', color: T.muted, margin: 0, marginBottom: '0.25rem', fontStyle: 'italic' }}>
              {node.content || 'Choose an option:'}
            </p>
            {(node.options || []).map((opt, i) => (
              <div key={i} style={{
                fontSize: '0.72rem', padding: '0.2rem 0.5rem',
                background: 'rgba(201,168,76,0.1)',
                border: `1px solid rgba(201,168,76,0.2)`,
                borderRadius: '4px', color: T.goldLight, fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: '0.3rem'
              }}>
                <ChevronRight size={9} color={T.gold} />
                {opt.label || `Option ${i + 1}`}
              </div>
            ))}
          </div>
        )}

        {node.type === 'input' && (
          <div>
            <p style={{ fontSize: '0.78rem', color: T.ink, margin: 0, marginBottom: '0.3rem', opacity: node.content ? 1 : 0.35 }}>
              {node.content || 'No prompt set…'}
            </p>
            {node.variable && (
              <span style={{
                fontSize: '0.68rem', fontFamily: 'DM Mono, monospace',
                background: 'rgba(167,139,250,0.1)', color: '#a78bfa',
                padding: '0.15rem 0.4rem', borderRadius: '4px',
                border: '1px solid rgba(167,139,250,0.25)'
              }}>
                {'→ {{' + node.variable + '}}'}
              </span>
            )}
          </div>
        )}

        {node.type === 'action' && (
          <p style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: 600, margin: 0 }}>
            ⚡ {ACTION_OPTIONS.find(a => a.value === node.action)?.label || node.action}
          </p>
        )}
      </div>

      {/* Source handles */}
      {node.type === 'options' ? (
        (node.options || []).map((_, i) => (
          <Handle
            key={i}
            type="source"
            position={Position.Bottom}
            id={`option_${i}`}
            style={{
              background: T.gold, width: 10, height: 10,
              border: `2px solid ${T.paper}`,
              left: `${((i + 1) / ((node.options?.length || 1) + 1)) * 100}%`,
              bottom: -5
            }}
          />
        ))
      ) : node.type !== 'end' ? (
        <Handle
          type="source"
          position={Position.Bottom}
          id="output"
          style={{
            background: cfg.color, width: 10, height: 10,
            border: `2px solid ${T.paper}`, bottom: -5
          }}
        />
      ) : null}
    </div>
  )
}

const nodeTypes = { flowNode: FlowNodeCard }

// ─── Node Config Panel (right sidebar) ───────────────────────────────────────

function NodeConfigPanel({
  node, allNodes, onChange, onClose, onDelete,
}: {
  node: FlowNode
  allNodes: FlowNode[]
  onChange: (updates: Partial<FlowNode>) => void
  onClose: () => void
  onDelete: (id: string) => void
}) {
  const cfg = NODE_TYPE_CONFIG[node.type]
  const Icon = cfg.icon

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px',
    border: `1px solid ${T.borderStrong}`,
    fontSize: '0.82rem', fontFamily: 'DM Sans',
    color: T.ink, background: T.cream,
    boxSizing: 'border-box', outline: 'none',
  }
  const inputFocusStyle = {
    border: `1px solid ${cfg.color}`,
    boxShadow: `0 0 0 2px ${cfg.color}20`
  }
  const labelStyle: React.CSSProperties = {
    fontSize: '0.7rem', fontWeight: 600, color: T.muted,
    textTransform: 'uppercase', letterSpacing: '0.07em',
    display: 'block', marginBottom: '0.3rem', fontFamily: 'DM Mono, monospace'
  }

  return (
    <div style={{
      position: 'absolute', right: 0, top: 0, bottom: 0, width: '290px',
      background: T.cream,
      borderLeft: `1px solid ${T.borderStrong}`,
      display: 'flex', flexDirection: 'column', zIndex: 20,
      boxShadow: '-8px 0 32px rgba(0,0,0,0.4)'
    }}>
      {/* Header */}
      <div style={{
        padding: '0.85rem 1rem', borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', gap: '0.6rem',
        background: cfg.bg
      }}>
        <div style={{ padding: '0.35rem', borderRadius: '6px', background: `${cfg.color}20` }}>
          <Icon size={14} color={cfg.color} />
        </div>
        <span style={{ fontWeight: 600, fontSize: '0.88rem', flexGrow: 1, color: T.ink, fontFamily: 'DM Sans' }}>
          {cfg.label} Node
        </span>
        <button
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: T.muted, padding: '0.2rem' }}
        >
          <X size={15} />
        </button>
      </div>

      {/* Fields */}
      <div style={{ flexGrow: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {(node.type === 'message' || node.type === 'end') && (
          <div>
            <label style={labelStyle}>{node.type === 'end' ? 'Final Message' : 'Message Text'}</label>
            <textarea
              rows={4}
              value={node.content || ''}
              onChange={e => onChange({ content: e.target.value })}
              placeholder={node.type === 'end'
                ? '✅ Your booking is confirmed! ID: {{appointment_id}}'
                : 'Hello! Welcome 👋\n\nUse {{variable}} for dynamic values.'}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
            <p style={{ fontSize: '0.68rem', color: T.muted, marginTop: '0.35rem', lineHeight: 1.5 }}>
              Use{' '}
              <code style={{
                fontFamily: 'DM Mono, monospace', background: 'rgba(255,255,255,0.06)',
                padding: '0.1rem 0.35rem', borderRadius: '3px', color: T.gold, fontSize: '0.68rem'
              }}>
                {'{{variable}}'}
              </code>{' '}
              to insert collected data.
            </p>
          </div>
        )}

        {node.type === 'options' && (
          <>
            <div>
              <label style={labelStyle}>Prompt text</label>
              <input
                type="text" value={node.content || ''}
                onChange={e => onChange({ content: e.target.value })}
                placeholder="Choose an option:"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Options</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {(node.options || []).map((opt, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <input
                      type="text" value={opt.label}
                      onChange={e => {
                        const opts = [...(node.options || [])]
                        opts[i] = { ...opts[i], label: e.target.value, value: e.target.value.toLowerCase().replace(/\s+/g, '_') }
                        onChange({ options: opts })
                      }}
                      placeholder={`Option ${i + 1}`}
                      style={{ ...inputStyle, flexGrow: 1 }}
                    />
                    <button
                      onClick={() => onChange({ options: (node.options || []).filter((_, j) => j !== i) })}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', opacity: 0.7, padding: '0.25rem' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => onChange({ options: [...(node.options || []), { label: `Option ${(node.options?.length || 0) + 1}`, value: `option_${(node.options?.length || 0) + 1}`, next: '' }] })}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.35rem',
                    padding: '0.4rem 0.7rem', border: `1px dashed ${T.borderStrong}`,
                    borderRadius: '6px', background: 'transparent', color: T.muted,
                    cursor: 'pointer', fontSize: '0.78rem', width: 'fit-content',
                    fontFamily: 'DM Sans'
                  }}
                >
                  <Plus size={12} /> Add Option
                </button>
              </div>
              <p style={{ fontSize: '0.68rem', color: T.muted, marginTop: '0.5rem', lineHeight: 1.5 }}>
                Connect each option to a node by dragging from the bottom handles.
              </p>
            </div>
          </>
        )}

        {node.type === 'input' && (
          <>
            <div>
              <label style={labelStyle}>Question / Prompt</label>
              <input
                type="text" value={node.content || ''}
                onChange={e => onChange({ content: e.target.value })}
                placeholder="Please enter your full name:"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Save answer as variable</label>
              <input
                type="text" value={node.variable || ''}
                onChange={e => onChange({ variable: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                placeholder="customer_name"
                style={{ ...inputStyle, fontFamily: 'DM Mono, monospace', fontSize: '0.8rem' }}
              />
              {node.variable && (
                <p style={{ fontSize: '0.68rem', color: T.muted, marginTop: '0.3rem' }}>
                  Use as{' '}
                  <code style={{ fontFamily: 'DM Mono, monospace', color: '#a78bfa', background: 'rgba(167,139,250,0.1)', padding: '0.1rem 0.3rem', borderRadius: '3px', fontSize: '0.68rem' }}>
                    {`{{${node.variable}}}`}
                  </code>{' '}
                  in later nodes.
                </p>
              )}
            </div>
            <div>
              <label style={labelStyle}>Validation</label>
              <select
                value={node.validation || 'any'}
                onChange={e => onChange({ validation: e.target.value as any })}
                style={{ ...inputStyle, fontFamily: 'DM Mono, monospace', fontSize: '0.8rem' }}
              >
                {VALIDATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </>
        )}

        {node.type === 'action' && (
          <>
            <div>
              <label style={labelStyle}>Action type</label>
              <select
                value={node.action || ''}
                onChange={e => onChange({ action: e.target.value })}
                style={{ ...inputStyle, fontFamily: 'DM Mono, monospace', fontSize: '0.8rem' }}
              >
                {ACTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Parameter mappings</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {Object.entries(node.params || {}).map(([key, val], i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.35rem' }}>
                    <input type="text" value={key} onChange={e => {
                      const p = { ...(node.params || {}) }; const v = p[key]; delete p[key]; p[e.target.value] = v; onChange({ params: p })
                    }} placeholder="param" style={{ ...inputStyle, fontFamily: 'DM Mono, monospace', fontSize: '0.74rem' }} />
                    <input type="text" value={val} onChange={e => {
                      onChange({ params: { ...(node.params || {}), [key]: e.target.value } })
                    }} placeholder="{{var}}" style={{ ...inputStyle, fontFamily: 'DM Mono, monospace', fontSize: '0.74rem' }} />
                    <button onClick={() => { const p = { ...(node.params || {}) }; delete p[key]; onChange({ params: p }) }}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', opacity: 0.7 }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                <button onClick={() => onChange({ params: { ...(node.params || {}), '': '' } })}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.35rem 0.6rem', border: `1px dashed ${T.borderStrong}`, borderRadius: '6px', background: 'transparent', color: T.muted, cursor: 'pointer', fontSize: '0.76rem', width: 'fit-content' }}>
                  <Plus size={11} /> Add Param
                </button>
              </div>
            </div>
          </>
        )}

        {node.type === 'end' && (
          <p style={{ fontSize: '0.78rem', color: T.muted, lineHeight: 1.5 }}>
            This node ends the conversation flow. The message above is sent to the customer as the final reply.
          </p>
        )}
      </div>

      {/* Delete */}
      <div style={{ padding: '0.75rem 1rem', borderTop: `1px solid ${T.border}` }}>
        <button
          onClick={() => { onDelete(node.id); onClose() }}
          style={{
            width: '100%', padding: '0.55rem', borderRadius: '7px',
            border: '1px solid rgba(239,68,68,0.25)',
            background: 'rgba(239,68,68,0.08)', color: '#ef4444',
            cursor: 'pointer', fontSize: '0.82rem', fontWeight: 500,
            fontFamily: 'DM Sans',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
          }}
        >
          <Trash2 size={14} /> Delete Node
        </button>
      </div>
    </div>
  )
}

// ─── Add Node Palette ─────────────────────────────────────────────────────────

function AddNodePalette({ onAdd }: { onAdd: (type: FlowNodeType) => void }) {
  const types: FlowNodeType[] = ['message', 'options', 'input', 'action', 'end']
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '0.35rem',
      background: T.cream,
      border: `1px solid ${T.borderStrong}`,
      borderRadius: '10px', padding: '0.65rem',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      backdropFilter: 'blur(8px)'
    }}>
      <p style={{
        fontSize: '0.63rem', fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.1em', color: T.muted, margin: 0,
        paddingBottom: '0.35rem', borderBottom: `1px solid ${T.border}`,
        fontFamily: 'DM Mono, monospace'
      }}>
        Add Node
      </p>
      {types.map(type => {
        const cfg = NODE_TYPE_CONFIG[type]
        const Icon = cfg.icon
        return (
          <button
            key={type}
            onClick={() => onAdd(type)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.45rem 0.65rem', borderRadius: '6px',
              border: `1px solid ${cfg.border}`,
              background: cfg.bg,
              color: cfg.color, cursor: 'pointer',
              fontSize: '0.78rem', fontWeight: 600, fontFamily: 'DM Sans',
              width: '100%', textAlign: 'left',
              transition: 'all 0.12s'
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = `0 2px 12px ${cfg.color}25` }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
          >
            <Icon size={13} /> {cfg.label}
          </button>
        )
      })}
    </div>
  )
}

// ─── Main FlowCanvas component ────────────────────────────────────────────────

export interface FlowCanvasProps {
  flowNodes: FlowNode[]
  onChange: (nodes: FlowNode[]) => void
  onSave: () => void
  isSaving: boolean
}

export default function FlowCanvas({ flowNodes, onChange, onSave, isSaving }: FlowCanvasProps) {
  const { nodes: initNodes, edges: initEdges } = flowNodesToRF(flowNodes)
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(initNodes)
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(initEdges)
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null)

  useEffect(() => {
    const updated = rfNodesToFlow(rfNodes, flowNodes, rfEdges)
    onChange(updated)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfNodes, rfEdges])

  useEffect(() => {
    const { nodes: n, edges: e } = flowNodesToRF(flowNodes)
    setRfNodes(prev => n.map(newNode => {
      const existing = prev.find(p => p.id === newNode.id)
      return existing ? { ...newNode, position: existing.position } : newNode
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowNodes.length])

  const onConnect = useCallback((connection: Connection) => {
    setRfEdges(prev => addEdge({
      ...connection,
      markerEnd: { type: MarkerType.ArrowClosed, color: T.gold },
      style: { stroke: T.gold, strokeWidth: 1.5 },
      type: 'smoothstep',
    }, prev))
  }, [setRfEdges])

  const handleAddNode = (type: FlowNodeType) => {
    const id = `n_${Math.random().toString(36).slice(2, 9)}`
    const defaults: Record<FlowNodeType, Partial<FlowNode>> = {
      message:   { content: '' },
      options:   { content: 'Choose an option:', options: [{ label: 'Option 1', value: 'option_1', next: '' }] },
      input:     { content: '', variable: '', validation: 'any' },
      action:    { action: 'book_appointment', params: {} },
      condition: { content: '' },
      end:       { content: 'Thank you! Have a great day.' },
    }
    const newNode: Node = {
      id, type: 'flowNode',
      position: { x: 80 + rfNodes.length * 25, y: 60 + rfNodes.length * 30 },
      data: { id, type, next: null, ...defaults[type] },
    }
    setRfNodes(prev => [...prev, newNode])
  }

  const handleDeleteNode = (id: string) => {
    setRfNodes(prev => prev.filter(n => n.id !== id))
    setRfEdges(prev => prev.filter(e => e.source !== id && e.target !== id))
    if (selectedNode?.id === id) setSelectedNode(null)
  }

  const handleNodeChange = (updates: Partial<FlowNode>) => {
    if (!selectedNode) return
    const merged = { ...selectedNode, ...updates }
    setSelectedNode(merged)
    setRfNodes(prev => prev.map(n =>
      n.id === merged.id ? { ...n, data: { ...n.data, ...updates } } : n
    ))
  }

  const enrichedNodes = rfNodes.map(n => ({
    ...n,
    data: {
      ...n.data,
      onSelect: (node: FlowNode) => setSelectedNode(node),
      onDelete: handleDeleteNode,
    },
  }))

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>

      {/* Override ReactFlow's built-in light styles */}
      <style>{`
        .react-flow__renderer { background: ${T.paper} !important; }
        .react-flow__background { background: ${T.paper} !important; }
        .react-flow__controls { background: ${T.cream} !important; border: 1px solid ${T.borderStrong} !important; border-radius: 8px !important; box-shadow: 0 4px 16px rgba(0,0,0,0.4) !important; }
        .react-flow__controls-button { background: ${T.cream} !important; border-bottom: 1px solid ${T.border} !important; color: ${T.muted} !important; fill: ${T.muted} !important; }
        .react-flow__controls-button:hover { background: rgba(201,168,76,0.12) !important; color: ${T.gold} !important; fill: ${T.gold} !important; }
        .react-flow__controls-button svg { fill: ${T.muted}; }
        .react-flow__controls-button:hover svg { fill: ${T.gold}; }
        .react-flow__minimap { background: ${T.cream} !important; border: 1px solid ${T.borderStrong} !important; border-radius: 8px !important; box-shadow: 0 4px 16px rgba(0,0,0,0.4) !important; }
        .react-flow__minimap-mask { fill: ${T.paper} !important; fill-opacity: 0.75 !important; }
        .react-flow__edge-path { stroke: ${T.gold} !important; }
        .react-flow__connection-line { stroke: ${T.gold} !important; stroke-dasharray: 5 3 !important; }
        .react-flow__attribution { display: none !important; }
        .react-flow__panel { box-shadow: none; }
        .react-flow__edge.selected .react-flow__edge-path { stroke: ${T.goldLight} !important; }
      `}</style>

      <ReactFlow
        nodes={enrichedNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        onPaneClick={() => setSelectedNode(null)}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.25}
        maxZoom={2}
        deleteKeyCode="Delete"
        style={{ background: T.paper }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24} size={1}
          color="rgba(255,255,255,0.06)"
          style={{ background: T.paper }}
        />
        <Controls />
        <MiniMap
          nodeColor={n => NODE_TYPE_CONFIG[(n.data as FlowNode).type]?.color ?? T.muted}
          nodeStrokeColor="transparent"
          maskColor={`${T.paper}cc`}
        />

        {/* Add Node palette */}
        <Panel position="top-left">
          <AddNodePalette onAdd={handleAddNode} />
        </Panel>

        {/* Save button */}
        <Panel position="top-right">
          <button
            onClick={onSave}
            disabled={isSaving}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.55rem 1.1rem', borderRadius: '8px',
              background: T.gold, color: '#000',
              border: 'none', cursor: isSaving ? 'not-allowed' : 'pointer',
              fontWeight: 700, fontSize: '0.82rem',
              fontFamily: 'DM Mono, monospace', letterSpacing: '0.06em',
              textTransform: 'uppercase',
              boxShadow: `0 2px 16px rgba(201,168,76,0.35)`,
              opacity: isSaving ? 0.6 : 1,
              transition: 'all 0.15s'
            }}
            onMouseEnter={e => { if (!isSaving) (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 24px rgba(201,168,76,0.55)` }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = `0 2px 16px rgba(201,168,76,0.35)` }}
          >
            <Save size={14} />
            {isSaving ? 'Saving…' : 'Save Flow'}
          </button>
        </Panel>

        {/* Empty state hint */}
        {rfNodes.length === 0 && (
          <Panel position="top-center">
            <div style={{
              padding: '0.75rem 1.25rem',
              background: T.cream,
              border: `1px solid ${T.borderStrong}`,
              borderRadius: '8px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
              color: T.muted,
              fontSize: '0.82rem',
              fontFamily: 'DM Sans'
            }}>
              ← Add nodes from the palette, then drag handles to connect them
            </div>
          </Panel>
        )}
      </ReactFlow>

      {/* Config panel */}
      {selectedNode && (
        <NodeConfigPanel
          node={selectedNode}
          allNodes={flowNodes}
          onChange={handleNodeChange}
          onClose={() => setSelectedNode(null)}
          onDelete={handleDeleteNode}
        />
      )}
    </div>
  )
}
