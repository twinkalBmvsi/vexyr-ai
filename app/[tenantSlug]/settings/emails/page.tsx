import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Mail, ArrowRight } from 'lucide-react'
import EmailTemplateEditor from '@/components/settings/EmailTemplateEditor'

export default async function EmailsSettingsPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const resolvedParams = await params
  const supabase = await createClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', resolvedParams.tenantSlug)
    .single()

  if (!tenant) return null

  // Check subscription access
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status, modules')
    .eq('tenant_id', tenant.id)
    .maybeSingle()

  const hasCustomEmails = subscription?.status === 'active' && (subscription.modules as Record<string, any>)?.customEmails === true
  const hasAutoFollowups = subscription?.status === 'active' && (subscription.modules as Record<string, any>)?.autoFollowups === true

  if (!hasCustomEmails) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '4rem 2rem', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: '12px' }}>
        <div style={{ padding: '1.5rem', background: 'rgba(201,168,76,0.1)', borderRadius: '50%', marginBottom: '1.5rem' }}>
          <Mail size={40} color="var(--gold)" />
        </div>
        <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: '2rem', marginBottom: '1rem', color: 'var(--ink)' }}>Custom Emails Module Required</h2>
        <p style={{ color: 'var(--muted)', fontSize: '1rem', maxWidth: '500px', lineHeight: 1.6, marginBottom: '2rem' }}>
          Unlock the ability to fully customize your automated emails. Add your own branding, change the wording of appointment confirmations, send customized follow-ups, and invite your team members with custom messaging.
        </p>
        <Link href={`/${resolvedParams.tenantSlug}/store`} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          Upgrade in Store <ArrowRight size={16} />
        </Link>
      </div>
    )
  }

  // User has access, fetch their templates
  const { data: templates } = await supabase
    .from('email_templates')
    .select('*')
    .eq('tenant_id', tenant.id)

  return (
    <>
      <div style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: '1.8rem', marginBottom: '0.5rem' }}>Custom Email Templates</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
          Design the emails that your AI agent and the Vexyr system sends out automatically.
        </p>
      </div>

      <EmailTemplateEditor tenantId={tenant.id} initialTemplates={templates || []} hasAutoFollowups={hasAutoFollowups} />
    </>
  )
}
