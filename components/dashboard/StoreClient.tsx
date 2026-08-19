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
    extraBots: currentModules?.extraBots || 0,
    whatsappChannel: currentModules?.whatsappChannel || false,
    telegramChannel: currentModules?.telegramChannel || false,
    customEmails: currentModules?.customEmails || false,
    autoFollowups: currentModules?.autoFollowups || false,
    unlimitedChats: currentModules?.unlimitedChats || false,
    calendarSync: currentModules?.calendarSync || false,
    broadcastMessaging: currentModules?.broadcastMessaging || false,
    reputationManagement: currentModules?.reputationManagement || false,
    metaAds: currentModules?.metaAds || false,
    googleAds: currentModules?.googleAds || false,
    telegramAds: currentModules?.telegramAds || false,
    removeBranding: currentModules?.removeBranding || false,
  })

  const [isLoading, setIsLoading] = useState(false)

  // Pricing constants
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

  // Calculate total monthly recurring revenue (MRR) based on selected modules
  const totalMonthly = 
    (cart.extraBots * PRICES.extraBots) +
    (cart.whatsappChannel ? PRICES.whatsappChannel : 0) +
    (cart.telegramChannel ? PRICES.telegramChannel : 0) +
    (cart.customEmails ? PRICES.customEmails : 0) +
    (cart.autoFollowups ? PRICES.autoFollowups : 0) +
    (cart.unlimitedChats ? PRICES.unlimitedChats : 0) +
    (cart.calendarSync ? PRICES.calendarSync : 0) +
    (cart.broadcastMessaging ? PRICES.broadcastMessaging : 0) +
    (cart.reputationManagement ? PRICES.reputationManagement : 0) +
    (cart.metaAds ? PRICES.metaAds : 0) +
    (cart.googleAds ? PRICES.googleAds : 0) +
    (cart.telegramAds ? PRICES.telegramAds : 0) +
    (cart.removeBranding ? PRICES.removeBranding : 0)

  const handleCheckout = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout-modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          modules: cart
        })
      });
      const data = await res.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to create checkout session');
      }
    } catch (e) {
      console.error(e);
      alert('Network error while connecting to checkout.');
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ paddingBottom: '100px', position: 'relative' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        
        {/* Extra Bots Module */}
        <div className="dash-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', background: 'rgba(201, 168, 76, 0.1)', borderRadius: '12px' }}>
              <Bot size={24} color="var(--gold)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontFamily: 'DM Sans', fontWeight: 600 }}>Extra AI Agents</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>$15/mo per agent</p>
            </div>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.5, flexGrow: 1 }}>
            Add specialized agents for Sales, Support, or Booking to handle different customer flows.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Quantity</span>
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
        </div>

        {/* WhatsApp Channel Module */}
        <div className="dash-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: cart.whatsappChannel ? '1px solid var(--gold)' : '' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', background: 'rgba(201, 168, 76, 0.1)', borderRadius: '12px' }}>
              <MessageSquare size={24} color="var(--gold)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontFamily: 'DM Sans', fontWeight: 600 }}>WhatsApp Channel</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>$29/mo</p>
            </div>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.5, flexGrow: 1 }}>
            Connect your WhatsApp Business account and let your AI agent handle customer conversations on WhatsApp.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Status</span>
            <button
              onClick={() => setCart({ ...cart, whatsappChannel: !cart.whatsappChannel })}
              style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', background: cart.whatsappChannel ? 'rgba(42, 122, 74, 0.1)' : 'var(--paper)', color: cart.whatsappChannel ? '#2a7a4a' : 'var(--ink)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
            >
              {cart.whatsappChannel ? <><CheckCircle2 size={16} /> Added</> : 'Add Module'}
            </button>
          </div>
        </div>

        {/* Telegram Channel Module */}
        <div className="dash-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: cart.telegramChannel ? '1px solid var(--gold)' : '' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', background: 'rgba(201, 168, 76, 0.1)', borderRadius: '12px' }}>
              <MessageSquare size={24} color="var(--gold)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontFamily: 'DM Sans', fontWeight: 600 }}>Telegram Channel</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>$19/mo</p>
            </div>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.5, flexGrow: 1 }}>
            Connect your Telegram Bot and let your AI agent reply to customer messages directly on Telegram.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Status</span>
            <button
              onClick={() => setCart({ ...cart, telegramChannel: !cart.telegramChannel })}
              style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', background: cart.telegramChannel ? 'rgba(42, 122, 74, 0.1)' : 'var(--paper)', color: cart.telegramChannel ? '#2a7a4a' : 'var(--ink)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
            >
              {cart.telegramChannel ? <><CheckCircle2 size={16} /> Added</> : 'Add Module'}
            </button>
          </div>
        </div>

        {/* Custom Emails Module */}
        <div className="dash-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: cart.customEmails ? '1px solid var(--gold)' : '' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', background: 'rgba(201, 168, 76, 0.1)', borderRadius: '12px' }}>
              <Mail size={24} color="var(--gold)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontFamily: 'DM Sans', fontWeight: 600 }}>Custom Emails</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>$10/mo</p>
            </div>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.5, flexGrow: 1 }}>
            Send automated confirmations and follow-ups from your own custom domain.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Status</span>
            <button 
              onClick={() => setCart({ ...cart, customEmails: !cart.customEmails })}
              style={{ 
                padding: '0.5rem 1rem', 
                borderRadius: '8px', 
                border: 'none', 
                background: cart.customEmails ? 'rgba(42, 122, 74, 0.1)' : 'var(--paper)', 
                color: cart.customEmails ? '#2a7a4a' : 'var(--ink)', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.85rem'
              }}
            >
              {cart.customEmails ? <><CheckCircle2 size={16} /> Added</> : 'Add Module'}
            </button>
          </div>
        </div>

        {/* Auto Follow-ups Module */}
        <div className="dash-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: cart.autoFollowups ? '1px solid var(--gold)' : '' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', background: 'rgba(201, 168, 76, 0.1)', borderRadius: '12px' }}>
              <CalendarSync size={24} color="var(--gold)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontFamily: 'DM Sans', fontWeight: 600 }}>Auto Follow-ups</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>$20/mo</p>
            </div>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.5, flexGrow: 1 }}>
            Automatically chase up leads and request reviews after appointments.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Status</span>
            <button 
              onClick={() => setCart({ ...cart, autoFollowups: !cart.autoFollowups })}
              style={{ 
                padding: '0.5rem 1rem', 
                borderRadius: '8px', 
                border: 'none', 
                background: cart.autoFollowups ? 'rgba(42, 122, 74, 0.1)' : 'var(--paper)', 
                color: cart.autoFollowups ? '#2a7a4a' : 'var(--ink)', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.85rem'
              }}
            >
              {cart.autoFollowups ? <><CheckCircle2 size={16} /> Added</> : 'Add Module'}
            </button>
          </div>
        </div>

        {/* Unlimited Chats Module */}
        <div className="dash-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: cart.unlimitedChats ? '1px solid var(--gold)' : '' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', background: 'rgba(201, 168, 76, 0.1)', borderRadius: '12px' }}>
              <Zap size={24} color="var(--gold)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontFamily: 'DM Sans', fontWeight: 600 }}>Unlimited Chats</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>$49/mo</p>
            </div>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.5, flexGrow: 1 }}>
            Remove the 50 free chat limit. Perfect for high-volume businesses.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Status</span>
            <button 
              onClick={() => setCart({ ...cart, unlimitedChats: !cart.unlimitedChats })}
              style={{ 
                padding: '0.5rem 1rem', 
                borderRadius: '8px', 
                border: 'none', 
                background: cart.unlimitedChats ? 'rgba(42, 122, 74, 0.1)' : 'var(--paper)', 
                color: cart.unlimitedChats ? '#2a7a4a' : 'var(--ink)', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.85rem'
              }}
            >
              {cart.unlimitedChats ? <><CheckCircle2 size={16} /> Added</> : 'Add Module'}
            </button>
          </div>
        </div>

        {/* Remove Branding */}
        <div className="dash-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: cart.removeBranding ? '1px solid var(--gold)' : '' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', background: 'rgba(201, 168, 76, 0.1)', borderRadius: '12px' }}>
              <EyeOff size={24} color="var(--gold)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontFamily: 'DM Sans', fontWeight: 600 }}>Remove Branding</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>${PRICES.removeBranding}/mo</p>
            </div>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.5, flexGrow: 1 }}>
            Remove "Powered by Vexyr" from your chat widgets and emails for a fully white-labeled experience.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Status</span>
            <button 
              onClick={() => setCart({ ...cart, removeBranding: !cart.removeBranding })}
              style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', background: cart.removeBranding ? 'rgba(42, 122, 74, 0.1)' : 'var(--paper)', color: cart.removeBranding ? '#2a7a4a' : 'var(--ink)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
            >
              {cart.removeBranding ? <><CheckCircle2 size={16} /> Added</> : 'Add Module'}
            </button>
          </div>
        </div>

        {/* 3rd-Party Calendar Sync */}
        <div className="dash-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: cart.calendarSync ? '1px solid var(--gold)' : '' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', background: 'rgba(201, 168, 76, 0.1)', borderRadius: '12px' }}>
              <CalendarSync size={24} color="var(--gold)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontFamily: 'DM Sans', fontWeight: 600 }}>3rd-Party Calendar Sync</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>${PRICES.calendarSync}/mo</p>
            </div>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.5, flexGrow: 1 }}>
            Sync your Vexyr appointments with external calendars (Google Calendar, Outlook).
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Status</span>
            <button 
              onClick={() => setCart({ ...cart, calendarSync: !cart.calendarSync })}
              style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', background: cart.calendarSync ? 'rgba(42, 122, 74, 0.1)' : 'var(--paper)', color: cart.calendarSync ? '#2a7a4a' : 'var(--ink)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
            >
              {cart.calendarSync ? <><CheckCircle2 size={16} /> Added</> : 'Add Module'}
            </button>
          </div>
        </div>

        {/* Broadcast Messaging */}
        <div className="dash-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: cart.broadcastMessaging ? '1px solid var(--gold)' : '' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', background: 'rgba(201, 168, 76, 0.1)', borderRadius: '12px' }}>
              <Megaphone size={24} color="var(--gold)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontFamily: 'DM Sans', fontWeight: 600 }}>Broadcast Messaging</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>${PRICES.broadcastMessaging}/mo</p>
            </div>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.5, flexGrow: 1 }}>
            Send mass updates and promotional blasts to your entire customer base.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Status</span>
            <button 
              onClick={() => setCart({ ...cart, broadcastMessaging: !cart.broadcastMessaging })}
              style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', background: cart.broadcastMessaging ? 'rgba(42, 122, 74, 0.1)' : 'var(--paper)', color: cart.broadcastMessaging ? '#2a7a4a' : 'var(--ink)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
            >
              {cart.broadcastMessaging ? <><CheckCircle2 size={16} /> Added</> : 'Add Module'}
            </button>
          </div>
        </div>

        {/* Reputation Management */}
        <div className="dash-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: cart.reputationManagement ? '1px solid var(--gold)' : '' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', background: 'rgba(201, 168, 76, 0.1)', borderRadius: '12px' }}>
              <Star size={24} color="var(--gold)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontFamily: 'DM Sans', fontWeight: 600 }}>Reputation Management</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>${PRICES.reputationManagement}/mo</p>
            </div>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.5, flexGrow: 1 }}>
            Monitor and respond to customer reviews automatically across platforms.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Status</span>
            <button 
              onClick={() => setCart({ ...cart, reputationManagement: !cart.reputationManagement })}
              style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', background: cart.reputationManagement ? 'rgba(42, 122, 74, 0.1)' : 'var(--paper)', color: cart.reputationManagement ? '#2a7a4a' : 'var(--ink)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
            >
              {cart.reputationManagement ? <><CheckCircle2 size={16} /> Added</> : 'Add Module'}
            </button>
          </div>
        </div>

        {/* Meta Ads Reporting */}
        <div className="dash-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: cart.metaAds ? '1px solid var(--gold)' : '' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', background: 'rgba(201, 168, 76, 0.1)', borderRadius: '12px' }}>
              <BarChart size={24} color="var(--gold)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontFamily: 'DM Sans', fontWeight: 600 }}>Meta Ads Reporting</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>${PRICES.metaAds}/mo</p>
            </div>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.5, flexGrow: 1 }}>
            Advanced ROI tracking and conversion reports for your Meta Ads.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Status</span>
            <button 
              onClick={() => setCart({ ...cart, metaAds: !cart.metaAds })}
              style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', background: cart.metaAds ? 'rgba(42, 122, 74, 0.1)' : 'var(--paper)', color: cart.metaAds ? '#2a7a4a' : 'var(--ink)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
            >
              {cart.metaAds ? <><CheckCircle2 size={16} /> Added</> : 'Add Module'}
            </button>
          </div>
        </div>

        {/* Google Ads Reporting */}
        <div className="dash-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: cart.googleAds ? '1px solid var(--gold)' : '' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', background: 'rgba(201, 168, 76, 0.1)', borderRadius: '12px' }}>
              <LineChart size={24} color="var(--gold)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontFamily: 'DM Sans', fontWeight: 600 }}>Google Ads Reporting</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>${PRICES.googleAds}/mo</p>
            </div>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.5, flexGrow: 1 }}>
            Advanced ROI tracking and conversion reports for your Google Ads.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Status</span>
            <button 
              onClick={() => setCart({ ...cart, googleAds: !cart.googleAds })}
              style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', background: cart.googleAds ? 'rgba(42, 122, 74, 0.1)' : 'var(--paper)', color: cart.googleAds ? '#2a7a4a' : 'var(--ink)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
            >
              {cart.googleAds ? <><CheckCircle2 size={16} /> Added</> : 'Add Module'}
            </button>
          </div>
        </div>

        {/* Telegram Ads Reporting */}
        <div className="dash-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: cart.telegramAds ? '1px solid var(--gold)' : '' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', background: 'rgba(201, 168, 76, 0.1)', borderRadius: '12px' }}>
              <PieChart size={24} color="var(--gold)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontFamily: 'DM Sans', fontWeight: 600 }}>Telegram Ads Reporting</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>${PRICES.telegramAds}/mo</p>
            </div>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.5, flexGrow: 1 }}>
            Advanced ROI tracking and conversion reports for Telegram Ads.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Status</span>
            <button 
              onClick={() => setCart({ ...cart, telegramAds: !cart.telegramAds })}
              style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', background: cart.telegramAds ? 'rgba(42, 122, 74, 0.1)' : 'var(--paper)', color: cart.telegramAds ? '#2a7a4a' : 'var(--ink)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
            >
              {cart.telegramAds ? <><CheckCircle2 size={16} /> Added</> : 'Add Module'}
            </button>
          </div>
        </div>

      </div>

      {/* Floating Checkout Bar */}
      <div style={{ 
        position: 'fixed', 
        bottom: '2rem', 
        left: '50%', 
        transform: 'translateX(-50%)', 
        background: 'rgba(12,12,12,0.95)', 
        backdropFilter: 'blur(10px)',
        border: '1px solid var(--border-strong)', 
        borderRadius: '100px', 
        padding: '0.75rem 1.5rem', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '2rem',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        zIndex: 50
      }}>
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
          style={{ 
            background: 'var(--gold)', 
            color: '#000', 
            border: 'none', 
            borderRadius: '50px', 
            padding: '0.75rem 2rem', 
            fontSize: '0.9rem', 
            fontWeight: 500, 
            cursor: totalMonthly === 0 ? 'not-allowed' : 'pointer',
            opacity: totalMonthly === 0 ? 0.5 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          {isLoading ? 'Processing...' : 'Proceed to Checkout'}
        </button>
      </div>
    </div>
  )
}
