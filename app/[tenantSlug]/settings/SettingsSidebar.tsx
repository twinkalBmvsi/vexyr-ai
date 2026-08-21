'use client'

import { Settings as SettingsIcon, Bell, Lock, User, CreditCard, Mail } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function SettingsSidebar({ userRole, tenantSlug, accessPages = [] }: { userRole?: string, tenantSlug: string, accessPages?: string[] }) {
  const pathname = usePathname()

  let tabs = [
    { name: 'General', href: '', icon: SettingsIcon, matchExact: true, routeId: 'settings' },
    { name: 'Billing', href: '/billing', icon: CreditCard, matchExact: false, routeId: 'settings/billing' },
    { name: 'Team', href: '/team', icon: User, matchExact: false, routeId: 'settings/team' },
    { name: 'Custom Emails', href: '/emails', icon: Mail, matchExact: false, routeId: 'settings/emails' },
    { name: 'Notifications', href: '/notifications', icon: Bell, matchExact: false, routeId: 'settings/notifications' },
    { name: 'Security', href: '/security', icon: Lock, matchExact: false, routeId: 'settings/security' },
  ]

  if (userRole !== 'owner') {
    tabs = tabs.filter(t => accessPages.includes(t.routeId))
  }

  const basePath = '/settings'

  return (
    <div className="dash-card" style={{ padding: '1.5rem' }}>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {tabs.map(tab => {
          const href = `${basePath}${tab.href}`
          const isActive = tab.matchExact ? pathname === basePath : pathname.startsWith(href)
          const Icon = tab.icon

          return (
            <li key={tab.name}>
              <Link href={href} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: isActive ? 'var(--ink)' : 'transparent', color: isActive ? 'var(--paper)' : 'var(--muted)', border: 'none', fontFamily: 'DM Sans', fontSize: '0.85rem', cursor: 'pointer', textAlign: 'left', borderRadius: '4px', textDecoration: 'none', transition: 'all 0.2s' }}>
                <Icon size={16} />
                {tab.name}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
