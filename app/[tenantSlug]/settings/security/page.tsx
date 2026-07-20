import { BadgeCheck, Clock3, KeyRound, LockKeyhole, ShieldCheck, UserRoundCog } from 'lucide-react'

const protectionRows = [
  {
    title: 'Owner approval for billing changes',
    detail: 'Managers can review plans, but only owners can change subscriptions or payment details.',
    status: 'Owner only',
    checked: true,
  },
  {
    title: 'Expire workspace invitations',
    detail: 'Unused invite links expire after seven days to keep old access from lingering.',
    status: '7 days',
    checked: true,
  },
  {
    title: 'Confirm before removing team members',
    detail: 'Require an explicit confirmation before access is revoked from the workspace.',
    status: 'Enabled',
    checked: true,
  },
  {
    title: 'Protect integrations and API keys',
    detail: 'Require owner access before changing SMS, calendar, email, or webhook credentials.',
    status: 'Owner only',
    checked: true,
  },
]

const activityRows = [
  { title: 'Team invite issued', detail: 'Workspace owner invited a manager', time: 'Recent' },
  { title: 'Password flow requested', detail: 'Secure setup link generated for a teammate', time: 'Recent' },
  { title: 'Billing access checked', detail: 'Policy confirmed owner-level permission', time: 'Automatic' },
]

export default function SecuritySettingsPage() {
  return (
    <div className="settings-page settings-page-refined">
      <div className="settings-hero-line security">
        <span className="settings-kicker">Security Posture</span>
        <h2>Protect the workspace behind every AI conversation.</h2>
        <p>Keep customer data, team access, billing, and channel credentials guarded without slowing down day-to-day operations.</p>
      </div>

      <section className="settings-summary-strip security">
        <div>
          <ShieldCheck size={18} />
          <span>Workspace access</span>
          <strong>Protected</strong>
        </div>
        <div>
          <UserRoundCog size={18} />
          <span>Role controls</span>
          <strong>Active</strong>
        </div>
        <div>
          <Clock3 size={18} />
          <span>Invite expiry</span>
          <strong>7 days</strong>
        </div>
      </section>

      <section className="settings-refined-section settings-two-column">
        <div>
          <div className="settings-refined-heading">
            <KeyRound size={18} />
            <div>
              <h3>Login Protection</h3>
              <p>Baseline account protections for owners and managers.</p>
            </div>
          </div>

          <div className="settings-stat-grid">
            <div>
              <span>Password minimum</span>
              <strong>8+</strong>
            </div>
            <div>
              <span>Session window</span>
              <strong>30d</strong>
            </div>
          </div>

          <button className="btn-secondary settings-icon-button">
            <LockKeyhole size={16} />
            Change Password
          </button>
        </div>

        <div className="settings-soft-panel">
          <BadgeCheck size={18} />
          <h3>Two-step verification</h3>
          <p>Recommended for owners before billing, team, integration, or API key changes.</p>
          <button className="btn-primary">Set Up</button>
        </div>
      </section>

      <section className="settings-refined-section">
        <div className="settings-refined-heading">
          <ShieldCheck size={18} />
          <div>
            <h3>Workspace Safeguards</h3>
            <p>Controls designed around Vexyr teams, channels, and customer conversations.</p>
          </div>
        </div>

        <div className="settings-control-list">
          {protectionRows.map((row) => (
            <label className="settings-control-row" key={row.title}>
              <span className="settings-control-copy">
                <strong>{row.title}</strong>
                <small>{row.detail}</small>
              </span>
              <span className="settings-row-meta">{row.status}</span>
              <input type="checkbox" defaultChecked={row.checked} />
            </label>
          ))}
        </div>
      </section>

      <section className="settings-refined-section">
        <div className="settings-refined-heading">
          <Clock3 size={18} />
          <div>
            <h3>Recent Security Activity</h3>
            <p>A concise trail of sensitive workspace events.</p>
          </div>
        </div>

        <div className="settings-activity-list">
          {activityRows.map((row) => (
            <div className="settings-activity-row" key={row.title}>
              <span>
                <strong>{row.title}</strong>
                <small>{row.detail}</small>
              </span>
              <time>{row.time}</time>
            </div>
          ))}
        </div>
      </section>

      <div className="settings-actions refined">
        <button className="btn-secondary">Discard</button>
        <button className="btn-primary">Save Security Settings</button>
      </div>
    </div>
  )
}
