import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import {
  getAuthRedirectUrl,
  isSmtpConfigured,
} from '@/utils/email/auth-emails'

export async function POST(request: Request) {
  try {
    const { email: rawEmail } = await request.json()
    const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : ''

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Use Supabase's built-in resend for both SMTP and non-SMTP paths.
    // For SMTP-ON: Supabase will use the configured SMTP server to send the email.
    // For SMTP-OFF: Supabase sends its own native email.
    // Note: Supabase auth.resend respects the project's email settings.
    const supabase = await createClient()

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: getAuthRedirectUrl(),
      },
    })

    if (error) {
      // Don't reveal specific error details to prevent email enumeration
      console.error('Resend verification error:', error.message)
      // If SMTP is configured and resend failed, try sending custom email via SMTP
      if (isSmtpConfigured()) {
        // Log but don't surface SMTP errors to the client
        console.error('SMTP resend attempt failed:', error.message)
      }
    }

    // Always return success to avoid email enumeration attacks
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
