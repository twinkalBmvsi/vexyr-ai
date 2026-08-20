import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/service-role'
import {
  buildSupabaseAuthLink,
  getAuthRedirectUrl,
  isSmtpConfigured,
  sendInviteEmail,
} from '@/utils/email/auth-emails'
import crypto from 'crypto'

export async function POST(request: Request) {
  try {
    const { email: rawEmail, name, tenantId } = await request.json()
    const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : ''

    if (!email || !tenantId) {
      return NextResponse.json({ error: 'Email and tenant ID are required' }, { status: 400 })
    }

    const supabase = await createClient()

    // 1. Verify the current user is an owner of the tenant
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminAuthClient = createAdminClient()

    const { data: userRole, error: roleError } = await adminAuthClient
      .from('users')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', tenantId)
      .single()

    if (roleError || !userRole || userRole.role !== 'owner') {
      return NextResponse.json({ error: 'Only owners can invite team members' }, { status: 403 })
    }

    // 2. Check if already a member
    // Since we don't know their user_id yet if they are new, we can check by joining if possible,
    // but we'll just rely on the existing member check by email or wait until they accept.
    // For now, let's create the invite.

    // 3. Create the invite token and record
    const token = crypto.randomUUID()
    const { error: inviteInsertError } = await adminAuthClient
      .from('team_invites')
      .insert({
        tenant_id: tenantId,
        email,
        name: name || null,
        role: 'manager',
        token,
        status: 'pending'
      })

    if (inviteInsertError) {
      return NextResponse.json({ error: 'Failed to create invite record: ' + inviteInsertError.message }, { status: 500 })
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL 
      ? process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '') 
      : `http://${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost'}:3000`
    
    const acceptUrl = `${siteUrl}/invite/accept?token=${token}`

    // 4. Handle Email Sending & Auth Link Generation
    const smtpEnabled = isSmtpConfigured()
    let finalActionUrl = acceptUrl

    if (smtpEnabled) {
      const { data: linkData, error: linkError } = await adminAuthClient.auth.admin.generateLink({
        type: 'invite',
        email,
        options: {
          redirectTo: acceptUrl,
        },
      })

      if (linkError) {
        // If already registered, linkError will contain "already been registered"
        // In that case, they don't need a GoTrue invite link, they just need the direct acceptUrl.
        if (linkError.message.toLowerCase().includes('already been registered')) {
          finalActionUrl = acceptUrl
        } else {
          return NextResponse.json({ error: linkError.message }, { status: 400 })
        }
      } else {
        if (!linkData.properties?.hashed_token) {
          return NextResponse.json({ error: 'Failed to generate invite link.' }, { status: 500 })
        }
        finalActionUrl = buildSupabaseAuthLink('invite', linkData.properties.hashed_token, `/invite/accept?token=${token}`)
      }

      await sendInviteEmail(email, finalActionUrl)
    } else {
      const { error: inviteError } = await adminAuthClient.auth.admin.inviteUserByEmail(email, {
        redirectTo: acceptUrl
      })

      if (inviteError) {
        // If already registered and no SMTP, we can't send them an email natively through Supabase easily.
        // We will return a specific message in this local dev scenario.
        if (inviteError.message.toLowerCase().includes('already been registered')) {
          return NextResponse.json({ message: 'User is already registered. Since SMTP is disabled, they will not receive an email. Please send them this link manually: ' + acceptUrl })
        }
        return NextResponse.json({ error: inviteError.message }, { status: 400 })
      }
    }

    return NextResponse.json({ message: 'Invitation sent successfully' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
