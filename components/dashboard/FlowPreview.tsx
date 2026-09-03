'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { RotateCcw, Play, Send, Phone, Video, MoreVertical, Wifi, Battery, Signal } from 'lucide-react'
import type { FlowNode } from '@/utils/flowEngine'

// ─── Types ─────────────────────────────────────────────────────────────────────

type ChatMessage = {
  id: string
  role: 'bot' | 'user' | 'system'
  content: string
  quickReplies?: string[]
  timestamp: Date
  nodeType?: string
  isTyping?: boolean
}

type WaitingState =
  | { for: 'none' }
  | { for: 'options'; options: { label: string; value: string; next: string }[]; nodeId: string }
  | { for: 'input'; nodeId: string; variable: string; next: string | null }

type SimState = {
  messages: ChatMessage[]
  waitingState: WaitingState
  collectedData: Record<string, string>
  visitedNodeId: string | null
  isRunning: boolean
}

type ChannelType = 'whatsapp' | 'telegram'

// ─── Constants ─────────────────────────────────────────────────────────────────

const CHANNEL_CONFIG: Record<ChannelType, { name: string; headerBg: string; userBubble: string; userText: string; headerText: string; inputBg: string }> = {
  whatsapp: {
    name: 'WhatsApp',
    headerBg: '#075e54',
    userBubble: '#dcf8c6',
    userText: '#111',
    headerText: '#fff',
    inputBg: '#f0f0f0',
  },
  telegram: {
    name: 'Telegram',
    headerBg: '#2ca5e0',
    userBubble: '#effdde',
    userText: '#111',
    headerText: '#fff',
    inputBg: '#f0f0f0',
  }
}

const BOT_AVATAR_COLORS: Record<ChannelType, string> = {
  whatsapp: '#25d366',
  telegram: '#2ca5e0'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genId() {
  return Math.random().toString(36).slice(2, 9)
}

function interpolate(text: string, data: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    if (k === 'appointment_id') return 'APT-' + Math.floor(Math.random() * 9000 + 1000)
    return data[k] ?? `[${k}]`
  })
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}

