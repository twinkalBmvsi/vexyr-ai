'use client'

import { useState } from 'react'
import { Search, MoreVertical } from 'lucide-react'

type Customer = {
  id: number
  name: string
  email: string
  status: string
  joined: string
}

export default function CustomersClient({ initialCustomers }: { initialCustomers: Customer[] }) {
  const [search, setSearch] = useState('')

  const filteredCustomers = initialCustomers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    c.status.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="dash-card">
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flexGrow: 1, maxWidth: '400px' }}>
          <Search size={16} color="var(--muted)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="Search customers by name, email, or status..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', border: '1px solid var(--border)', background: 'transparent', color: 'var(--ink)', fontFamily: 'DM Sans', fontSize: '0.85rem' }} 
          />
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
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
            {filteredCustomers.length > 0 ? (
              filteredCustomers.map((c) => (
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
                      color: c.status === 'Active' ? '#2a7a4a' : 'var(--muted)',
                      whiteSpace: 'nowrap'
                    }}>
                      {c.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{c.joined}</td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
                      <MoreVertical size={16} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem' }}>
                  No customers found matching "{search}"
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
