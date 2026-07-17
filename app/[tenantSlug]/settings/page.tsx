export default async function GeneralSettingsPage() {
  return (
    <>
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
    </>
  )
}
