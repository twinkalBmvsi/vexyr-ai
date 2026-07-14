import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/'

  if (token_hash && type) {
    const supabase = await createClient()
    const { data: authData, error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    if (!error && authData?.user) {
      // User is successfully verified and logged in.
      // Fetch their tenant slug for redirection
      const { data: userRecord } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', authData.user.id)
        .single()

      if (userRecord?.tenant_id) {
        const { data: tenant } = await supabase
          .from('tenants')
          .select('slug')
          .eq('id', userRecord.tenant_id)
          .single()
          
        if (tenant?.slug) {
          // Redirect to their dashboard via SSO handoff
          const session = await supabase.auth.getSession()
          const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost'
          
          if (session.data.session) {
            return NextResponse.redirect(`http://${tenant.slug}.${rootDomain}:3000/auth/handoff?access_token=${session.data.session.access_token}&refresh_token=${session.data.session.refresh_token}`)
          }
          return NextResponse.redirect(`http://${tenant.slug}.${rootDomain}:3000`)
        }
      }
      
      // Fallback if tenant slug not found
      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  // Redirect to an error page or login with an error query param
  return NextResponse.redirect(new URL('/login?error=Verification failed or link expired', request.url))
}
