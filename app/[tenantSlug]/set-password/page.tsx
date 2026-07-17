'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useParams, useRouter } from 'next/navigation'

export default function SetPasswordPage() {
  const params = useParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    const { error: updateError } = await supabase.auth.updateUser({
      password: password
    })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    // Redirect to dashboard
    router.push('/')
    router.refresh()
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--paper)', padding: '2rem' }}>
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '8px', padding: '3rem', width: '100%', maxWidth: '400px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <h1 style={{ fontFamily: 'Cormorant Garamond', fontSize: '2rem', marginBottom: '0.5rem', color: 'var(--ink)' }}>Welcome!</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>Please set your password to complete your account setup.</p>

        {error && (
          <div style={{ background: 'rgba(220, 38, 38, 0.1)', color: '#dc2626', padding: '0.75rem', borderRadius: '4px', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.5rem' }}>New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '1rem', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.5rem' }}>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '1rem', boxSizing: 'border-box' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', marginTop: '1rem', justifyContent: 'center' }}
          >
            {loading ? 'Saving...' : 'Set Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
