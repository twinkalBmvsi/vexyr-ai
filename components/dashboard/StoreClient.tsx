'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { Bot, MessageSquare, Mail, CalendarSync, Zap, CheckCircle2, ShoppingCart, Megaphone, Star, BarChart, LineChart, PieChart, EyeOff } from 'lucide-react'

type ModuleConfig = {
  extraBots: number;
  whatsappChannel: boolean;
  telegramChannel: boolean;
  customEmails: boolean;
  autoFollowups: boolean;
  unlimitedChats: boolean;
  calendarSync: boolean;
  broadcastMessaging: boolean;
  reputationManagement: boolean;
  metaAds: boolean;
  googleAds: boolean;
  telegramAds: boolean;
  removeBranding: boolean;
}

export default function StoreClient({ tenantId, tenantSlug, currentModules, stripePrices, agents = [] }: { tenantId: string, tenantSlug: string, currentModules: any, stripePrices: any[], agents?: any[] }) {
  type ModuleSelection = {
    selected: boolean;
    months: number;
    quantity: number;
  }

  const [cart, setCart] = useState<Record<string, ModuleSelection>>({
    extraBots: { selected: false, months: 1, quantity: 0 },
    whatsappChannel: { selected: false, months: 1, quantity: 1 },
    telegramChannel: { selected: false, months: 1, quantity: 1 },
    customEmails: { selected: false, months: 1, quantity: 1 },
    autoFollowups: { selected: false, months: 1, quantity: 1 },
    unlimitedChats: { selected: false, months: 1, quantity: 1 },
    calendarSync: { selected: false, months: 1, quantity: 1 },
    broadcastMessaging: { selected: false, months: 1, quantity: 1 },
    reputationManagement: { selected: false, months: 1, quantity: 1 },
    metaAds: { selected: false, months: 1, quantity: 1 },
    googleAds: { selected: false, months: 1, quantity: 1 },
    telegramAds: { selected: false, months: 1, quantity: 1 },
    removeBranding: { selected: false, months: 1, quantity: 1 },
  })

  const [extendBots, setExtendBots] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [showLicensesModal, setShowLicensesModal] = useState(false)

  let activeAgentCount = 0
  const eb = currentModules?.extraBots
  
  const activeBotLicenses: { agentId: string, agentName: string, quantity: number, expiresAt: string }[] = []
  
  if (eb?.assigned_slots !== undefined || eb?.unassigned_slots !== undefined) {
    const activeAssigned = Object.entries(eb.assigned_slots || {}).filter(([id, slot]: [string, any]) => slot.expires_at && new Date(slot.expires_at) > new Date())
    activeAgentCount = activeAssigned.length + (eb.unassigned_slots || []).filter((slot: any) => slot.expires_at && new Date(slot.expires_at) > new Date()).length
    
    activeAssigned.forEach(([id, slot]: [string, any]) => {
      const agentRecord = agents.find(a => a.id === id)
      activeBotLicenses.push({
        agentId: id,
        agentName: agentRecord?.name || 'Unknown Agent',
        quantity: 1,
        expiresAt: slot.expires_at
      })
    })

    ;(eb.unassigned_slots || []).forEach((slot: any, index: number) => {
      if (slot.expires_at && new Date(slot.expires_at) > new Date()) {
         activeBotLicenses.push({
           agentId: `unassigned_${index}`,
           agentName: 'Unassigned License (Ready to use)',
           quantity: 1,
           expiresAt: slot.expires_at
         })
      }
    })
  } else {
    // Legacy fallback
    if (Array.isArray(eb)) {
      activeAgentCount = eb
        .filter((bot: any) => bot.expires_at && new Date(bot.expires_at) > new Date())
        .reduce((sum: number, bot: any) => sum + (bot.quantity || 1), 0)
        
      eb.forEach((bot: any, index: number) => {
        if (bot.expires_at && new Date(bot.expires_at) > new Date()) {
          const agentIndex = index + 1
          activeBotLicenses.push({ agentId: String(index), agentName: agents[agentIndex]?.name || `Extra Agent Slot ${agentIndex}`, quantity: bot.quantity || 1, expiresAt: bot.expires_at })
        }
      })
    } else if (typeof eb === 'object' && eb.expires_at && new Date(eb.expires_at) > new Date()) {
      activeAgentCount = eb.quantity || 0
      activeBotLicenses.push({ agentId: "0", agentName: agents[1]?.name || "Extra Agent Slot 1", quantity: eb.quantity || 1, expiresAt: eb.expires_at })
    } else if (typeof eb === 'number') {
      activeAgentCount = eb
    }
  }

  // Check if a module is active by seeing if expires_at is in the future
  const isActive = (key: string) => {
    const mod = currentModules?.[key]
    if (!mod) return false
    if (typeof mod === 'boolean') return mod // legacy fallback
    if (mod.expires_at) {
      return new Date(mod.expires_at).getTime() > Date.now()
    }
    return false
  }

  // Base 1-month prices (fallback if DB prices missing)
  const BASE_PRICES: Record<string, number> = {
    extraBots: 15,
    whatsappChannel: 20,
    telegramChannel: 10,
    customEmails: 10,
    autoFollowups: 15,
    unlimitedChats: 30,
    calendarSync: 10,
    broadcastMessaging: 25,
    reputationManagement: 20,
    metaAds: 15,
    googleAds: 15,
    telegramAds: 15,
    removeBranding: 25,
  }

  // Find exact price from DB or fallback
  const getPrice = (moduleKey: string, months: number): number => {
    const dbPrice = stripePrices.find(p => p.module_key === moduleKey && parseInt(p.metadata?.months || '1') === months)
    if (dbPrice) {
      return dbPrice.unit_amount / 100
    }
    // Fallback calculation based on the plan matrix
    const base = BASE_PRICES[moduleKey] || 15
    if (months === 1) return base
    if (months === 3) return Math.floor(base * 3 * 0.95)
    if (months === 6) return Math.floor(base * 6 * 0.90)
    if (months === 9) return Math.floor(base * 9 * 0.85)
    if (months === 12) return Math.floor(base * 12 * 0.80)
    return base * months
  }

  // Calculate cart total
  let totalCost = 0
  Object.keys(cart).forEach(key => {
    const item = cart[key]
    if (key === 'extraBots' && item.quantity > 0) {
      totalCost += getPrice(key, item.months) * item.quantity
    } else if (key !== 'extraBots' && item.selected) {
      totalCost += getPrice(key, item.months)
    }
  })
  
  Object.entries(extendBots).forEach(([agentId, months]) => {
     const botLicense = activeBotLicenses.find(b => b.agentId === agentId)
     if (botLicense) {
        totalCost += getPrice('extraBots', months) * botLicense.quantity
     }
  })

  const handleCheckout = async () => {
    setIsLoading(true)
    try {
      const checkoutPayload: Record<string, any> = {}
      Object.keys(cart).forEach(key => {
        const item = cart[key]
        if (key === 'extraBots' && item.quantity > 0) {
          checkoutPayload[key] = { quantity: item.quantity, months: item.months }
        } else if (key !== 'extraBots' && item.selected) {
          checkoutPayload[key] = { months: item.months }
        }
      })
      if (Object.keys(extendBots).length > 0) {
        checkoutPayload['extendBots'] = extendBots
      }

      const res = await fetch('/api/stripe/checkout-modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, modules: checkoutPayload }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error(data.error || 'Failed to create checkout session')
      }
    } catch (e) {
      console.error(e)
      toast.error('Network error while connecting to checkout.')
    } finally {
      setIsLoading(false)
    }
  }

  const DurationSelector = ({ moduleKey, currentMonths }: { moduleKey: string, currentMonths: number }) => (
    <select 
      value={currentMonths}
      onChange={(e) => {
        const months = parseInt(e.target.value)
        setCart(prev => ({ ...prev, [moduleKey]: { ...prev[moduleKey], months } }))
      }}
      style={{
        background: 'var(--paper)',
        border: '1px solid var(--border)',
        color: 'var(--ink)',
        padding: '0.25rem 0.5rem',
        borderRadius: '6px',
        fontSize: '0.8rem',
        fontFamily: 'DM Sans',
        outline: 'none',
        cursor: 'pointer'
      }}
    >
      <option value={1}>1 Month</option>
      <option value={3}>3 Months (Save 5%)</option>
      <option value={6}>6 Months (Save 10%)</option>
      <option value={9}>9 Months (Save 15%)</option>
      <option value={12}>1 Year (Save 20%)</option>
    </select>
  )

  const ExtensionDurationSelector = ({ agentId, currentMonths }: { agentId: string, currentMonths: number }) => (
    <select 
      value={currentMonths || 1}
      onChange={(e) => setExtendBots(prev => ({ ...prev, [agentId]: parseInt(e.target.value) }))}
      style={{ background: 'var(--paper)', border: '1px solid var(--border)', color: 'var(--ink)', padding: '0.25rem 0.5rem', borderRadius: '6px', fontSize: '0.8rem', fontFamily: 'DM Sans', outline: 'none', cursor: 'pointer' }}
    >
      <option value={1}>+1 Month</option>
      <option value={3}>+3 Months (Save 5%)</option>
      <option value={6}>+6 Months (Save 10%)</option>
      <option value={9}>+9 Months (Save 15%)</option>
      <option value={12}>+1 Year (Save 20%)</option>
    </select>
  )

  const ModuleButton = ({ moduleKey, comingSoon }: { moduleKey: string, comingSoon?: boolean }) => {
    if (comingSoon) {
      return (
        <div style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
          Coming Soon
        </div>
      )
    }

    const inCart = cart[moduleKey].selected
    
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <DurationSelector moduleKey={moduleKey} currentMonths={cart[moduleKey].months} />
        <button
          onClick={() => setCart(prev => ({ ...prev, [moduleKey]: { ...prev[moduleKey], selected: !prev[moduleKey].selected } }))}
          style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: inCart ? '1px solid var(--gold)' : 'none', background: inCart ? 'rgba(201,168,76,0.1)' : 'var(--paper)', color: inCart ? 'var(--gold)' : 'var(--ink)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
        >
          {inCart ? <><CheckCircle2 size={16} /> Added</> : (isActive(moduleKey) ? 'Extend Time' : 'Add Module')}
        </button>
      </div>
    )
  }

  const cardBorder = (key: string) => {
    if (key === 'extraBots') return cart.extraBots.quantity > 0 ? '1px solid var(--gold)' : ''
    return cart[key].selected ? '1px solid var(--gold)' : (isActive(key) ? '1px solid rgba(42,122,74,0.3)' : '')
  }

  const modulesList = [
    { key: 'whatsappChannel', title: 'WhatsApp Channel', icon: MessageSquare, desc: 'Connect your WhatsApp Business account and let your AI agent handle customer conversations on WhatsApp.' },
    { key: 'telegramChannel', title: 'Telegram Channel', icon: MessageSquare, desc: 'Connect your Telegram Bot and let your AI agent reply to customer messages directly on Telegram.' },
    { key: 'customEmails', title: 'Custom Emails', icon: Mail, desc: 'Send automated confirmations and follow-ups from your own custom domain.' },
    { key: 'autoFollowups', title: 'Auto Follow-ups', icon: CalendarSync, desc: 'Automatically chase up leads and request reviews after appointments.' },
    { key: 'unlimitedChats', title: 'Unlimited Chats', icon: Zap, desc: 'Remove the 50 free chat limit. Perfect for high-volume businesses.' },
    { key: 'removeBranding', title: 'Remove Branding', icon: EyeOff, desc: 'Remove "Powered by Vexyr" from your chat widgets and emails for a fully white-labeled experience.' },
    { key: 'calendarSync', title: '3rd-Party Calendar Sync', icon: CalendarSync, desc: 'Sync your Vexyr appointments with external calendars (Google Calendar, Outlook).', comingSoon: true },
    { key: 'broadcastMessaging', title: 'Broadcast Messaging', icon: Megaphone, desc: 'Send mass updates and promotional blasts to your entire customer base.' },
    { key: 'reputationManagement', title: 'Reputation Management', icon: Star, desc: 'Monitor and respond to customer reviews automatically across platforms.', comingSoon: true },
    { key: 'metaAds', title: 'Meta Ads Reporting', icon: BarChart, desc: 'Advanced ROI tracking and conversion reports for your Meta Ads.', comingSoon: true },
    { key: 'googleAds', title: 'Google Ads Reporting', icon: LineChart, desc: 'Advanced ROI tracking and conversion reports for your Google Ads.', comingSoon: true },
    { key: 'telegramAds', title: 'Telegram Ads Reporting', icon: PieChart, desc: 'Advanced ROI tracking and conversion reports for Telegram Ads.', comingSoon: true },
  ]

  return (
    <div style={{ paddingBottom: '100px', position: 'relative' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>

        {/* Extra AI Agents */}
        <div className="dash-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: cardBorder('extraBots') }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', background: 'rgba(201,168,76,0.1)', borderRadius: '12px' }}>
              <Bot size={24} color="var(--gold)" />
            </div>
            <div style={{ flexGrow: 1 }}>
              <h3 style={{ fontSize: '1.1rem', fontFamily: 'DM Sans', fontWeight: 600 }}>Extra AI Agents</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>${BASE_PRICES.extraBots}/mo per agent</p>
            </div>
            {activeAgentCount > 0 && (
              <div style={{ padding: '0.3rem 0.75rem', borderRadius: '100px', background: 'rgba(42,122,74,0.1)', border: '1px solid rgba(42,122,74,0.3)', color: '#2a7a4a', fontSize: '0.75rem', fontFamily: 'DM Mono', whiteSpace: 'nowrap' }}>
                {activeAgentCount} active
              </div>
            )}
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.5, flexGrow: 1 }}>
            Add specialized agents for Sales, Support, or Booking to handle different customer flows.
          </p>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Duration</span>
              <DurationSelector moduleKey="extraBots" currentMonths={cart.extraBots.months} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Add more agents</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--paper)', borderRadius: '8px', padding: '0.25rem' }}>
                <button
                  onClick={() => setCart(prev => ({ ...prev, extraBots: { ...prev.extraBots, quantity: Math.max(0, prev.extraBots.quantity - 1) } }))}
                  style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--ink)', cursor: 'pointer' }}
                >-</button>
                <span style={{ fontFamily: 'DM Mono', width: '20px', textAlign: 'center' }}>{cart.extraBots.quantity}</span>
                <button
                  onClick={() => setCart(prev => ({ ...prev, extraBots: { ...prev.extraBots, quantity: prev.extraBots.quantity + 1 } }))}
                  style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--ink)', cursor: 'pointer' }}
                >+</button>
              </div>
            </div>
            {cart.extraBots.quantity > 0 && (
              <p style={{ fontSize: '0.78rem', color: 'var(--gold)', fontFamily: 'DM Mono', textAlign: 'right', marginTop: '0.5rem' }}>
                +${getPrice('extraBots', cart.extraBots.months) * cart.extraBots.quantity} ({cart.extraBots.months} months)
              </p>
            )}

            {activeBotLicenses.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '1rem', display: 'flex', justifyContent: 'center' }}>
                <button onClick={() => setShowLicensesModal(true)} style={{ background: 'transparent', border: '1px solid var(--gold)', color: 'var(--gold)', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', width: '100%' }}>
                  Manage Active Licenses
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Standard Modules */}
        {modulesList.map((module) => (
          <div key={module.key} className="dash-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: cardBorder(module.key) }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', background: 'rgba(201,168,76,0.1)', borderRadius: '12px' }}>
                <module.icon size={24} color="var(--gold)" />
              </div>
              <div style={{ flexGrow: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontFamily: 'DM Sans', fontWeight: 600 }}>{module.title}</h3>
                  {isActive(module.key) && <CheckCircle2 size={14} color="#2a7a4a" />}
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                  ${getPrice(module.key, cart[module.key].months)} for {cart[module.key].months} mo.
                </p>
              </div>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.5, flexGrow: 1 }}>
              {module.desc}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
              <ModuleButton moduleKey={module.key} comingSoon={module.comingSoon} />
            </div>
          </div>
        ))}

      </div>

      {/* Floating Checkout Bar */}
      <div style={{ position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', background: 'rgba(12,12,12,0.95)', backdropFilter: 'blur(10px)', border: '1px solid var(--border-strong)', borderRadius: '100px', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '2rem', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <ShoppingCart size={18} color="var(--muted)" />
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Payment</div>
            <div style={{ fontSize: '1.2rem', fontFamily: 'DM Mono', fontWeight: 600 }}>${totalCost}</div>
          </div>
        </div>
        <button
          onClick={handleCheckout}
          disabled={totalCost === 0 || isLoading}
          style={{ background: 'var(--gold)', color: '#000', border: 'none', borderRadius: '50px', padding: '0.75rem 2rem', fontSize: '0.9rem', fontWeight: 500, cursor: totalCost === 0 ? 'not-allowed' : 'pointer', opacity: totalCost === 0 ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          {isLoading ? 'Processing...' : 'Proceed to Checkout'}
        </button>
      </div>

      {/* Licenses Modal */}
      {showLicensesModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="dash-card" style={{ width: '100%', maxWidth: '500px', padding: '2rem', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontFamily: 'DM Sans', fontWeight: 600 }}>Manage Active Licenses</h3>
              <button onClick={() => setShowLicensesModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1 }}>&times;</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {activeBotLicenses.map((bot, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                  <div>
                     <span style={{ fontSize: '0.95rem', fontWeight: 600, display: 'block', color: 'var(--gold)', marginBottom: '0.25rem' }}>{bot.agentName}</span>
                     <span style={{ fontSize: '0.85rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Quantity: {bot.quantity}</span>
                     <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Expires: {new Date(bot.expiresAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {extendBots[bot.agentId] ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                        <ExtensionDurationSelector agentId={bot.agentId} currentMonths={extendBots[bot.agentId]} />
                        <button onClick={() => {
                          const newExt = { ...extendBots };
                          delete newExt[bot.agentId];
                          setExtendBots(newExt);
                        }} style={{ background: 'transparent', color: '#dc2626', border: 'none', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.75rem' }}>Remove</button>
                      </div>
                    ) : (
                      <button onClick={() => setExtendBots(prev => ({ ...prev, [bot.agentId]: 1 }))} style={{ background: 'rgba(201,168,76,0.1)', color: 'var(--gold)', border: '1px solid var(--gold)', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>Extend</button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem', alignItems: 'center' }}>
              <button onClick={() => setShowLicensesModal(false)} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--ink)', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                Continue Shopping
              </button>
              <button
                onClick={handleCheckout}
                disabled={totalCost === 0 || isLoading}
                style={{ background: 'var(--gold)', color: '#000', border: 'none', borderRadius: '8px', padding: '0.6rem 1.2rem', fontSize: '0.9rem', fontWeight: 500, cursor: totalCost === 0 ? 'not-allowed' : 'pointer', opacity: totalCost === 0 ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                {isLoading ? 'Processing...' : `Checkout ($${totalCost})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