// Action display names
const ACTION_LABELS: Record<string, string> = {
  book_appointment: '📅 Booking appointment...',
  cancel_appointment: '❌ Cancelling appointment...',
  reschedule_appointment: '🔄 Rescheduling appointment...',
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface FlowPreviewProps {
  nodes: FlowNode[]
  flowName?: string
  triggerKeyword?: string
}

export default function FlowPreview({ nodes, flowName = 'Flow Preview', triggerKeyword }: FlowPreviewProps) {
  const [channel, setChannel] = useState<ChannelType>('whatsapp')
  const [simState, setSimState] = useState<SimState>({
    messages: [],
    waitingState: { for: 'none' },
    collectedData: {},
    visitedNodeId: null,
    isRunning: false
  })
  const [inputText, setInputText] = useState('')
  const [collectedVars, setCollectedVars] = useState<Record<string, string>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const cfg = CHANNEL_CONFIG[channel]

  // Build node map from current nodes prop
  const nodeMap = useRef(new Map<string, FlowNode>())
  useEffect(() => {
    nodeMap.current = new Map(nodes.map(n => [n.id, n]))
  }, [nodes])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [simState.messages])

  // ── Simulation engine ────────────────────────────────────────────────────────

  const addMessage = useCallback((msg: Omit<ChatMessage, 'id' | 'timestamp'>, stateUpdater: (prev: SimState) => SimState) => {
    const newMsg: ChatMessage = { ...msg, id: genId(), timestamp: new Date() }
    setSimState(prev => {
      const next = stateUpdater(prev)
      return { ...next, messages: [...next.messages, newMsg] }
    })
    return newMsg
  }, [])

  const addTypingIndicator = useCallback((): Promise<void> => {
    return new Promise(resolve => {
      const typingMsg: ChatMessage = {
        id: genId(), role: 'bot', content: '', isTyping: true, timestamp: new Date()
      }
      setSimState(prev => ({ ...prev, messages: [...prev.messages, typingMsg] }))
      setTimeout(() => {
        setSimState(prev => ({
          ...prev,
          messages: prev.messages.filter(m => !m.isTyping)
        }))
        resolve()
      }, 600 + Math.random() * 400)
    })
  }, [])

  const executeNode = useCallback(async (nodeId: string, data: Record<string, string>): Promise<void> => {
    const node = nodeMap.current.get(nodeId)
    if (!node) {
      await addTypingIndicator()
      setSimState(prev => ({
        ...prev,
        messages: [...prev.messages, { id: genId(), role: 'system', content: '✅ Flow completed.', timestamp: new Date() }],
        waitingState: { for: 'none' },
        isRunning: false,
        visitedNodeId: null
      }))
      return
    }

    switch (node.type) {
      case 'message': {
        await addTypingIndicator()
        const text = interpolate(node.content || '(empty message)', data)
        setSimState(prev => ({
          ...prev,
          messages: [...prev.messages, { id: genId(), role: 'bot', content: text, timestamp: new Date(), nodeType: 'message' }],
          visitedNodeId: node.id
        }))
        // Auto-advance after short delay
        if (node.next) {
          setTimeout(() => executeNode(node.next!, data), 500)
        } else {
          setSimState(prev => ({
            ...prev,
            messages: [...prev.messages, { id: genId(), role: 'system', content: '✅ Flow completed.', timestamp: new Date() }],
            waitingState: { for: 'none' },
            isRunning: false
          }))
        }
        break
      }

      case 'options': {
        await addTypingIndicator()
        const prompt = interpolate(node.content || 'Choose an option:', data)
        const opts = node.options || []
        setSimState(prev => ({
          ...prev,
          messages: [...prev.messages, {
            id: genId(), role: 'bot', content: prompt,
            quickReplies: opts.map(o => o.label),
            timestamp: new Date(), nodeType: 'options'
          }],
          waitingState: { for: 'options', options: opts, nodeId: node.id },
          visitedNodeId: node.id
        }))
        break
      }

      case 'input': {
        await addTypingIndicator()
        const prompt = interpolate(node.content || 'Please provide your answer:', data)
        setSimState(prev => ({
          ...prev,
          messages: [...prev.messages, {
            id: genId(), role: 'bot', content: prompt,
            timestamp: new Date(), nodeType: 'input'
          }],
          waitingState: { for: 'input', nodeId: node.id, variable: node.variable || '', next: node.next ?? null },
          visitedNodeId: node.id
        }))
        setTimeout(() => inputRef.current?.focus(), 100)
        break
      }

      case 'action': {
        await addTypingIndicator()
        const label = ACTION_LABELS[node.action || ''] || `⚡ Running: ${node.action}...`
        setSimState(prev => ({
          ...prev,
          messages: [...prev.messages, { id: genId(), role: 'bot', content: label, timestamp: new Date(), nodeType: 'action' }],
          visitedNodeId: node.id
        }))

        // Simulate action success with fake data
        const mockResult: Record<string, string> = {
          appointment_id: 'APT-' + Math.floor(Math.random() * 9000 + 1000),
          ...data
        }
        setCollectedVars(mockResult)

        // Short delay to "simulate" the action running
        setTimeout(async () => {
          const successMsg = node.action === 'book_appointment'
            ? `✅ Appointment booked! ID: ${mockResult.appointment_id}`
            : node.action === 'cancel_appointment'
            ? '✅ Appointment cancelled successfully.'
            : '✅ Appointment rescheduled successfully.'

          setSimState(prev => ({
            ...prev,
            messages: [...prev.messages, { id: genId(), role: 'system', content: successMsg, timestamp: new Date() }],
            collectedData: mockResult
          }))

          if (node.next) {
            await executeNode(node.next, mockResult)
          } else {
            setSimState(prev => ({
              ...prev,
              messages: [...prev.messages, { id: genId(), role: 'system', content: '✅ Flow completed.', timestamp: new Date() }],
              waitingState: { for: 'none' },
              isRunning: false
            }))
          }
        }, 1200)
        break
      }

      case 'end': {
        await addTypingIndicator()
        const text = interpolate(node.content || 'Thank you! Have a great day.', data)
        setSimState(prev => ({
          ...prev,
          messages: [...prev.messages, { id: genId(), role: 'bot', content: text, timestamp: new Date(), nodeType: 'end' }],
          waitingState: { for: 'none' },
          isRunning: false,
          visitedNodeId: node.id
        }))
        break
      }

      default:
        if (node.next) executeNode(node.next, data)
    }
  }, [addTypingIndicator])

  // ── Start simulation ─────────────────────────────────────────────────────────

  const startSimulation = useCallback(() => {
    if (nodes.length === 0) return
    setInputText('')
    setCollectedVars({})
    setSimState({
      messages: [],
      waitingState: { for: 'none' },
      collectedData: {},
      visitedNodeId: nodes[0].id,
      isRunning: true
    })
    setTimeout(() => executeNode(nodes[0].id, {}), 200)
  }, [nodes, executeNode])

  // ── Handle user input ────────────────────────────────────────────────────────

  const handleSend = useCallback((text?: string) => {
    const msgText = (text ?? inputText).trim()
    if (!msgText) return

    const { waitingState, collectedData } = simState
    if (waitingState.for === 'none') return

    // Add user message
    const userMsg: ChatMessage = { id: genId(), role: 'user', content: msgText, timestamp: new Date() }
    setInputText('')

    if (waitingState.for === 'options') {
      const { options } = waitingState
      const matched = options.find(o =>
        msgText.toLowerCase() === o.label.toLowerCase() ||
        msgText.toLowerCase() === o.value.toLowerCase() ||
        o.label.toLowerCase().includes(msgText.toLowerCase())
      ) || (() => {
        const num = parseInt(msgText)
        if (!isNaN(num) && num >= 1 && num <= options.length) return options[num - 1]
        return null
      })()

      setSimState(prev => ({
        ...prev,
        messages: [...prev.messages, userMsg],
        waitingState: { for: 'none' }
      }))

      if (matched) {
        const newData = { ...collectedData }
        setTimeout(() => {
          if (matched.next) executeNode(matched.next, newData)
          else {
            setSimState(prev => ({
              ...prev,
              messages: [...prev.messages, { id: genId(), role: 'system', content: '✅ Flow completed.', timestamp: new Date() }],
              waitingState: { for: 'none' },
              isRunning: false
            }))
          }
        }, 100)
      } else {
        setTimeout(() => {
          setSimState(prev => ({
            ...prev,
            messages: [...prev.messages, {
              id: genId(), role: 'bot',
              content: `Please choose one of the options:\n${options.map((o, i) => `${i + 1}. ${o.label}`).join('\n')}`,
              quickReplies: options.map(o => o.label),
              timestamp: new Date()
            }],
            waitingState: waitingState
          }))
        }, 200)
      }
    } else if (waitingState.for === 'input') {
      const { variable, next } = waitingState
      const newData = { ...collectedData, [variable]: msgText }
      setSimState(prev => ({
        ...prev,
        messages: [...prev.messages, userMsg],
        collectedData: newData,
        waitingState: { for: 'none' }
      }))
      setCollectedVars(newData)
      setTimeout(() => {
        if (next) executeNode(next, newData)
        else {
          setSimState(prev => ({
            ...prev,
            messages: [...prev.messages, { id: genId(), role: 'system', content: '✅ Flow completed.', timestamp: new Date() }],
            isRunning: false
          }))
        }
      }, 100)
    }
  }, [simState, inputText, executeNode])

  const isWaiting = simState.waitingState.for !== 'none'
  const hasStarted = simState.isRunning || simState.messages.length > 0

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>

      {/* Channel Selector + Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {(['whatsapp', 'telegram'] as ChannelType[]).map(ch => (
            <button
              key={ch}
              onClick={() => setChannel(ch)}
              style={{
                padding: '0.3rem 0.8rem', borderRadius: '20px', border: 'none', cursor: 'pointer',
                fontSize: '0.76rem', fontWeight: 500, fontFamily: 'DM Sans',
                background: channel === ch ? CHANNEL_CONFIG[ch].headerBg : 'var(--paper)',
                color: channel === ch ? '#fff' : 'var(--muted)',
                transition: 'all 0.15s ease'
              }}
            >
              {ch === 'whatsapp' ? '💬 WhatsApp' : '✈️ Telegram'}
            </button>
          ))}
        </div>
        <button
          onClick={startSimulation}
          disabled={nodes.length === 0}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.35rem 0.85rem', borderRadius: '8px', border: 'none', cursor: nodes.length === 0 ? 'not-allowed' : 'pointer',
            background: 'rgba(201,168,76,0.1)', color: 'var(--gold)',
            fontSize: '0.78rem', fontWeight: 500, opacity: nodes.length === 0 ? 0.4 : 1,
            transition: 'all 0.15s'
          }}
        >
          {hasStarted ? <RotateCcw size={13} /> : <Play size={13} />}
          {hasStarted ? 'Restart' : 'Simulate'}
        </button>
      </div>

      {/* Phone mockup container */}
      <div style={{ padding: '0.5rem', height: '100%', display: 'flex', justifyContent: 'center' }}>
        <div style={{
          width: '100%',
          maxWidth: '360px',
          borderRadius: '40px',
          overflow: 'hidden',
          border: '14px solid #1a1a1a',
          background: '#e5ddd5',
          boxShadow: '0 12px 40px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.1)',
          display: 'flex', flexDirection: 'column',
          position: 'relative',
          userSelect: 'none'
        }}>
          {/* Hardware Notch */}
          <div style={{
            position: 'absolute', top: '-1px', left: '50%', transform: 'translateX(-50%)',
            width: '130px', height: '28px', background: '#1a1a1a',
            borderBottomLeftRadius: '18px', borderBottomRightRadius: '18px',
            zIndex: 10,
            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px'
          }}>
            {/* Camera dot */}
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0a0a0a', border: '1px solid #222' }} />
            {/* Speaker slot */}
            <div style={{ width: '40px', height: '4px', borderRadius: '4px', background: '#0a0a0a' }} />
          </div>

          {/* Status bar */}
          <div style={{
            background: cfg.headerBg,
            padding: '0.4rem 1.2rem',
            paddingTop: '0.6rem', // extra space for notch area
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            position: 'relative', zIndex: 5
          }}>
            <span style={{ fontSize: '0.68rem', color: cfg.headerText, fontFamily: 'DM Mono', fontWeight: 600 }}>
              {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </span>
            <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
              <Signal size={12} color={cfg.headerText} />
              <Wifi size={12} color={cfg.headerText} />
              <Battery size={13} color={cfg.headerText} />
            </div>
          </div>

        {/* Chat header */}
        <div style={{
          background: cfg.headerBg,
          padding: '0.6rem 1rem 0.8rem',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
        }}>
          {/* Avatar */}
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: BOT_AVATAR_COLORS[channel],
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1rem', flexShrink: 0
          }}>
            🤖
          </div>
          <div style={{ flexGrow: 1 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: cfg.headerText, lineHeight: 1 }}>
              {flowName}
            </div>
            <div style={{ fontSize: '0.68rem', color: `${cfg.headerText}aa`, marginTop: '0.15rem' }}>
              {simState.isRunning ? '● online' : 'FlowForge Bot'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Phone size={16} color={cfg.headerText} />
            <Video size={16} color={cfg.headerText} />
            <MoreVertical size={16} color={cfg.headerText} />
          </div>
        </div>

        {/* Messages area */}
        <div style={{
          flexGrow: 1, overflowY: 'auto',
          minHeight: '380px', maxHeight: '500px',
          padding: '0.75rem',
          display: 'flex', flexDirection: 'column', gap: '0.5rem',
          background: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E") #e5ddd5`
        }}>
          {/* Empty state */}
          {simState.messages.length === 0 && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '3rem 1rem', gap: '0.75rem', opacity: 0.5
            }}>
              <div style={{ fontSize: '2.5rem' }}>💬</div>
              <p style={{ fontSize: '0.78rem', color: '#555', textAlign: 'center', lineHeight: 1.4 }}>
                {nodes.length === 0
                  ? 'Add nodes to your flow, then click Simulate'
                  : `Click Simulate to preview your flow${triggerKeyword ? ` (trigger: "${triggerKeyword}")` : ''}`}
              </p>
            </div>
          )}

          {/* Chat messages */}
          {simState.messages.map((msg, idx) => {
            if (msg.isTyping) {
              return (
                <div key={msg.id} style={{ display: 'flex', alignItems: 'flex-end', gap: '0.4rem' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: BOT_AVATAR_COLORS[channel], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', flexShrink: 0 }}>🤖</div>
                  <div style={{
                    padding: '0.5rem 0.8rem', borderRadius: '12px', borderBottomLeftRadius: '3px',
                    background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                  }}>
                    <TypingDots />
                  </div>
                </div>
              )
            }

            if (msg.role === 'system') {
              return (
                <div key={msg.id} style={{ display: 'flex', justifyContent: 'center', padding: '0.25rem 0' }}>
                  <span style={{
                    padding: '0.25rem 0.75rem', borderRadius: '10px',
                    background: 'rgba(0,0,0,0.12)', color: '#333',
                    fontSize: '0.72rem', fontWeight: 500
                  }}>
                    {msg.content}
                  </span>
                </div>
              )
            }

            const isBot = msg.role === 'bot'
            return (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isBot ? 'flex-start' : 'flex-end', gap: '0.25rem' }}>
                {isBot && (
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.4rem' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: BOT_AVATAR_COLORS[channel], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', flexShrink: 0 }}>🤖</div>
                    <div>
                      <div style={{
                        maxWidth: '220px', padding: '0.5rem 0.8rem', borderRadius: '12px', borderBottomLeftRadius: '3px',
                        background: '#fff', color: '#111',
                        fontSize: '0.82rem', lineHeight: 1.45,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)', whiteSpace: 'pre-wrap', wordBreak: 'break-word'
                      }}>
                        {msg.content}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: '#999', marginTop: '0.15rem', paddingLeft: '0.2rem' }}>
                        {formatTime(msg.timestamp)}
                      </div>
                    </div>
                  </div>
                )}
                {!isBot && (
                  <div>
                    <div style={{
                      maxWidth: '220px', padding: '0.5rem 0.8rem', borderRadius: '12px', borderBottomRightRadius: '3px',
                      background: cfg.userBubble, color: cfg.userText,
                      fontSize: '0.82rem', lineHeight: 1.45,
                      boxShadow: '0 1px 2px rgba(0,0,0,0.1)', wordBreak: 'break-word'
                    }}>
                      {msg.content}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#999', marginTop: '0.15rem', paddingRight: '0.2rem', textAlign: 'right' }}>
                      {formatTime(msg.timestamp)} ✓✓
                    </div>
                  </div>
                )}

                {/* Quick reply buttons (only for the last options message) */}
                {isBot && msg.quickReplies && simState.waitingState.for === 'options' && idx === simState.messages.length - 1 && (
                  <div style={{ paddingLeft: '32px', display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.15rem', maxWidth: '260px' }}>
                    {msg.quickReplies.map((qr, qi) => (
                      <button
                        key={qi}
                        onClick={() => handleSend(qr)}
                        style={{
                          padding: '0.35rem 0.8rem', borderRadius: '20px',
                          border: `1.5px solid ${cfg.headerBg}`,
                          background: 'rgba(255,255,255,0.9)', color: cfg.headerBg,
                          fontSize: '0.76rem', cursor: 'pointer', fontWeight: 500,
                          transition: 'all 0.1s'
                        }}
                        onMouseEnter={e => {
                          (e.target as HTMLButtonElement).style.background = cfg.headerBg;
                          (e.target as HTMLButtonElement).style.color = '#fff'
                        }}
                        onMouseLeave={e => {
                          (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.9)';
                          (e.target as HTMLButtonElement).style.color = cfg.headerBg
                        }}
                      >
                        {qr}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <div style={{
          background: cfg.inputBg, padding: '0.5rem 0.6rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          borderTop: '1px solid rgba(0,0,0,0.08)'
        }}>
          <input
            ref={inputRef}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            disabled={!isWaiting}
            placeholder={
              !hasStarted ? 'Click Simulate ▶ to start'
              : !isWaiting ? 'Waiting for bot...'
              : simState.waitingState.for === 'options' ? 'Tap an option above or type 1, 2...'
              : 'Type your response...'
            }
            style={{
              flexGrow: 1, padding: '0.5rem 0.75rem', borderRadius: '20px',
              border: 'none', background: '#fff',
              fontSize: '0.82rem', outline: 'none', color: '#111',
              opacity: isWaiting ? 1 : 0.6,
              cursor: isWaiting ? 'text' : 'default'
            }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!isWaiting || !inputText.trim()}
            style={{
              width: '34px', height: '34px', borderRadius: '50%',
              background: isWaiting && inputText.trim() ? cfg.headerBg : '#ccc',
              border: 'none', cursor: isWaiting && inputText.trim() ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s', flexShrink: 0
            }}
          >
            <Send size={15} color="#fff" />
          </button>
        </div>
      </div>
      </div>

      {/* Collected Variables Panel */}
      {Object.keys(collectedVars).length > 0 && (
        <div style={{
          padding: '0.75rem 1rem', background: 'rgba(16,185,129,0.05)',
          border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px'
        }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 600, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
            Collected Data
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {Object.entries(collectedVars).filter(([k]) => !k.startsWith('__')).map(([key, val]) => (
              <div key={key} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.78rem', fontFamily: 'DM Mono' }}>
                <span style={{ color: 'var(--muted)', minWidth: '120px' }}>{'{{' + key + '}}'}</span>
                <span style={{ color: 'var(--ink)', fontWeight: 500 }}>→ {val}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Typing Dots Animation ────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: '3px', alignItems: 'center', padding: '0.1rem 0.2rem' }}>
      {[0, 1, 2].map(i => (
        <div
          key={i}
          style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: '#aaa',
            animation: `typingBounce 1.2s infinite ease-in-out`,
            animationDelay: `${i * 0.2}s`
          }}
        />
      ))}
      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
