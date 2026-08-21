'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Bot, LogOut, Calendar, Users, Settings, Smartphone, Menu, X, ShoppingBag, MessageCircle } from 'lucide-react'

export default function Sidebar({ 
  tenantSlug, 
  companyName, 
  userRole, 
  accessPages 
}: { 
  tenantSlug: string
  companyName: string
  userRole: string
  accessPages: string[]
}) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  const links = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, routeId: 'dashboard' },
    { name: 'Appointments', href: '/appointments', icon: Calendar, routeId: 'appointments' },
    { name: 'Agents', href: '/agents', icon: Bot, routeId: 'agents' },
    { name: 'Test Chat', href: '/test-chat', icon: MessageCircle, routeId: 'test-chat' },
    { name: 'Live Chats', href: '/live-chats', icon: MessageCircle, routeId: 'live-chats' },
    { name: 'Channels', href: '/connections', icon: Smartphone, routeId: 'connections' },
    { name: 'Customers', href: '/customers', icon: Users, routeId: 'customers' },
    { name: 'Store', href: '/store', icon: ShoppingBag, routeId: 'store' },
    { name: 'Settings', href: '/settings', icon: Settings, routeId: 'settings' },
  ]

  const visibleLinks = links.filter(link => {
    if (userRole === 'owner') return true
    if (link.routeId === 'dashboard') return true
    if (link.routeId === 'settings') {
      return accessPages.some(p => p.startsWith('settings'))
    }
    return accessPages.includes(link.routeId)
  }).map(link => {
    if (link.routeId === 'settings' && userRole !== 'owner') {
      const firstSettingsPage = accessPages.find(p => p.startsWith('settings'))
      if (firstSettingsPage && firstSettingsPage !== 'settings') {
        return { ...link, href: `/${firstSettingsPage}` }
      }
    }
    return link
  })

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(href)
  }

  return (
    <>
      <div className="mobile-dash-header">
        <div className="mobile-brand-block">
          <Link href="/" className="logo">
            vex<span>yr</span>
          </Link>
          <span className="mobile-company-name">{companyName}</span>
        </div>
        <button className="mobile-menu-btn" onClick={() => setIsOpen(true)}>
          <Menu size={24} />
        </button>
      </div>

      <div 
        className={`slide-overlay ${isOpen ? 'open' : ''}`} 
        onClick={() => setIsOpen(false)}
        style={{ zIndex: 90 }}
      />

      <aside className={`sidebar ${isOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="sidebar-brand-block">
            <Link href="/" className="sidebar-logo" style={{ marginBottom: 0 }}>
              vex<span>yr</span>
            </Link>
            <div className="sidebar-company-name" title={companyName}>
              {companyName}
            </div>
          </div>
          {isOpen && (
            <button className="mobile-menu-btn" style={{ padding: 0, color: 'var(--cream)' }} onClick={() => setIsOpen(false)}>
              <X size={24} />
            </button>
          )}
        </div>

        <div className="sidebar-nav" style={{ marginTop: '2rem' }}>
          {visibleLinks.map((link) => {
            const Icon = link.icon
            const active = isActive(link.href)
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`sidebar-link ${active ? 'active' : ''}`}
                onClick={() => setIsOpen(false)}
              >
                <Icon size={18} strokeWidth={active ? 2 : 1.5} className="sidebar-icon" />
                <span>{link.name}</span>
              </Link>
            )
          })}
        </div>

        <div className="sidebar-footer">
          <form action="/auth/signout" method="POST">
            <button type="submit" className="sidebar-logout">
              <LogOut size={18} strokeWidth={1.5} className="sidebar-icon" />
              <span>Logout</span>
            </button>
          </form>
        </div>
      </aside>
    </>
  )
}
