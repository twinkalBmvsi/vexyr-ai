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

    // Fetch tenant name for email customization
    const { data: tenantData } = await adminAuthClient
      .from('tenants')
      .select('name')
      .eq('id', tenantId)
      .single()
    
    const tenantName = tenantData?.name

    // 2. Check if already a member
    // Since we don't know their user_id yet if they are new, we can check by joining if possible,
    // but we'll just rely on the existing member check by email or wait until they accept.
    // For now, let's create the invite.

    // 3. Create the invite token and record
    // First, delete any existing pending invites for this email and tenant to prevent duplicates
    await adminAuthClient
      .from('team_invites')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('email', email)
      .eq('status', 'pending')

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

      // Step 1: Check if tenant has active customEmails subscription
      const { data: sub } = await adminAuthClient
        .from('subscriptions')
        .select('modules')
        .eq('tenant_id', tenantId)
        .maybeSingle()

      const customEmailsMod = (sub?.modules as any)?.customEmails
      const hasCustomEmails = !!customEmailsMod && (
        customEmailsMod === true ||
        (typeof customEmailsMod === 'object' && customEmailsMod.expires_at && new Date(customEmailsMod.expires_at) > new Date())
      )

      // Step 2: If yes, check if a custom team_invite template exists
      let usedCustomTemplate = false
      if (hasCustomEmails) {
        const { data: inviteTemplate } = await adminAuthClient
          .from('email_templates')
          .select('subject, body')
          .eq('tenant_id', tenantId)
          .eq('template_type', 'team_invite')
          .maybeSingle()

        // Step 3: If custom template found, use it
        if (inviteTemplate?.subject && inviteTemplate?.body) {
          const interpolate = (str: string) =>
            str
              .replace(/\{\{business_name\}\}/g, tenantName || 'Our Team')
              .replace(/\{\{team_member_name\}\}/g, name || email)
              .replace(/\{\{invite_link\}\}/g, finalActionUrl)

          const subject = interpolate(inviteTemplate.subject)
          const bodyHtml = interpolate(inviteTemplate.body)
          const bodyText = bodyHtml.replace(/<[^>]+>/g, '')

          const { sendSmtpEmail } = await import('@/utils/email/smtp')
          await sendSmtpEmail({ to: email, subject, text: bodyText, html: bodyHtml })
          usedCustomTemplate = true
        }
      }

      // Step 4 (fallback): No subscription OR no custom template saved — use default
      if (!usedCustomTemplate) {
        await sendInviteEmail(email, finalActionUrl, tenantName)
      }
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
