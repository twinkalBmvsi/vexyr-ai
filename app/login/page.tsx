'use client'

import { useActionState, useEffect } from 'react'
import { login } from '@/app/auth/actions'

export default function Login() {
  const [state, formAction, isPending] = useActionState(login, null)

  useEffect(() => {
    if (state?.redirectUrl) {
      window.location.href = state.redirectUrl
    }
  }, [state])

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">Sign in to manage your AI agent</p>
        </div>

        <form className="auth-form" action={formAction}>
          {state?.error && (
            <div style={{ color: '#ef4444', fontSize: '0.8rem', textAlign: 'center', marginBottom: '0.5rem' }}>
              {state.error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <input 
              type="email" 
              id="email" 
              name="email" 
              className="form-input" 
              placeholder="name@company.com" 
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input 
              type="password" 
              id="password" 
              name="password" 
              className="form-input" 
              placeholder="••••••••" 
              required 
            />
          </div>

          <div className="form-footer">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--muted)', cursor: 'pointer' }}>
              <input type="checkbox" style={{ accentColor: 'var(--gold)' }} />
              Remember me
            </label>
            <a href="/forgot-password" className="auth-link">Forgot password?</a>
          </div>

          <button type="submit" className="auth-btn" disabled={isPending}>
            {isPending ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-switch">
          Don't have an account? <a href="/signup">Sign up</a>
        </div>
      </div>
    </div>
  );
}
