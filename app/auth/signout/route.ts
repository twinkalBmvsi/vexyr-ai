import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  let supabaseResponse = NextResponse.redirect(new URL('http://localhost:3000/'))

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          cookiesToSet.forEach(({ name, value, options }) => {
            let domain = options.domain
            if (process.env.NEXT_PUBLIC_ROOT_DOMAIN) {
              domain = `.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`
            }
            supabaseResponse.cookies.set(name, value, { ...options, domain })
          })
        },
      },
    }
  )

  await supabase.auth.signOut()

  // Ensure redirect goes back to root domain
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost'
  const redirectUrl = `http://${rootDomain}:3000/`
  
  return new NextResponse(null, {
    status: 303,
    headers: {
      Location: redirectUrl,
      'Set-Cookie': supabaseResponse.headers.get('Set-Cookie') || ''
    }
  })
}
