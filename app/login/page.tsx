'use client'

import { useActionState, useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, CheckCircle, XCircle, Mail } from 'lucide-react'
import { login } from '@/app/auth/actions'
import { useSearchParams } from 'next/navigation'

function LoginForm() {
  const searchParams = useSearchParams()
  const next = searchParams.get('next')
  const verifiedParam = searchParams.get('verified')
  const errorParam = searchParams.get('error')
  const createdParam = searchParams.get('created')

  const [state, formAction, isPending] = useActionState(login, null)
  const [showPassword, setShowPassword] = useState(false)
  const [emailValue, setEmailValue] = useState('')

  useEffect(() => {
    if (state?.redirectUrl) {
      window.location.href = next || state.redirectUrl
    }
  }, [state, next])

  // Detect "Email not confirmed" error from Supabase
  const isUnconfirmedEmail =
    state?.error?.toLowerCase().includes('email not confirmed') ||
    state?.error?.toLowerCase().includes('email_not_confirmed')

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">Sign in to manage your AI agent</p>
        </div>

        {/* ✅ Email verified success banner */}
        {verifiedParam === '1' && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '8px', padding: '0.75rem 1rem',
            color: '#059669', fontSize: '0.85rem', marginBottom: '1rem',
          }}>
            <CheckCircle size={16} style={{ flexShrink: 0 }} />
            <span>Email verified! You can now sign in.</span>
          </div>
        )}

        {/* ✅ Organization created success banner */}
        {createdParam === '1' && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '8px', padding: '0.75rem 1rem',
            color: '#059669', fontSize: '0.85rem', marginBottom: '1rem',
          }}>
            <CheckCircle size={16} style={{ flexShrink: 0 }} />
            <span>Organization created successfully!</span>
          </div>
        )}

        {/* ✅ Query param error banner (e.g., from /auth/confirm failures) */}
        {errorParam && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px', padding: '0.75rem 1rem',
            color: '#dc2626', fontSize: '0.85rem', marginBottom: '1rem',
          }}>
            <XCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorParam}</span>
          </div>
        )}

        <form className="auth-form" action={formAction}>
          {/* Form-level error */}
          {state?.error && (
            <div style={{ color: '#ef4444', fontSize: '0.8rem', textAlign: 'center', marginBottom: '0.5rem' }}>
              {state.error}
            </div>
          )}

          {/* ✅ Resend verification link when email not confirmed */}
          {isUnconfirmedEmail && emailValue && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '8px', padding: '0.75rem 1rem',
              color: '#b45309', fontSize: '0.82rem', marginBottom: '0.5rem',
            }}>
              <Mail size={15} style={{ flexShrink: 0 }} />
              <span>
                Your email is not verified.{' '}
                <Link
                  href={`/verify-email?email=${encodeURIComponent(emailValue)}`}
                  style={{ fontWeight: 600, color: 'inherit', textDecoration: 'underline' }}
                >
                  Resend verification email
                </Link>
              </span>
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
              value={emailValue}
              onChange={(e) => setEmailValue(e.target.value)}
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
                placeholder="••••••••"
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

          <div className="form-footer">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--muted)', cursor: 'pointer' }}>
              <input type="checkbox" style={{ accentColor: 'var(--gold)' }} />
              Remember me
            </label>
            <Link href="/forgot-password" className="auth-link">Forgot password?</Link>
          </div>

          <button type="submit" className="auth-btn" disabled={isPending}>
            {isPending ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-switch">
          Don&apos;t have an account? <Link href="/signup">Sign up</Link>
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={<div className="auth-container"><div className="auth-card">Loading...</div></div>}>
      <LoginForm />
    </Suspense>
  )
}
