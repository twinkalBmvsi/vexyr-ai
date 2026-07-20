import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import {
  buildSupabaseAuthLink,
  getAuthRedirectUrl,
  isSmtpConfigured,
  sendPasswordResetEmail,
  sendInviteEmail,
} from '@/utils/email/auth-emails'

async function findAuthUserIdByEmail(adminAuthClient: ReturnType<typeof createAdminClient>, email: string) {
  const normalizedEmail = email.trim().toLowerCase()
  let page = 1

  while (page <= 10) {
    const { data, error } = await adminAuthClient.auth.admin.listUsers({ page, perPage: 1000 })

    if (error) {
      throw error
    }

    const user = data.users.find((authUser) => authUser.email?.toLowerCase() === normalizedEmail)

    if (user) {
      return user.id
    }

    if (data.users.length < 1000) {
      return null
    }

    page++
  }

  return null
}

export async function POST(request: Request) {
  try {
    const { email: rawEmail, tenantId } = await request.json()
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

    const { data: userRole, error: roleError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .eq('tenant_id', tenantId)
      .single()

    if (roleError || !userRole || userRole.role !== 'owner') {
      return NextResponse.json({ error: 'Only owners can invite team members' }, { status: 403 })
    }

    const adminAuthClient = createAdminClient()

    // 2. Invite the user via Supabase Admin API
    const smtpEnabled = isSmtpConfigured()
    let inviteActionUrl: string | null = null
    let passwordSetupActionUrl: string | null = null
    let shouldSendSupabasePasswordSetup = false
    let invitedUserId: string

    if (smtpEnabled) {
      const { data: linkData, error: linkError } = await adminAuthClient.auth.admin.generateLink({
        type: 'invite',
        email,
        options: {
          redirectTo: getAuthRedirectUrl(),
        },
      })

      if (linkError) {
        const existingUserId = linkError.message.toLowerCase().includes('already been registered')
          ? await findAuthUserIdByEmail(adminAuthClient, email)
          : null

        if (!existingUserId) {
          return NextResponse.json({ error: linkError.message }, { status: 400 })
        }

        const { data: recoveryData, error: recoveryError } = await adminAuthClient.auth.admin.generateLink({
          type: 'recovery',
          email,
          options: {
            redirectTo: getAuthRedirectUrl(),
          },
        })

        if (recoveryError) {
          return NextResponse.json({ error: recoveryError.message }, { status: 400 })
        }

        if (!recoveryData.properties?.hashed_token) {
          return NextResponse.json({ error: 'Failed to generate password setup link.' }, { status: 500 })
        }

        invitedUserId = existingUserId
        passwordSetupActionUrl = buildSupabaseAuthLink('recovery', recoveryData.properties.hashed_token, '/set-password')
      } else {
        if (!linkData.user || !linkData.properties?.hashed_token) {
          return NextResponse.json({ error: 'Failed to generate invite link.' }, { status: 500 })
        }

        invitedUserId = linkData.user.id
        inviteActionUrl = buildSupabaseAuthLink('invite', linkData.properties.hashed_token, '/set-password')
      }
    } else {
      const { data: inviteData, error: inviteError } = await adminAuthClient.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${getAuthRedirectUrl().replace('/auth/confirm', '')}/invite`
      })

      if (inviteError) {
        const existingUserId = inviteError.message.toLowerCase().includes('already been registered')
          ? await findAuthUserIdByEmail(adminAuthClient, email)
          : null

        if (!existingUserId) {
          return NextResponse.json({ error: inviteError.message }, { status: 400 })
        }

        invitedUserId = existingUserId
        shouldSendSupabasePasswordSetup = true
      } else {
        if (!inviteData.user) {
          return NextResponse.json({ error: 'Failed to invite user' }, { status: 500 })
        }

        invitedUserId = inviteData.user.id
      }
    }

    // 3. Add the user to the public.users table as a manager
    const { error: insertError } = await adminAuthClient
      .from('users')
      .insert({
        id: invitedUserId,
        tenant_id: tenantId,
        role: 'manager',
        full_name: email.split('@')[0], // Default name
      })

    if (insertError) {
      // If they already exist in another tenant, we might just update or insert?
      // Wait, public.users has primary key `id`.
      // If a user can be in multiple tenants, public.users needs a composite PK, but in schema.sql:
      // id uuid PRIMARY KEY REFERENCES auth.users(id)
      // This means a user can ONLY belong to one tenant!
      // If they are already in the system, inviteUserByEmail might fail or return existing user.
      // If they exist in public.users, insert will fail with unique constraint.
      if (insertError.code === '23505') {
         return NextResponse.json({ error: 'User is already part of a workspace in this system.' }, { status: 400 })
      }
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    if (smtpEnabled && inviteActionUrl) {
      await sendInviteEmail(email, inviteActionUrl)
    }

    if (smtpEnabled && passwordSetupActionUrl) {
      await sendPasswordResetEmail(email, passwordSetupActionUrl)
    }

    if (shouldSendSupabasePasswordSetup) {
      const { error: resetError } = await adminAuthClient.auth.resetPasswordForEmail(email, {
        redirectTo: getAuthRedirectUrl(),
      })

      if (resetError) {
        return NextResponse.json({ error: resetError.message }, { status: 400 })
      }
    }

    return NextResponse.json({ message: 'Invitation sent successfully' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
