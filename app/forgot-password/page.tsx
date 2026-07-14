'use client'

import { useActionState } from 'react'
import { resetPassword } from '@/app/auth/actions'

export default function ForgotPassword() {
  const [state, formAction, isPending] = useActionState(resetPassword, null)

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Reset password</h1>
          <p className="auth-subtitle">Enter your email to receive a reset link</p>
        </div>

        <form className="auth-form" action={formAction}>
          {state?.error && (
            <div style={{ color: '#ef4444', fontSize: '0.8rem', textAlign: 'center', marginBottom: '0.5rem' }}>
              {state.error}
            </div>
          )}

          {state?.success && (
            <div style={{ color: '#10b981', fontSize: '0.8rem', textAlign: 'center', marginBottom: '0.5rem' }}>
              {state.success}
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

          <button type="submit" className="auth-btn" style={{ marginTop: '0.5rem' }} disabled={isPending}>
            {isPending ? 'Sending Link...' : 'Send Reset Link'}
          </button>
        </form>

        <div className="auth-switch">
          Remember your password? <a href="/login">Sign in</a>
        </div>
      </div>
    </div>
  );
}
