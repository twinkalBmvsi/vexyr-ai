import Link from 'next/link'
import { AlertTriangle, AlertCircle } from 'lucide-react'

interface SubscriptionBannerProps {
  status: string
  currentPeriodEnd: string | null
  tenantSlug: string
}

export default function SubscriptionBanner({ status, currentPeriodEnd, tenantSlug }: SubscriptionBannerProps) {
  // If no subscription status is known, we default to hidden
  if (!status) return null

  const isExpired = status !== 'active' && status !== 'trialing'
  let isExpiringSoon = false
  let daysLeft = 0

  if (!isExpired && currentPeriodEnd) {
    const end = new Date(currentPeriodEnd).getTime()
    const now = new Date().getTime()
    const diff = end - now
    daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24))

    if (daysLeft > 0 && daysLeft <= 10) {
      isExpiringSoon = true
    } else if (daysLeft <= 0) {
      // Sometimes webhooks are delayed, if it's past the date, we treat it as expired warning
      isExpiringSoon = true
      daysLeft = 0
    }
  }

  if (isExpired) {
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
        width: '100%'
      }}>
        <AlertCircle size={18} />
        Your subscription has expired. Premium modules and services are disabled.
        <Link href="/settings/billing" style={{ color: '#991b1b', textDecoration: 'underline', marginLeft: '8px', fontWeight: 600 }}>
          Renew now
        </Link>
      </div>
    )
  }

  if (isExpiringSoon) {
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
        width: '100%'
      }}>
        <AlertTriangle size={18} />
        {daysLeft > 0 
          ? `Your subscription will expire in ${daysLeft} day${daysLeft > 1 ? 's' : ''}. Please renew to avoid service interruption.`
          : 'Your subscription is expiring today. Please renew to avoid service interruption.'}
        <Link href="/settings/billing" style={{ color: '#92400e', textDecoration: 'underline', marginLeft: '8px', fontWeight: 600 }}>
          Renew now
        </Link>
      </div>
    )
  }

  return null
}
