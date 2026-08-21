import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { CalendarSync } from 'lucide-react'
import FollowUpSettingsClient from '@/components/settings/FollowUpSettingsClient'

export default async function FollowUpsSettingsPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
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

  if (!roleData || (roleData.role !== 'owner' && !roleData.access_pages?.includes('settings/follow-ups'))) {
    return notFound()
  }

  // Check subscription access
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status, modules')
    .eq('tenant_id', tenant.id)
    .maybeSingle()

  const hasAutoFollowups = subscription?.status === 'active' && (subscription.modules as Record<string, any>)?.autoFollowups === true

  if (!hasAutoFollowups) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '4rem 2rem', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: '12px' }}>
        <div style={{ padding: '1.5rem', background: 'rgba(201,168,76,0.1)', borderRadius: '50%', marginBottom: '1.5rem' }}>
          <CalendarSync size={40} color="var(--gold)" />
        </div>
        <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: '2rem', marginBottom: '1rem', color: 'var(--ink)' }}>Auto Follow-ups Module Required</h2>
        <p style={{ color: 'var(--muted)', fontSize: '1rem', maxWidth: '500px', lineHeight: 1.6, marginBottom: '2rem' }}>
          Unlock the ability to automatically engage your customers after their appointments. Ask for reviews, request feedback, and bring customers back to your business without lifting a finger.
        </p>
        <a href={`/${resolvedParams.tenantSlug}/store`} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
          Upgrade in Store
        </a>
      </div>
    )
  }

  // Fetch current config
  // @ts-ignore
  const { getFollowUpConfig } = await import('@/app/actions/followup')
  const config = await getFollowUpConfig(tenant.id)

  return (
    <div style={{ maxWidth: '800px' }}>
      <div className="dash-header">
        <h1 className="dash-title">Automated Follow-ups</h1>
        <p className="dash-subtitle">Configure how and when your AI agent follows up with customers after their appointment.</p>
      </div>

      <FollowUpSettingsClient tenantId={tenant.id} initialConfig={config} />
    </div>
  )
}
