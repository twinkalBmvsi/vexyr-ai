import { Bot, Building2, Clock3, Globe2, Mail, MapPin } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'

export default async function GeneralSettingsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>
}) {
  const resolvedParams = await params
  const supabase = await createClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, email, slug')
    .eq('slug', resolvedParams.tenantSlug)
    .single()

  const workspaceName = tenant?.name || 'My AI Workspace'
  const supportEmail = tenant?.email || 'support@example.com'
  const workspaceSlug = tenant?.slug || resolvedParams.tenantSlug

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

      <section className="settings-refined-section">
        <div className="settings-refined-heading">
          <Bot size={18} />
          <div>
            <h3>AI Business Context</h3>
            <p>A short operating note helps agents answer with the right tone and boundaries.</p>
          </div>
        </div>

        <div className="settings-field-stack">
          <label>
            <span>Business description</span>
            <textarea rows={4} placeholder="Describe what your business offers, who you serve, and what customers usually ask for." />
          </label>
          <label>
            <span>Preferred tone</span>
            <select defaultValue="warm-professional">
              <option value="warm-professional">Warm and professional</option>
              <option value="friendly-concise">Friendly and concise</option>
              <option value="premium-calm">Premium and calm</option>
              <option value="direct-efficient">Direct and efficient</option>
            </select>
          </label>
        </div>
      </section>

      <section className="settings-refined-section">
        <div className="settings-refined-heading">
          <Clock3 size={18} />
          <div>
            <h3>Operating Defaults</h3>
            <p>Baseline settings used by booking, reminders, and reports.</p>
          </div>
        </div>

        <div className="settings-field-grid three">
          <label>
            <span>Timezone</span>
            <select defaultValue="America/Chicago">
              <option value="America/Chicago">Central Time</option>
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
            </select>
          </label>
          <label>
            <span>Business hours</span>
            <input type="text" defaultValue="Mon-Fri, 9 AM-5 PM" />
          </label>
          <label>
            <span>Location</span>
            <div className="settings-input-with-icon">
              <MapPin size={16} />
              <input type="text" placeholder="City, state" />
            </div>
          </label>
        </div>
      </section>

      <div className="settings-actions refined">
        <button className="btn-secondary">Cancel</button>
        <button className="btn-primary">Save General Settings</button>
      </div>
    </div>
  )
}
