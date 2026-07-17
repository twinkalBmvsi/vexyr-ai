'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Bot, LogOut, Calendar, Users, Settings, Smartphone } from 'lucide-react'

export default function Sidebar({ tenantSlug }: { tenantSlug: string }) {
  const pathname = usePathname()

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
      // The exact overview page
      return pathname === '/'
    }
    return pathname.startsWith(href)
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <Link href="/" className="sidebar-logo">
          vex<span>yr</span>
        </Link>
      </div>

      <div className="sidebar-nav">
        {links.map((link) => {
          const Icon = link.icon
          const active = isActive(link.href)
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`sidebar-link ${active ? 'active' : ''}`}
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
  )
}
