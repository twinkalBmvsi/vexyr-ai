import { Settings as SettingsIcon, Bell, Lock, User } from 'lucide-react'

export default async function SettingsPage() {
  return (
    <div>
      <div className="dash-header">
        <h1 className="dash-title">Settings</h1>
        <p className="dash-subtitle">Configure your workspace and preferences.</p>
      </div>

      <div className="dash-grid" style={{ gridTemplateColumns: '250px 1fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Settings Sidebar */}
        <div className="dash-card" style={{ padding: '1.5rem' }}>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li>
              <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'var(--ink)', color: 'var(--paper)', border: 'none', fontFamily: 'DM Sans', fontSize: '0.85rem', cursor: 'pointer', textAlign: 'left' }}>
                <SettingsIcon size={16} />
                General
              </button>
            </li>
            <li>
              <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'transparent', color: 'var(--muted)', border: 'none', fontFamily: 'DM Sans', fontSize: '0.85rem', cursor: 'pointer', textAlign: 'left', transition: 'color 0.2s' }}>
                <User size={16} />
                Team
              </button>
            </li>
            <li>
              <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'transparent', color: 'var(--muted)', border: 'none', fontFamily: 'DM Sans', fontSize: '0.85rem', cursor: 'pointer', textAlign: 'left', transition: 'color 0.2s' }}>
                <Bell size={16} />
                Notifications
              </button>
            </li>
            <li>
              <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'transparent', color: 'var(--muted)', border: 'none', fontFamily: 'DM Sans', fontSize: '0.85rem', cursor: 'pointer', textAlign: 'left', transition: 'color 0.2s' }}>
                <Lock size={16} />
                Security
              </button>
            </li>
          </ul>
        </div>

        {/* Settings Content */}
        <div className="dash-card" style={{ padding: '3rem' }}>
          <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: '1.8rem', marginBottom: '2rem' }}>General Settings</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            <div>
              <label style={{ display: 'block', fontFamily: 'DM Mono', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: '0.5rem' }}>Workspace Name</label>
              <input type="text" defaultValue="My AI Workspace" style={{ width: '100%', maxWidth: '400px', padding: '0.75rem 1rem', border: '1px solid var(--border)', background: 'transparent', color: 'var(--ink)', fontFamily: 'DM Sans', fontSize: '0.85rem' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontFamily: 'DM Mono', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: '0.5rem' }}>Support Email</label>
              <input type="email" defaultValue="support@example.com" style={{ width: '100%', maxWidth: '400px', padding: '0.75rem 1rem', border: '1px solid var(--border)', background: 'transparent', color: 'var(--ink)', fontFamily: 'DM Sans', fontSize: '0.85rem' }} />
              <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.5rem' }}>This email will be visible to your customers.</p>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '2rem', marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-primary">Save Changes</button>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}
