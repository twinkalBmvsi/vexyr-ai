import { AlertCircle, CalendarCheck, Mail, MessageSquareText, Send, Smartphone } from 'lucide-react'

const alertRows = [
  {
    title: 'Lead captured by an AI agent',
    detail: 'Send when a new customer shares a name, phone, email, or booking intent.',
    channel: 'Email + in-app',
    checked: true,
  },
  {
    title: 'Human takeover needed',
    detail: 'Send immediately when confidence is low, sentiment drops, or the customer asks for a person.',
    channel: 'Critical',
    checked: true,
  },
  {
    title: 'Appointment booked or changed',
    detail: 'Notify the team when an appointment is created, cancelled, or rescheduled.',
    channel: 'Email',
    checked: true,
  },
  {
    title: 'Channel connection fails',
    detail: 'Alert owners when SMS, email, calendar, or messaging integrations need attention.',
    channel: 'Critical',
    checked: true,
  },
  {
    title: 'Weekly workspace brief',
    detail: 'A Monday snapshot of conversations, bookings, missed leads, and agent performance.',
    channel: 'Email',
    checked: false,
  },
]

export default function NotificationsSettingsPage() {
  return (
    <div className="settings-page settings-page-refined">
      <div className="settings-hero-line">
        <span className="settings-kicker">Notification Center</span>
        <h2>Keep the team aware without adding noise.</h2>
        <p>Vexyr should interrupt you only when the AI receptionist finds a real lead, books time, or needs a human hand.</p>
      </div>

      <section className="settings-summary-strip">
        <div>
          <Mail size={18} />
          <span>Email</span>
          <strong>Primary</strong>
        </div>
        <div>
          <Smartphone size={18} />
          <span>In-app</span>
          <strong>Enabled</strong>
        </div>
        <div>
          <AlertCircle size={18} />
          <span>Critical alerts</span>
          <strong>Always on</strong>
        </div>
      </section>

      <section className="settings-refined-section">
        <div className="settings-refined-heading">
          <MessageSquareText size={18} />
          <div>
            <h3>AI Conversation Alerts</h3>
            <p>Notifications tied to leads, handoffs, booking changes, and broken channels.</p>
          </div>
        </div>

        <div className="settings-control-list">
          {alertRows.map((row) => (
            <label className="settings-control-row" key={row.title}>
              <span className="settings-control-copy">
                <strong>{row.title}</strong>
                <small>{row.detail}</small>
              </span>
              <span className="settings-row-meta">{row.channel}</span>
              <input type="checkbox" defaultChecked={row.checked} />
            </label>
          ))}
        </div>
      </section>

      <section className="settings-refined-section settings-two-column">
        <div>
          <div className="settings-refined-heading">
            <CalendarCheck size={18} />
            <div>
              <h3>Digest Timing</h3>
              <p>Send summaries when the business is ready to act on them.</p>
            </div>
          </div>
          <div className="settings-field-stack">
            <label>
              <span>Daily booking digest</span>
              <select defaultValue="08:00">
                <option value="08:00">8:00 AM</option>
                <option value="09:00">9:00 AM</option>
                <option value="17:00">5:00 PM</option>
              </select>
            </label>
            <label>
              <span>Quiet hours</span>
              <div className="settings-time-pair">
                <input type="time" defaultValue="20:00" />
                <input type="time" defaultValue="08:00" />
              </div>
            </label>
          </div>
        </div>

        <div className="settings-soft-panel">
          <Send size={18} />
          <h3>Recommended setup</h3>
          <p>Keep critical alerts immediate. Batch everything else into the daily digest so your team can review leads and appointments together.</p>
        </div>
      </section>

      <div className="settings-actions refined">
        <button className="btn-secondary">Restore Defaults</button>
        <button className="btn-primary">Save Preferences</button>
      </div>
    </div>
  )
}
