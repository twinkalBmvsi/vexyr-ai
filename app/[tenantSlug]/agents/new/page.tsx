import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { ArrowLeft } from 'lucide-react'

export default async function NewAgentPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>
}) {
  const resolvedParams = await params
  const supabase = await createClient()

  // ── Gate: check agent limit before rendering the form ──────────────────────
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', resolvedParams.tenantSlug)
    .single()

  if (!tenant) redirect(`/${resolvedParams.tenantSlug}/agents`)

  const [{ count: agentCount }, { data: subscription }] = await Promise.all([
    supabase
      .from('agents')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id),
    supabase
      .from('subscriptions')
      .select('modules')
      .eq('tenant_id', tenant.id)
      .maybeSingle(),
  ])

  let extraBots = 0
  if (subscription?.modules?.extraBots) {
    const eb = subscription.modules.extraBots
    if (typeof eb === 'number') {
      extraBots = eb
    } else if (typeof eb === 'object' && eb.expires_at && new Date(eb.expires_at) > new Date()) {
      extraBots = eb.quantity || 0
    }
  }
  const agentLimit = 1 + extraBots          // 1 base + purchased slots
  const currentCount = agentCount ?? 0

  // Hard redirect if already at or over limit — blocks direct URL access
  if (currentCount >= agentLimit) {
    redirect(`/${resolvedParams.tenantSlug}/agents?limit=true`)
  }
  // ────────────────────────────────────────────────────────────────────────────

  async function createAgent(formData: FormData) {
    'use server'
    
    const supabase = await createClient()

    // Retrieve tenant ID
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', resolvedParams.tenantSlug)
      .single()

    if (!tenant) {
      throw new Error("Tenant not found")
    }

    // Re-check limit in server action to prevent API bypass
    const [{ count: currentAgentCount }, { data: sub }] = await Promise.all([
      supabase
        .from('agents')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant.id),
      supabase
        .from('subscriptions')
        .select('modules')
        .eq('tenant_id', tenant.id)
        .maybeSingle(),
    ])
    let extraBotsInAction = 0
    if (sub?.modules?.extraBots) {
      const eb = sub.modules.extraBots
      if (typeof eb === 'number') {
        extraBotsInAction = eb
      } else if (typeof eb === 'object' && eb.expires_at && new Date(eb.expires_at) > new Date()) {
        extraBotsInAction = eb.quantity || 0
      }
    }
    const limit = 1 + extraBotsInAction
    if ((currentAgentCount ?? 0) >= limit) {
      throw new Error(`Agent limit reached (${limit}). Purchase more agent slots from the Store.`)
    }

    const name = formData.get('name') as string
    const business_name = formData.get('business_name') as string
    const description = formData.get('description') as string
    const services = formData.get('services') as string
    const language = formData.get('language') as string || 'en'
    const timezone = formData.get('timezone') as string || 'UTC'
    const working_hours = formData.get('working_hours') as string
    const appointment_duration = formData.get('appointment_duration') as string

    // Bundle extra fields into a JSON string for business_rules
    const businessRules = JSON.stringify({
      business_name,
      description,
      services,
      working_hours,
      appointment_duration,
      active_channels: [] // Start with all channels off
    })

    const { data: newAgent, error } = await supabase
      .from('agents')
      .insert({
        tenant_id: tenant.id,
        name,
        prompt: '',
        language,
        timezone,
        business_rules: businessRules
      })
      .select('id')
      .single()

    if (error) {
      console.error("Error creating agent:", error)
    }

    redirect(`/${resolvedParams.tenantSlug}/agents`)
  }

  return (
    <div>
      <div className="dash-header" style={{ marginBottom: '2rem' }}>
        <Link href={`/${resolvedParams.tenantSlug}/agents`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--muted)', textDecoration: 'none', marginBottom: '1rem', fontSize: '0.85rem' }}>
          <ArrowLeft size={16} /> Back to Agents
        </Link>
        <h1 className="dash-title">Agent Builder</h1>
        <p className="dash-subtitle">Create a new AI assistant for your business.</p>
      </div>

      <div className="dash-card" style={{ maxWidth: '800px' }}>
        <form action={createAgent} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="dash-form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="name" className="dash-label">Agent Name</label>
            <input type="text" id="name" name="name" required className="dash-input" placeholder="e.g., Support Bot" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="dash-form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="business_name" className="dash-label">Business Name</label>
              <input type="text" id="business_name" name="business_name" required className="dash-input" placeholder="e.g., ABC Dental Clinic" />
            </div>
            <div className="dash-form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="description" className="dash-label">Description</label>
              <input type="text" id="description" name="description" className="dash-input" placeholder="Short description of the organization" />
            </div>
          </div>

          <div className="dash-form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="services" className="dash-label">Services Provided</label>
            <textarea 
              id="services" 
              name="services" 
              className="dash-textarea" 
              placeholder="e.g. Teeth cleaning, whitening, root canals..."
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="dash-form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="language" className="dash-label">Language</label>
              <select id="language" name="language" className="dash-input">
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
              </select>
            </div>
            <div className="dash-form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="timezone" className="dash-label">Timezone</label>
              <select id="timezone" name="timezone" className="dash-input">
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="dash-form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="working_hours" className="dash-label">Working Hours</label>
              <input type="text" id="working_hours" name="working_hours" className="dash-input" placeholder="e.g., Mon-Fri 9AM-5PM" />
            </div>
            <div className="dash-form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="appointment_duration" className="dash-label">Appointment Duration</label>
              <input type="text" id="appointment_duration" name="appointment_duration" className="dash-input" placeholder="e.g., 30 minutes" />
            </div>
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn-primary">Create Agent</button>
          </div>
        </form>
      </div>
    </div>
  )
}
