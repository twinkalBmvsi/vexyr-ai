import { buildAuthEmail, isSmtpConfigured, sendSmtpEmail } from '@/utils/email/smtp'

type AuthEmailType = 'signup' | 'invite' | 'recovery'

function getSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
  }

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost'

  return `http://${rootDomain}:3000`
}

export function getAuthRedirectUrl() {
  return `${getSiteUrl()}/auth/confirm`
}

export function buildSupabaseAuthLink(type: AuthEmailType, tokenHash: string, next = '/') {
  const url = new URL('/auth/confirm', getSiteUrl())
  url.searchParams.set('token_hash', tokenHash)
  url.searchParams.set('type', type)
  url.searchParams.set('next', next)

  return url.toString()
}

export async function sendSignupEmail(email: string, actionUrl: string) {
  const { text, html } = buildAuthEmail({
    title: 'Confirm your Vexyr account',
    preview: 'Thanks for signing up. Confirm your email address to finish creating your account.',
    actionText: 'Confirm email',
    actionUrl,
    fallbackText: 'If the button does not work, copy and paste this link into your browser:',
  })

  return sendSmtpEmail({
    to: email,
    subject: 'Confirm your Vexyr account',
    text,
    html,
  })
}

export async function sendPasswordResetEmail(email: string, actionUrl: string) {
  const { text, html } = buildAuthEmail({
    title: 'Reset your Vexyr password',
    preview: 'Use this secure link to reset your password.',
    actionText: 'Reset password',
    actionUrl,
    fallbackText: 'If the button does not work, copy and paste this link into your browser:',
  })

  return sendSmtpEmail({
    to: email,
    subject: 'Reset your Vexyr password',
    text,
    html,
  })
}

export async function sendInviteEmail(email: string, actionUrl: string) {
  const { text, html } = buildAuthEmail({
    title: 'You have been invited to Vexyr',
    preview: 'Accept your invitation to join the workspace and set up your account.',
    actionText: 'Accept invitation',
    actionUrl,
    fallbackText: 'If the button does not work, copy and paste this link into your browser:',
  })

  return sendSmtpEmail({
    to: email,
    subject: 'You have been invited to Vexyr',
    text,
    html,
  })
}

export { isSmtpConfigured }
