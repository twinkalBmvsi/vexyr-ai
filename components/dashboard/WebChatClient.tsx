'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Zap, ShoppingBag, AlertCircle, RefreshCw } from 'lucide-react'
import Link from 'next/link'

type Message = {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface WebChatClientProps {
  tenantSlug: string
  agentName: string
  businessName: string
  hasAgent: boolean
  initialRemaining: number | null
  isUnlimited: boolean
  removeBranding?: boolean
}

export default function WebChatClient({
  tenantSlug,
  agentName,
  businessName,
  hasAgent,
  initialRemaining,
  isUnlimited,
  removeBranding = false,
}: WebChatClientProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [remaining, setRemaining] = useState(initialRemaining)
  const [limitReached, setLimitReached] = useState(initialRemaining === 0 && !isUnlimited)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  // Stable session ID per browser tab — used to track this test session in DB
  const sessionId = useRef<string>(
    typeof window !== 'undefined'
      ? (sessionStorage.getItem('vexyr_chat_session') || (() => {
          const id = Math.random().toString(36).substring(2) + Date.now().toString(36)
          sessionStorage.setItem('vexyr_chat_session', id)
          return id
        })())
      : 'default'
  )

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || isLoading || limitReached) return

    const userMessage = input.trim()
    setInput('')
    setIsLoading(true)

    const newMessages: Message[] = [
      ...messages,
      { role: 'user', content: userMessage, timestamp: new Date() }
    ]
    setMessages(newMessages)

    try {
      const res = await fetch(`/api/chat/${tenantSlug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, sessionId: sessionId.current })
      })

      const data = await res.json()

      if (res.status === 429 || data.error === 'limit_reached') {
        setLimitReached(true)
        setRemaining(0)
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: "You've used all 50 free test interactions this month. Purchase the **Unlimited Chats** module from the Store to continue.",
          timestamp: new Date()
        }])
      } else if (data.error) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `⚠️ ${data.error}`,
          timestamp: new Date()
        }])
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.reply,
          timestamp: new Date()
        }])
        if (!isUnlimited && data.remaining !== undefined) {
          setRemaining(data.remaining)
          if (data.remaining === 0) setLimitReached(true)
        }
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Something went wrong. Please try again.',
        timestamp: new Date()
      }])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = () => {
    setMessages([])
  }

  const usedCount = isUnlimited ? 0 : (50 - (remaining ?? 50))
  const usagePercent = isUnlimited ? 0 : Math.min(100, (usedCount / 50) * 100)
  const usageColor = usagePercent >= 90 ? '#ef4444' : usagePercent >= 70 ? '#f59e0b' : 'var(--gold)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '900px' }}>



      {/* No Agent Warning */}
      {!hasAgent && (
        <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '12px', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexShrink: 0 }}>
          <AlertCircle size={20} color="#f59e0b" />
          <div>
            <p style={{ fontWeight: 600, color: '#f59e0b', marginBottom: '0.25rem' }}>No Agent Configured</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
              Create an AI agent first before testing.{' '}
              <Link href={`/${tenantSlug}/agents/new`} style={{ color: 'var(--gold)', textDecoration: 'underline' }}>Create Agent →</Link>
            </p>
          </div>
        </div>
      )}

      {/* Usage Bar */}
      {!isUnlimited && (
        <div className="dash-card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Zap size={14} color={usageColor} />
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink)' }}>Free Interactions</span>
            </div>
            <span style={{ fontSize: '0.8rem', fontFamily: 'DM Mono', color: limitReached ? '#ef4444' : 'var(--muted)' }}>
              {usedCount} / 50 used {remaining !== null && remaining > 0 && `· ${remaining} remaining`}
            </span>
          </div>
          <div style={{ height: '6px', background: 'var(--border)', borderRadius: '999px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${usagePercent}%`, background: usageColor, borderRadius: '999px', transition: 'width 0.4s ease' }} />
          </div>
          {limitReached && (
            <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <p style={{ fontSize: '0.8rem', color: '#ef4444' }}>Monthly limit reached. Upgrade to continue.</p>
              <Link href={`/${tenantSlug}/store`} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--gold)', textDecoration: 'none', fontWeight: 600 }}>
                <ShoppingBag size={13} /> Go to Store
              </Link>
            </div>
          )}
        </div>
      )}

      {isUnlimited && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem', background: 'rgba(42,122,74,0.08)', border: '1px solid rgba(42,122,74,0.2)', borderRadius: '8px', marginBottom: '1.5rem', flexShrink: 0 }}>
          <Zap size={14} color="#2a7a4a" />
          <span style={{ fontSize: '0.8rem', color: '#2a7a4a', fontWeight: 600 }}>Unlimited Chats active — no interaction limits.</span>
        </div>
      )}

      {/* Chat Window */}
      <div className="dash-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>

        {/* Agent Bar */}
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(201,168,76,0.3), rgba(201,168,76,0.1))', border: '1px solid rgba(201,168,76,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bot size={18} color="var(--gold)" />
          </div>
          <div>
            <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--ink)' }}>{agentName}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{businessName} · Web Test Chat</p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <button
              onClick={clearChat}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'inherit', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
              title="New Conversation"
            >
              <RefreshCw size={13} />
              <span>Reset</span>
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: hasAgent ? '#2a7a4a' : '#6b7280', boxShadow: hasAgent ? '0 0 6px #2a7a4a' : 'none' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{hasAgent ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.75rem', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-end' }}>
              {/* Avatar */}
              <div style={{ width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0, background: msg.role === 'assistant' ? 'linear-gradient(135deg, rgba(201,168,76,0.3), rgba(201,168,76,0.1))' : 'rgba(255,255,255,0.06)', border: `1px solid ${msg.role === 'assistant' ? 'rgba(201,168,76,0.3)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {msg.role === 'assistant' ? <Bot size={15} color="var(--gold)" /> : <User size={15} color="var(--muted)" />}
              </div>

              {/* Bubble */}
              <div style={{ maxWidth: '70%', display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: '0.3rem' }}>
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: msg.role === 'user' ? 'linear-gradient(135deg, rgba(201,168,76,0.25), rgba(201,168,76,0.12))' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${msg.role === 'user' ? 'rgba(201,168,76,0.3)' : 'var(--border)'}`,
                  fontSize: '0.88rem',
                  lineHeight: 1.55,
                  color: 'var(--ink)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {msg.content}
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--muted)', paddingInline: '0.25rem' }}>
                  {msg.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isLoading && (
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(201,168,76,0.3), rgba(201,168,76,0.1))', border: '1px solid rgba(201,168,76,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={15} color="var(--gold)" />
              </div>
              <div style={{ padding: '0.75rem 1.1rem', borderRadius: '18px 18px 18px 4px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', display: 'flex', gap: '5px', alignItems: 'center' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--muted)', animation: `typing-dot 1.2s ${i * 0.2}s infinite ease-in-out` }} />
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.75rem', alignItems: 'center', flexShrink: 0 }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading || limitReached || !hasAgent}
            placeholder={
              !hasAgent ? 'Create an agent first...' :
              limitReached ? 'Monthly limit reached — upgrade to continue' :
              `Message ${agentName}...`
            }
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              background: 'rgba(255,255,255,0.03)',
              color: 'var(--ink)',
              fontSize: '0.9rem',
              fontFamily: 'inherit',
              outline: 'none',
              opacity: (limitReached || !hasAgent) ? 0.5 : 1,
              transition: 'border-color 0.2s'
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.5)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim() || limitReached || !hasAgent}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              border: 'none',
              background: (!input.trim() || isLoading || limitReached || !hasAgent) ? 'rgba(201,168,76,0.15)' : 'linear-gradient(135deg, var(--gold), #b8922a)',
              color: (!input.trim() || isLoading || limitReached || !hasAgent) ? 'rgba(201,168,76,0.4)' : '#1a1508',
              cursor: (!input.trim() || isLoading || limitReached || !hasAgent) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              flexShrink: 0
            }}
          >
            <Send size={18} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes typing-dot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
