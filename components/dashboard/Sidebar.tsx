'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Bot, MessageCircle, CreditCard, LogOut, Calendar } from 'lucide-react'

export default function Sidebar({ tenantSlug }: { tenantSlug: string }) {
  const pathname = usePathname()

  const links = [
    { name: 'Overview', href: '/', icon: LayoutDashboard },
    { name: 'Calendar', href: '/calendar', icon: Calendar },
    { name: 'Agents', href: '/agents', icon: Bot },
    { name: 'Connections', href: '/connections', icon: MessageCircle },
    { name: 'Subscription', href: '/subscription', icon: CreditCard },
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
      <Link href="/" className="sidebar-logo">
        vex<span>yr</span>
      </Link>
      
      <nav className="sidebar-nav">
        {links.map((link) => {
          const Icon = link.icon
          const active = isActive(link.href)
          return (
            <Link 
              key={link.name} 
              href={link.href}
              className={`sidebar-link ${active ? 'active' : ''}`}
            >
              <Icon size={16} strokeWidth={active ? 2.5 : 1.5} />
              {link.name}
            </Link>
          )
        })}
      </nav>

      <div className="sidebar-bottom">
        <form action="/auth/signout" method="POST">
          <button type="submit" className="sidebar-link" style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>
            <LogOut size={16} strokeWidth={1.5} />
            Logout
          </button>
        </form>
      </div>
    </aside>
  )
}
