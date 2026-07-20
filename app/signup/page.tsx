'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { signup } from '@/app/auth/actions'

export default function Signup() {
  const [state, formAction, isPending] = useActionState(signup, null)
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Create account</h1>
          <p className="auth-subtitle">Join hundreds of small businesses on Vexyr</p>
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
            <label className="form-label" htmlFor="fullName">Full Name</label>
            <input 
              type="text" 
              id="fullName" 
              name="fullName" 
              className="form-input" 
              placeholder="Priya Patel" 
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="businessName">Business Name</label>
            <input 
              type="text" 
              id="businessName" 
              name="businessName" 
              className="form-input" 
              placeholder="Glamour Studio" 
              required 
            />
          </div>

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
            <div className="password-input-wrap">
              <input 
                type={showPassword ? 'text' : 'password'} 
                id="password" 
                name="password" 
                className="form-input password-input" 
                placeholder="Create a strong password" 
                required 
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="auth-btn" style={{ marginTop: '0.5rem' }} disabled={isPending}>
            {isPending ? 'Creating Account...' : 'Start Free Trial'}
          </button>
        </form>

        <div className="auth-switch">
          Already have an account? <Link href="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
