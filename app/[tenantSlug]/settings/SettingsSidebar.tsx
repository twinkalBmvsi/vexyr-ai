'use client'

import { Settings as SettingsIcon, Bell, Lock, User, CreditCard } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function SettingsSidebar() {
  const pathname = usePathname()

  const tabs = [
    { name: 'General', href: '', icon: SettingsIcon, matchExact: true },
    { name: 'Billing', href: '/billing', icon: CreditCard, matchExact: false },
    { name: 'Team', href: '/team', icon: User, matchExact: false },
    { name: 'Notifications', href: '/notifications', icon: Bell, matchExact: false },
    { name: 'Security', href: '/security', icon: Lock, matchExact: false },
  ]

  const basePath = '/settings'

  return (
    <div className="dash-card" style={{ padding: '1.5rem' }}>
      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {tabs.map(tab => {
          const href = `${basePath}${tab.href}`
          const isActive = tab.matchExact ? pathname === basePath : pathname.startsWith(href)
          const Icon = tab.icon

          return (
            <li key={tab.name}>
              <Link href={href} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: isActive ? 'var(--ink)' : 'transparent', color: isActive ? 'var(--paper)' : 'var(--muted)', border: 'none', fontFamily: 'DM Sans', fontSize: '0.85rem', cursor: 'pointer', textAlign: 'left', borderRadius: '4px', textDecoration: 'none', transition: 'all 0.2s' }}>
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
