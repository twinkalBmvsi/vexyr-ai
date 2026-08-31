import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { Megaphone } from 'lucide-react'
import BroadcastsClient from './BroadcastsClient'

export default async function BroadcastsSettingsPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const resolvedParams = await params
  const supabase = await createClient()

  // Verify auth and get tenant
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return notFound()
  }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name')
    .eq('slug', resolvedParams.tenantSlug)
    .single()

  if (!tenant) {
    return notFound()
  }

  // Check user privileges
  const { data: roleData } = await supabase
    .from('users')
    .select('role, access_pages')
    .eq('user_id', user.id)
    .eq('tenant_id', tenant.id)
    .single()

  if (!roleData || (roleData.role !== 'owner' && !roleData.access_pages?.includes('settings/broadcasts'))) {
    return notFound()
  }

  // Check subscription access
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status, modules')
    .eq('tenant_id', tenant.id)
    .maybeSingle()

  const broadcastMod = (subscription?.modules as Record<string, any>)?.broadcastMessaging
  const hasBroadcastMessaging = subscription?.status === 'active' && broadcastMod && (
    broadcastMod === true ||
    (typeof broadcastMod === 'object' && broadcastMod.expires_at && new Date(broadcastMod.expires_at) > new Date())
  )

  if (!hasBroadcastMessaging) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '4rem 2rem', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: '12px' }}>
        <div style={{ padding: '1.5rem', background: 'rgba(201,168,76,0.1)', borderRadius: '50%', marginBottom: '1.5rem' }}>
          <Megaphone size={40} color="var(--gold)" />
        </div>
        <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: '2rem', marginBottom: '1rem', color: 'var(--ink)' }}>Broadcast Messaging Required</h2>
        <p style={{ color: 'var(--muted)', fontSize: '1rem', maxWidth: '500px', lineHeight: 1.6, marginBottom: '2rem' }}>
          Unlock the ability to send promotional blasts and updates to your entire customer base. Keep your audience engaged with the click of a button.
        </p>
        <a href={`/${resolvedParams.tenantSlug}/store`} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
          Upgrade in Store
        </a>
      </div>
    )
  }

  // Fetch all active customers (we need email, phone, and channel for multi-channel broadcasting)
  const { data: rawCustomers } = await supabase
    .from('customers')
    .select('id, name, email, phone, channel')
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: false })

  // Deduplicate for each channel to prevent multiple sends
  const uniqueEmails = new Set()
  const uniquePhones = new Set()
  const customers = (rawCustomers || []).map((c: any) => {
    let hasUniqueEmail = false
    let hasUniquePhone = false

    if (c.email && !uniqueEmails.has(c.email.toLowerCase())) {
      hasUniqueEmail = true
      uniqueEmails.add(c.email.toLowerCase())
    }
    
    if (c.phone && !uniquePhones.has(c.phone)) {
      hasUniquePhone = true
      uniquePhones.add(c.phone)
    }

    return {
      ...c,
      _hasUniqueEmail: hasUniqueEmail,
      _hasUniquePhone: hasUniquePhone
    }
  })

  // Check if Telegram is configured
  const { data: telegramChannel } = await supabase
    .from('channels')
    .select('id')
    .eq('tenant_id', tenant.id)
    .eq('provider', 'telegram')
    .eq('is_active', true)
    .maybeSingle()

  const isTelegramConfigured = !!telegramChannel

  return (
    <div>
      <div className="dash-header">
        <h1 className="dash-title">Marketing Broadcasts</h1>
        <p className="dash-subtitle">Send promotional messages to your customers across multiple channels.</p>
      </div>

      <BroadcastsClient 
        tenantId={tenant.id} 
        customers={customers} 
        isTelegramConfigured={isTelegramConfigured} 
      />
    </div>
  )
}
