'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/service-role'

export async function login(prevState: any, formData: FormData) {
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

  // Fetch the user's assigned tenant
  const { data: userRecord } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', authData.user.id)
    .single()

  if (userRecord?.tenant_id) {
    // Check for active subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('tenant_id', userRecord.tenant_id)
      .eq('status', 'active')
      .maybeSingle()

    if (!subscription) {
      // No active subscription, redirect to select plan page
      return { redirectUrl: `/select-plan?tenantId=${userRecord.tenant_id}` }
    }

    // Fetch the tenant's slug
    const { data: tenant } = await supabase
      .from('tenants')
      .select('slug')
      .eq('id', userRecord.tenant_id)
      .single()
      
    if (tenant?.slug) {
      // Instead of Next.js redirect (which fails across subdomains via Server Actions),
      // we return the URL and let the client do a full page load.
      const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost'
      return { redirectUrl: `http://${tenant.slug}.${rootDomain}:3000/auth/handoff?access_token=${authData.session.access_token}&refresh_token=${authData.session.refresh_token}` }
    }
  }

  return { redirectUrl: '/' }
}

export async function signup(prevState: any, formData: FormData) {
  const supabase = await createClient()
  
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const businessName = formData.get('businessName') as string
  const fullName = formData.get('fullName') as string

  if (!email || !password || !businessName || !fullName) {
    return { error: 'All fields are required' }
  }

  // 1. Create the user in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: 'http://localhost:3000/auth/confirm',
    }
  })

  if (authError) {
    return { error: authError.message }
  }

  const user = authData.user

  if (user) {
    // 2. Use Service Role to bypass RLS and create the Tenant & User records
    const adminClient = createAdminClient()

    // Generate a unique slug from the business name
    let baseSlug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
    if (!baseSlug) baseSlug = 'tenant'
    
    let slug = baseSlug
    let isUnique = false
    let attempts = 0
    
    while (!isUnique && attempts < 5) {
      const { data: existing } = await adminClient.from('tenants').select('id').eq('slug', slug).maybeSingle()
      if (!existing) {
        isUnique = true
      } else {
        slug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`
        attempts++
      }
    }

    // Insert the new tenant
    const { data: tenant, error: tenantError } = await adminClient
      .from('tenants')
      .insert({
        name: businessName,
        email: email,
        slug: slug
      })
      .select('id, slug')
      .single()

    if (tenantError || !tenant) {
      console.error('Tenant creation failed:', tenantError)
      return { error: 'Account created, but failed to initialize workspace.' }
    }

    // Insert the user mapped to this tenant
    const { error: userError } = await adminClient
      .from('users')
      .insert({
        id: user.id, // Maps to auth.users.id
        tenant_id: tenant.id,
        role: 'owner',
        full_name: fullName
      })

    if (userError) {
      console.error('User creation failed:', userError)
      return { error: `Profile init failed: ${userError.message}` }
    }
  }

  return { success: 'Check your email to verify your account.' }
}

export async function resetPassword(prevState: any, formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string

  if (!email) {
    return { error: 'Email is required' }
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    // Optionally specify redirect URL here, otherwise it uses Site URL
  })

  if (error) {
    return { error: error.message }
  }

  return { success: 'Check your email for a password reset link.' }
}
