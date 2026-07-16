import { Users, Search, MoreVertical } from 'lucide-react'

export default async function CustomersPage() {
  const customers = [
    { id: 1, name: 'John Doe', email: 'john@example.com', status: 'Active', joined: 'Aug 1, 2026' },
    { id: 2, name: 'Sarah Smith', email: 'sarah@example.com', status: 'Active', joined: 'Aug 3, 2026' },
    { id: 3, name: 'Mike Johnson', email: 'mike@example.com', status: 'Inactive', joined: 'Jul 28, 2026' },
  ]

  return (
    <div>
      <div className="dash-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="dash-title">Customers</h1>
            <p className="dash-subtitle">View and manage your customer database.</p>
          </div>
          <button className="btn-primary">Export CSV</button>
        </div>
      </div>

      <div className="dash-card">
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', flexGrow: 1, maxWidth: '400px' }}>
            <Search size={16} color="var(--muted)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input type="text" placeholder="Search customers..." style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', border: '1px solid var(--border)', background: 'transparent', color: 'var(--ink)', fontFamily: 'DM Sans', fontSize: '0.85rem' }} />
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '1rem', fontFamily: 'DM Mono', fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Name</th>
              <th style={{ padding: '1rem', fontFamily: 'DM Mono', fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Email</th>
              <th style={{ padding: '1rem', fontFamily: 'DM Mono', fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Status</th>
              <th style={{ padding: '1rem', fontFamily: 'DM Mono', fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Joined</th>
              <th style={{ padding: '1rem', fontFamily: 'DM Mono', fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '1rem', fontSize: '0.85rem' }}>{c.name}</td>
                <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--muted)' }}>{c.email}</td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ 
                    fontFamily: 'DM Mono', 
                    fontSize: '0.65rem', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.1em',
                    padding: '0.3rem 0.6rem',
                    background: c.status === 'Active' ? 'rgba(42, 122, 74, 0.1)' : 'var(--border)',
                    color: c.status === 'Active' ? '#2a7a4a' : 'var(--muted)'
                  }}>
                    {c.status}
                  </span>
                </td>
                <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--muted)' }}>{c.joined}</td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
                    <MoreVertical size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
