import { Bot, Building2, Clock3, Globe2, Mail, MapPin } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import BusinessHoursSettings from '@/components/settings/BusinessHoursSettings'
import { getBusinessHours } from '@/app/actions/settings'

export default async function GeneralSettingsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>
}) {
  const resolvedParams = await params
  const supabase = await createClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, email, slug')
    .eq('slug', resolvedParams.tenantSlug)
    .single()

  const workspaceName = tenant?.name || 'My AI Workspace'
  const supportEmail = tenant?.email || 'support@example.com'
  const workspaceSlug = tenant?.slug || resolvedParams.tenantSlug

  const businessHours = await getBusinessHours(tenant?.id)

  return (
    <div className="settings-page settings-page-refined">
      <div className="settings-hero-line">
        <span className="settings-kicker">Workspace Profile</span>
        <h2>Shape how Vexyr represents your business.</h2>
        <p>These details appear across your dashboard and help your AI agent sound consistent when it greets customers, confirms appointments, and routes follow-ups.</p>
      </div>

      <section className="settings-summary-strip">
        <div>
          <Building2 size={18} />
          <span>Workspace</span>
          <strong>{workspaceName}</strong>
        </div>
        <div>
          <Globe2 size={18} />
          <span>Dashboard slug</span>
          <strong>{workspaceSlug}</strong>
        </div>
        <div>
          <Mail size={18} />
          <span>Support email</span>
          <strong>{supportEmail}</strong>
        </div>
      </section>

      <section className="settings-refined-section">
        <div className="settings-refined-heading">
          <Building2 size={18} />
          <div>
            <h3>Business Identity</h3>
            <p>The public-facing details your customers and team recognize.</p>
          </div>
        </div>

        <div className="settings-field-grid">
          <label>
            <span>Workspace name</span>
            <input type="text" defaultValue={workspaceName} />
          </label>
          <label>
            <span>Business category</span>
            <select defaultValue="service-business">
              <option value="service-business">Service business</option>
              <option value="beauty-wellness">Beauty & wellness</option>
              <option value="home-services">Home services</option>
              <option value="medical">Medical or clinic</option>
              <option value="consulting">Consulting</option>
            </select>
          </label>
          <label>
            <span>Workspace slug</span>
            <input type="text" defaultValue={workspaceSlug} />
          </label>
          <label>
            <span>Website</span>
            <input type="url" placeholder="https://example.com" />
          </label>
        </div>
      </section>

      <section className="settings-refined-section settings-two-column">
        <div>
          <div className="settings-refined-heading">
            <Mail size={18} />
            <div>
              <h3>Customer Contact</h3>
              <p>Where customers should be directed when the AI needs to hand off.</p>
            </div>
          </div>

          <div className="settings-field-stack">
            <label>
              <span>Support email</span>
              <input type="email" defaultValue={supportEmail} />
            </label>
            <label>
              <span>Business phone</span>
              <input type="tel" placeholder="+1 (555) 123-4567" />
            </label>
            <label>
              <span>Customer reply name</span>
              <input type="text" defaultValue={workspaceName} />
            </label>
          </div>
        </div>

        <div className="settings-soft-panel">
          <Bot size={18} />
          <h3>Agent handoff voice</h3>
          <p>Use one clear customer contact. Vexyr can route uncertain requests there when a human should step in.</p>
        </div>
      </section>



      <BusinessHoursSettings tenantId={tenant?.id} initialConfig={businessHours} />

      <div className="settings-actions refined">
        <button className="btn-secondary">Cancel</button>
        <button className="btn-primary">Save General Settings</button>
      </div>
    </div>
  )
}
