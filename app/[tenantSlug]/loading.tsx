import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'center', 
      alignItems: 'center', 
      height: 'calc(100vh - 100px)',
      color: 'var(--gold)',
      gap: '1rem'
    }}>
      <Loader2 size={40} className="spinner" />
      <p style={{ color: 'var(--muted)', fontSize: '0.9rem', fontFamily: 'var(--font-mono)' }}>Loading...</p>
    </div>
  )
}
