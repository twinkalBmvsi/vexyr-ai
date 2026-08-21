'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { getConversations, getMessages } from '@/app/actions/inbox'
import { Bot, User, MessageCircle, Clock, CheckCircle2 } from 'lucide-react'

export default function InboxClient({ tenantId }: { tenantId: string }) {
  const [conversations, setConversations] = useState<any[]>([])
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  
  const supabase = createClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchConversations()

    // Subscribe to new messages for this tenant
    const channel = supabase.channel('realtime:messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const newMsg = payload.new
          
          // If the new message belongs to the active conversation, add it to the view
          setActiveConvId((currentActiveId) => {
            if (currentActiveId === newMsg.conversation_id) {
              setMessages((prev) => [...prev, newMsg])
              scrollToBottom()
            }
            return currentActiveId
          })

          // Optional: You could update the conversation list here to show a "new" indicator
          // or bump it to the top.
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tenantId])

  useEffect(() => {
    if (activeConvId) {
      fetchMessages(activeConvId)
    }
  }, [activeConvId])

  const fetchConversations = async () => {
    setIsLoading(true)
    const { data } = await getConversations(tenantId)
    if (data) {
      setConversations(data)
    }
    setIsLoading(false)
  }

  const fetchMessages = async (convId: string) => {
    setIsLoadingMessages(true)
    const { data } = await getMessages(tenantId, convId)
    if (data) {
      setMessages(data)
      scrollToBottom()
    }
    setIsLoadingMessages(false)
  }

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  const activeConv = conversations.find(c => c.id === activeConvId)
  const activeChatCount = conversations.filter(c => c.status === 'active').length

  return (
    <div style={{ display: 'flex', height: '100%', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', background: 'var(--paper)', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
      
      {/* Left Panel: Conversation List */}
      <div style={{ width: '350px', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--dark)' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <h3 style={{ margin: 0, color: 'var(--ink)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MessageCircle size={18} color="var(--gold)" />
            Chats
          </h3>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: 'var(--muted)' }}>
            <span style={{ color: '#10b981' }}>●</span> {activeChatCount} Active / {conversations.length} Total
          </p>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {isLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>Loading chats...</div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>No chats yet.</div>
          ) : (
            conversations.map((conv) => (
              <div 
                key={conv.id}
                onClick={() => setActiveConvId(conv.id)}
                style={{
                  padding: '1rem',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  cursor: 'pointer',
                  background: activeConvId === conv.id ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
                  borderLeft: activeConvId === conv.id ? '3px solid var(--gold)' : '3px solid transparent',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--ink)', fontSize: '0.95rem' }}>
                    {conv.customer?.name || conv.customer?.phone || 'Unknown User'}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                    {new Date(conv.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Bot size={12} color="var(--gold)" /> {conv.agent?.name || 'AI Agent'}
                  </span>
                  <span style={{ 
                    color: conv.status === 'active' ? '#10b981' : 'var(--muted)',
                    fontSize: '0.7rem',
                    textTransform: 'uppercase'
                  }}>
                    {conv.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Panel: Chat UI */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--dark-muted)' }}>
        {activeConvId ? (
          <>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--dark)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, color: 'var(--ink)', fontSize: '1.1rem' }}>
                  {activeConv?.customer?.name || activeConv?.customer?.phone || 'Customer'}
                </h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--muted)', display: 'flex', gap: '1rem' }}>
                  <span>{activeConv?.customer?.channel || 'Unknown Channel'}</span>
                  <span>|</span>
                  <span>Agent: {activeConv?.agent?.name || 'AI'}</span>
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <span className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', cursor: 'default' }}>
                  {activeConv?.status === 'active' ? 'Active Chat' : 'Closed'}
                </span>
                <button className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} disabled>
                  Takeover (Coming Soon)
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {isLoadingMessages ? (
                <div style={{ textAlign: 'center', color: 'var(--muted)' }}>Loading messages...</div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--muted)' }}>No messages yet.</div>
              ) : (
                messages.map((msg, idx) => {
                  const isAgent = msg.sender_type === 'agent' || msg.sender_type === 'assistant'
                  return (
                    <div key={idx} style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isAgent ? 'flex-end' : 'flex-start',
                      width: '100%'
                    }}>
                      <div style={{
                        maxWidth: '70%',
                        background: isAgent ? 'var(--dark)' : 'rgba(212, 175, 55, 0.15)',
                        border: isAgent ? '1px solid var(--border)' : '1px solid rgba(212, 175, 55, 0.3)',
                        padding: '0.8rem 1rem',
                        borderRadius: '12px',
                        borderBottomRightRadius: isAgent ? '2px' : '12px',
                        borderBottomLeftRadius: !isAgent ? '2px' : '12px',
                        color: 'var(--ink)'
                      }}>
                        <p style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.95rem', lineHeight: 1.5 }}>
                          {msg.content}
                        </p>
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        {isAgent ? <Bot size={10} /> : <User size={10} />}
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Takeover Input area (disabled for now) */}
            <div style={{ padding: '1rem 1.5rem', background: 'var(--dark)', borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <input 
                  type="text" 
                  disabled 
                  placeholder="Human takeover is currently disabled. You are in watch-only mode."
                  style={{ 
                    flex: 1, 
                    background: 'var(--dark-muted)', 
                    border: '1px solid var(--border)', 
                    padding: '0.8rem 1rem', 
                    borderRadius: '8px',
                    color: 'var(--muted)',
                    cursor: 'not-allowed'
                  }}
                />
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
            <MessageCircle size={48} color="var(--border)" style={{ marginBottom: '1rem' }} />
            <h3>Select a conversation to view</h3>
            <p>Monitor real-time chats as they happen.</p>
          </div>
        )}
      </div>
    </div>
  )
}
