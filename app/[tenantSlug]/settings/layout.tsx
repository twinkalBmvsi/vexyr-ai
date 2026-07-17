import SettingsSidebar from './SettingsSidebar'

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="dash-header">
        <h1 className="dash-title">Settings</h1>
        <p className="dash-subtitle">Configure your workspace and preferences.</p>
      </div>

      <div className="dash-grid" style={{ gridTemplateColumns: '250px 1fr', gap: '2rem', alignItems: 'start' }}>
        <SettingsSidebar />

        <div className="dash-card" style={{ padding: '3rem' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
