'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Mail, RefreshCw, CheckCircle, ArrowLeft } from 'lucide-react'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''

  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [cooldown, setCooldown] = useState(0)

  const handleResend = async () => {
    if (resendState === 'sending' || cooldown > 0) return

    setResendState('sending')
    setErrorMsg('')

    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to resend email')
      }

      setResendState('sent')

      // 60s cooldown before allowing resend again
      let seconds = 60
      setCooldown(seconds)
      const interval = setInterval(() => {
        seconds -= 1
        setCooldown(seconds)
        if (seconds <= 0) {
          clearInterval(interval)
          setResendState('idle')
        }
      }, 1000)
    } catch (err) {
      setResendState('error')
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ textAlign: 'center' }}>

        {/* Icon */}
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(var(--gold-rgb, 180,140,60), 0.15), rgba(var(--gold-rgb, 180,140,60), 0.05))',
          border: '1.5px solid rgba(180,140,60,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.5rem',
        }}>
          <Mail size={28} style={{ color: 'var(--gold, #b48c3c)' }} />
        </div>

        <div className="auth-header" style={{ marginBottom: '1.5rem' }}>
          <h1 className="auth-title">Check your email</h1>
          <p className="auth-subtitle">
            We sent a verification link to
          </p>
          {email && (
            <p style={{
              fontWeight: 600, color: 'var(--ink)',
              fontSize: '0.95rem', marginTop: '0.25rem',
              wordBreak: 'break-all',
            }}>
              {email}
            </p>
          )}
          <p className="auth-subtitle" style={{ marginTop: '0.75rem' }}>
            Click the link in the email to confirm your account. Check your spam folder if you don&apos;t see it.
          </p>
        </div>

        {/* Resend section */}
        <div style={{ marginBottom: '1.5rem' }}>
          {resendState === 'sent' ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '8px', padding: '0.75rem 1rem',
              color: '#059669', fontSize: '0.85rem',
            }}>
              <CheckCircle size={16} />
              <span>
                Email sent!{cooldown > 0 && ` Resend again in ${cooldown}s`}
              </span>
            </div>
          ) : resendState === 'error' ? (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px', padding: '0.75rem 1rem',
              color: '#dc2626', fontSize: '0.85rem', marginBottom: '0.75rem',
            }}>
              {errorMsg || 'Failed to resend. Please try again.'}
            </div>
          ) : null}

          {resendState !== 'sent' && (
            <button
              onClick={handleResend}
              disabled={resendState === 'sending' || cooldown > 0}
              className="auth-btn"
              style={{ marginTop: resendState === 'error' ? '0' : '0', width: '100%' }}
            >
              {resendState === 'sending' ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} />
                  Sending...
                </span>
              ) : cooldown > 0 ? (
                `Resend in ${cooldown}s`
              ) : (
                'Resend verification email'
              )}
            </button>
          )}
        </div>

        {/* Back to login */}
        <div className="auth-switch">
          <Link
            href="/login"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', textDecoration: 'none' }}
            className="auth-link"
          >
            <ArrowLeft size={14} />
            Back to sign in
          </Link>
        </div>

      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="auth-container">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--muted)' }}>Loading...</p>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
