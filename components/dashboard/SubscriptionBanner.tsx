import Link from 'next/link'
import { AlertTriangle, AlertCircle } from 'lucide-react'

interface SubscriptionBannerProps {
  status: string
  modules: any
  tenantSlug: string
}

export default function SubscriptionBanner({ status, modules, tenantSlug }: SubscriptionBannerProps) {
  // Check module expirations
  const now = new Date().getTime()
  
  const expiringModules: string[] = []
  const expiredModules: string[] = []
  
  // A mapping for readable names
  const moduleNames: Record<string, string> = {
    extraBots: 'Extra AI Agents',
    whatsappChannel: 'WhatsApp Channel',
    telegramChannel: 'Telegram Channel',
    customEmails: 'Custom Emails',
    autoFollowups: 'Auto Follow-ups',
    unlimitedChats: 'Unlimited Chats',
    calendarSync: 'Calendar Sync',
    broadcastMessaging: 'Broadcast Messaging',
    reputationManagement: 'Reputation Management',
    metaAds: 'Meta Ads',
    googleAds: 'Google Ads',
    telegramAds: 'Telegram Ads',
    removeBranding: 'Remove Branding'
  }
  
  if (modules && typeof modules === 'object') {
    Object.keys(modules).forEach(key => {
      const mod = modules[key]
      if (mod && typeof mod === 'object' && mod.expires_at) {
        const end = new Date(mod.expires_at).getTime()
        const diff = end - now
        const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24))
        
        if (daysLeft <= 0) {
          expiredModules.push(moduleNames[key] || key)
        } else if (daysLeft <= 10) {
          expiringModules.push(moduleNames[key] || key)
        }
      }
    })
  }

  if (expiredModules.length > 0) {
    return (
      <div style={{
        background: '#fef2f2',
        borderBottom: '1px solid #fecaca',
        color: '#b91c1c',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        fontSize: '0.9rem',
        fontWeight: 500,
        zIndex: 50,
        width: '100%',
        flexWrap: 'wrap'
      }}>
        <AlertCircle size={18} />
        {expiredModules.length === 1 
          ? `Your ${expiredModules[0]} module has expired and is disabled.`
          : `${expiredModules.length} of your premium modules have expired.`}
        <Link href={`/${tenantSlug}/store`} style={{ color: '#991b1b', textDecoration: 'underline', marginLeft: '8px', fontWeight: 600 }}>
          Renew now in Store
        </Link>
      </div>
    )
  }

  if (expiringModules.length > 0) {
    return (
      <div style={{
        background: '#fffbeb',
        borderBottom: '1px solid #fef3c7',
        color: '#b45309',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        fontSize: '0.9rem',
        fontWeight: 500,
        zIndex: 50,
        width: '100%',
        flexWrap: 'wrap'
      }}>
        <AlertTriangle size={18} />
        {expiringModules.length === 1 
          ? `Your ${expiringModules[0]} module will expire within 10 days.`
          : `${expiringModules.length} of your modules are expiring soon.`} Please renew to avoid service interruption.
        <Link href={`/${tenantSlug}/store`} style={{ color: '#92400e', textDecoration: 'underline', marginLeft: '8px', fontWeight: 600 }}>
          Renew now in Store
        </Link>
      </div>
    )
  }

  return null
}
