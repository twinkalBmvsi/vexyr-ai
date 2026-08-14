'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/service-role'
import { redirect } from 'next/navigation'
import {
  buildSupabaseAuthLink,
  getAuthRedirectUrl,
  isSmtpConfigured,
  sendPasswordResetEmail,
  sendSignupEmail,
} from '@/utils/email/auth-emails'

export async function login(prevState: unknown, formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required' }
  }

  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error || !authData.user) {
    return { error: error?.message || 'Login failed' }
  }

  return { redirectUrl: '/org-selector' }
}

export async function signup(prevState: unknown, formData: FormData) {
  const supabase = await createClient()
  
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string

  if (!email || !password || !fullName) {
    return { error: 'All fields are required' }
  }

  let signupActionUrl: string | null = null
  const smtpEnabled = isSmtpConfigured()

  if (smtpEnabled) {
    const adminClient = createAdminClient()
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'signup',
      email,
      password,
      options: {
        data: { full_name: fullName },
        redirectTo: getAuthRedirectUrl(),
      },
    })

    if (linkError) {
      if (linkError.message.toLowerCase().includes('already')) {
        return { error: 'This email already has an account. Please sign in, then create or select an organization.' }
      }
      return { error: linkError.message }
    }

    if (!linkData.properties?.hashed_token) {
      return { error: 'Failed to generate verification link.' }
    }

    signupActionUrl = buildSupabaseAuthLink('signup', linkData.properties.hashed_token)
    await sendSignupEmail(email, signupActionUrl)
  } else {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: 'http://localhost:3000/auth/confirm',
      }
    })

    if (authError) {
      if (authError.message.toLowerCase().includes('already')) {
        return { error: 'This email already has an account. Please sign in, then create or select an organization.' }
      }
      return { error: authError.message }
    }

    if (!authData.user) {
      return { error: 'Failed to create account.' }
    }

    if (authData.user.identities && authData.user.identities.length === 0) {
      return { error: 'This email already has an account. Please sign in, then create or select an organization.' }
    }
  }

  return { success: 'Account created. Please check your email, then sign in to create or select an organization.' }
}

async function generateUniqueTenantSlug(adminClient: ReturnType<typeof createAdminClient>, businessName: string) {
  let baseSlug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
  if (!baseSlug) baseSlug = 'tenant'

  let slug = baseSlug
  let attempts = 0

  while (attempts < 10) {
    const { data: existing } = await adminClient.from('tenants').select('id').eq('slug', slug).maybeSingle()
    if (!existing) {
      return slug
    }

    slug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`
    attempts++
  }

  return `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`
}

export async function createOrganization(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const businessName = (formData.get('businessName') as string | null)?.trim()

  if (!businessName) {
    redirect('/org-selector?error=Organization name is required')
  }

  const adminClient = createAdminClient()
  const slug = await generateUniqueTenantSlug(adminClient, businessName)

  const { data: tenant, error: tenantError } = await adminClient
    .from('tenants')
    .insert({
      name: businessName,
      email: user.email,
      slug,
    })
    .select('id')
    .single()

  if (tenantError || !tenant) {
    console.error('Tenant creation failed:', tenantError)
    redirect('/org-selector?error=Could not create organization')
  }

  const fullName = typeof user.user_metadata?.full_name === 'string'
    ? user.user_metadata.full_name
    : user.email?.split('@')[0] || 'Owner'

  const { error: userError } = await adminClient
    .from('users')
    .insert({
      user_id: user.id,
      tenant_id: tenant.id,
      role: 'owner',
      full_name: fullName,
    })

  if (userError) {
    console.error('Organization owner creation failed:', userError)
    redirect('/org-selector?error=Organization was created, but owner access could not be added')
  }

  redirect('/org-selector?created=1')
}

export async function resetPassword(prevState: unknown, formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string

  if (!email) {
    return { error: 'Email is required' }
  }

  const smtpEnabled = isSmtpConfigured()
  if (smtpEnabled) {
    const adminClient = createAdminClient()
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: getAuthRedirectUrl(),
      },
    })

    if (linkError) {
      return { error: linkError.message }
    }

    if (!linkData.properties?.hashed_token) {
      return { error: 'Failed to generate password reset link.' }
    }

    const actionUrl = buildSupabaseAuthLink('recovery', linkData.properties.hashed_token, '/set-password')
    await sendPasswordResetEmail(email, actionUrl)
  } else {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // Optionally specify redirect URL here, otherwise it uses Site URL
    })

    if (error) {
      return { error: error.message }
    }
  }

  return { success: 'Check your email for a password reset link.' }
}
