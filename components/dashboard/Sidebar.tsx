'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Bot, LogOut, Calendar, Users, Settings, Smartphone, Menu, X } from 'lucide-react'

export default function Sidebar({ companyName }: { tenantSlug: string, companyName: string }) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  const links = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Appointments', href: '/appointments', icon: Calendar },
    { name: 'Agents', href: '/agents', icon: Bot },
    { name: 'Channels', href: '/connections', icon: Smartphone },
    { name: 'Customers', href: '/customers', icon: Users },
    { name: 'Settings', href: '/settings', icon: Settings },
  ]

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
          {links.map((link) => {
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
