'use client'

import { useState } from 'react'
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

export default function StoreClient({ tenantId, tenantSlug, currentModules }: { tenantId: string, tenantSlug: string, currentModules: any }) {
  const [cart, setCart] = useState<ModuleConfig>({
    extraBots: 0,           // additional bots to purchase (delta only)
    whatsappChannel: false, // start clean — isActive() shows what's already paid
    telegramChannel: false,
    customEmails: false,
    autoFollowups: false,
    unlimitedChats: false,
    calendarSync: false,
    broadcastMessaging: false,
    reputationManagement: false,
    metaAds: false,
    googleAds: false,
    telegramAds: false,
    removeBranding: false,
  })

  const [isLoading, setIsLoading] = useState(false)

  // Already-active agent count (from existing subscription)
  const activeAgentCount: number = currentModules?.extraBots || 0

  // Returns true if this boolean module is already active in the paid subscription
  const isActive = (key: keyof ModuleConfig) => Boolean(currentModules?.[key])

  // Pricing constants (display only)
  const PRICES = {
    extraBots: 15,
    whatsappChannel: 29,
    telegramChannel: 19,
    customEmails: 28,
    autoFollowups: 28,
    unlimitedChats: 49,
    calendarSync: 8,
    broadcastMessaging: 49,
    reputationManagement: 39,
    metaAds: 49,
    googleAds: 49,
    telegramAds: 49,
    removeBranding: 49,
  }

  // Cart total — only count NEW additions (already-active modules are already billed)
  const totalMonthly =
    (cart.extraBots * PRICES.extraBots) +                  // extraBots is always the delta
    (isActive('whatsappChannel') || !cart.whatsappChannel ? 0 : PRICES.whatsappChannel) +
    (isActive('telegramChannel') || !cart.telegramChannel ? 0 : PRICES.telegramChannel) +
    (isActive('customEmails') || !cart.customEmails ? 0 : PRICES.customEmails) +
    (isActive('autoFollowups') || !cart.autoFollowups ? 0 : PRICES.autoFollowups) +
    (isActive('unlimitedChats') || !cart.unlimitedChats ? 0 : PRICES.unlimitedChats) +
    (isActive('calendarSync') || !cart.calendarSync ? 0 : PRICES.calendarSync) +
    (isActive('broadcastMessaging') || !cart.broadcastMessaging ? 0 : PRICES.broadcastMessaging) +
    (isActive('reputationManagement') || !cart.reputationManagement ? 0 : PRICES.reputationManagement) +
    (isActive('metaAds') || !cart.metaAds ? 0 : PRICES.metaAds) +
    (isActive('googleAds') || !cart.googleAds ? 0 : PRICES.googleAds) +
    (isActive('telegramAds') || !cart.telegramAds ? 0 : PRICES.telegramAds) +
    (isActive('removeBranding') || !cart.removeBranding ? 0 : PRICES.removeBranding)

  const handleCheckout = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout-modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, modules: cart }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || 'Failed to create checkout session')
      }
    } catch (e) {
      console.error(e)
      alert('Network error while connecting to checkout.')
    } finally {
      setIsLoading(false)
    }
  }

  // Three-state button: Active (already subscribed) | Added (in cart) | Add Module | Coming Soon
  const ModuleButton = ({ moduleKey, onToggle, comingSoon }: { moduleKey: keyof ModuleConfig; onToggle: () => void, comingSoon?: boolean }) => {
    if (comingSoon) {
      return (
        <div style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
          Coming Soon
        </div>
      )
    }
    if (isActive(moduleKey)) {
      return (
        <div style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: 'rgba(42,122,74,0.12)', color: '#2a7a4a', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', border: '1px solid rgba(42,122,74,0.3)' }}>
          <CheckCircle2 size={16} /> Active
        </div>
      )
    }
    const inCart = Boolean(cart[moduleKey])
    return (
      <button
        onClick={onToggle}
        style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: inCart ? '1px solid var(--gold)' : 'none', background: inCart ? 'rgba(201,168,76,0.1)' : 'var(--paper)', color: inCart ? 'var(--gold)' : 'var(--ink)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
      >
        {inCart ? <><CheckCircle2 size={16} /> Added</> : 'Add Module'}
      </button>
    )
  }

  const cardBorder = (key: keyof ModuleConfig) =>
    isActive(key) ? '1px solid rgba(42,122,74,0.5)' : Boolean(cart[key]) ? '1px solid var(--gold)' : ''

  return (
    <div style={{ paddingBottom: '100px', position: 'relative' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>

        {/* Extra AI Agents (Unique card due to quantity stepper) */}
        <div className="dash-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: cart.extraBots > 0 ? '1px solid var(--gold)' : '' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', background: 'rgba(201,168,76,0.1)', borderRadius: '12px' }}>
              <Bot size={24} color="var(--gold)" />
            </div>
            <div style={{ flexGrow: 1 }}>
              <h3 style={{ fontSize: '1.1rem', fontFamily: 'DM Sans', fontWeight: 600 }}>Extra AI Agents</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>${PRICES.extraBots}/mo per agent</p>
            </div>
            {/* Show current active agent count as a badge */}
            {activeAgentCount > 0 && (
              <div style={{ padding: '0.3rem 0.75rem', borderRadius: '100px', background: 'rgba(42,122,74,0.1)', border: '1px solid rgba(42,122,74,0.3)', color: '#2a7a4a', fontSize: '0.75rem', fontFamily: 'DM Mono', whiteSpace: 'nowrap' }}>
                {activeAgentCount} active
              </div>
            )}
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.5, flexGrow: 1 }}>
            Add specialized agents for Sales, Support, or Booking to handle different customer flows.
          </p>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Add more agents</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--paper)', borderRadius: '8px', padding: '0.25rem' }}>
                <button
                  onClick={() => setCart({ ...cart, extraBots: Math.max(0, cart.extraBots - 1) })}
                  style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--ink)', cursor: 'pointer' }}
                >-</button>
                <span style={{ fontFamily: 'DM Mono', width: '20px', textAlign: 'center' }}>{cart.extraBots}</span>
                <button
                  onClick={() => setCart({ ...cart, extraBots: cart.extraBots + 1 })}
                  style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--ink)', cursor: 'pointer' }}
                >+</button>
              </div>
            </div>
            {cart.extraBots > 0 && (
              <p style={{ fontSize: '0.78rem', color: 'var(--gold)', fontFamily: 'DM Mono', textAlign: 'right' }}>
                +${cart.extraBots * PRICES.extraBots}/mo → {activeAgentCount + cart.extraBots} total agents
              </p>
            )}
          </div>
        </div>

        {/* Standard Modules mapped from array */}
        {[
          { key: 'whatsappChannel' as keyof ModuleConfig, title: 'WhatsApp Channel', icon: MessageSquare, desc: 'Connect your WhatsApp Business account and let your AI agent handle customer conversations on WhatsApp.' },
          { key: 'telegramChannel' as keyof ModuleConfig, title: 'Telegram Channel', icon: MessageSquare, desc: 'Connect your Telegram Bot and let your AI agent reply to customer messages directly on Telegram.' },
          { key: 'customEmails' as keyof ModuleConfig, title: 'Custom Emails', icon: Mail, desc: 'Send automated confirmations and follow-ups from your own custom domain.' },
          { key: 'autoFollowups' as keyof ModuleConfig, title: 'Auto Follow-ups', icon: CalendarSync, desc: 'Automatically chase up leads and request reviews after appointments.' },
          { key: 'unlimitedChats' as keyof ModuleConfig, title: 'Unlimited Chats', icon: Zap, desc: 'Remove the 50 free chat limit. Perfect for high-volume businesses.' },
          { key: 'removeBranding' as keyof ModuleConfig, title: 'Remove Branding', icon: EyeOff, desc: 'Remove "Powered by Vexyr" from your chat widgets and emails for a fully white-labeled experience.' },
          { key: 'calendarSync' as keyof ModuleConfig, title: '3rd-Party Calendar Sync', icon: CalendarSync, desc: 'Sync your Vexyr appointments with external calendars (Google Calendar, Outlook).', comingSoon: true },
          { key: 'broadcastMessaging' as keyof ModuleConfig, title: 'Broadcast Messaging', icon: Megaphone, desc: 'Send mass updates and promotional blasts to your entire customer base.' },
          { key: 'reputationManagement' as keyof ModuleConfig, title: 'Reputation Management', icon: Star, desc: 'Monitor and respond to customer reviews automatically across platforms.', comingSoon: true },
          { key: 'metaAds' as keyof ModuleConfig, title: 'Meta Ads Reporting', icon: BarChart, desc: 'Advanced ROI tracking and conversion reports for your Meta Ads.', comingSoon: true },
          { key: 'googleAds' as keyof ModuleConfig, title: 'Google Ads Reporting', icon: LineChart, desc: 'Advanced ROI tracking and conversion reports for your Google Ads.', comingSoon: true },
          { key: 'telegramAds' as keyof ModuleConfig, title: 'Telegram Ads Reporting', icon: PieChart, desc: 'Advanced ROI tracking and conversion reports for Telegram Ads.', comingSoon: true },
        ].map((module) => (
          <div key={module.key} className="dash-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: cardBorder(module.key) }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', background: 'rgba(201,168,76,0.1)', borderRadius: '12px' }}>
                <module.icon size={24} color="var(--gold)" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontFamily: 'DM Sans', fontWeight: 600 }}>{module.title}</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>${PRICES[module.key as keyof typeof PRICES]}/mo</p>
              </div>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.5, flexGrow: 1 }}>
              {module.desc}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Status</span>
              <ModuleButton moduleKey={module.key} comingSoon={module.comingSoon} onToggle={() => setCart({ ...cart, [module.key]: !cart[module.key] })} />
            </div>
          </div>
        ))}

      </div>

      {/* Floating Checkout Bar */}
      <div style={{ position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', background: 'rgba(12,12,12,0.95)', backdropFilter: 'blur(10px)', border: '1px solid var(--border-strong)', borderRadius: '100px', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '2rem', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <ShoppingCart size={18} color="var(--muted)" />
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Selection</div>
            <div style={{ fontSize: '1.2rem', fontFamily: 'DM Mono', fontWeight: 600 }}>${totalMonthly}<span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>/mo</span></div>
          </div>
        </div>
        <button
          onClick={handleCheckout}
          disabled={totalMonthly === 0 || isLoading}
          style={{ background: 'var(--gold)', color: '#000', border: 'none', borderRadius: '50px', padding: '0.75rem 2rem', fontSize: '0.9rem', fontWeight: 500, cursor: totalMonthly === 0 ? 'not-allowed' : 'pointer', opacity: totalMonthly === 0 ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          {isLoading ? 'Processing...' : 'Proceed to Checkout'}
        </button>
      </div>
    </div>
  )
}
