import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user, supabase } = await updateSession(request)
  const url = request.nextUrl
  
  // Get hostname of request (e.g. demo.localhost:3000 or demo.localtest.me:3000)
  const hostname = request.headers.get('host') || 'localhost:3000'

  // Define allowed domains (including local dev and future prod)
  const allowedDomains = ['localhost:3000', 'localtest.me:3000']
  
  // Check if the current hostname is a subdomain
  const isSubdomain = allowedDomains.every(domain => hostname !== domain)

  // If it's a subdomain, we need to secure it and rewrite it
  if (isSubdomain) {
    // 0. Handle SSO Handoff
    if (url.pathname === '/auth/handoff') {
      const accessToken = url.searchParams.get('access_token')
      const refreshToken = url.searchParams.get('refresh_token')
      
      if (accessToken && refreshToken) {
        // Set the session. This triggers cookie setting in the client.
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        })
        
        // Strip the tokens from the URL and redirect to dashboard
        const redirectUrl = new URL('/', request.url)
        redirectUrl.searchParams.delete('access_token')
        redirectUrl.searchParams.delete('refresh_token')
        
        const redirectResponse = NextResponse.redirect(redirectUrl)
        
        // Copy the newly minted cookies from supabaseResponse to our redirect
        supabaseResponse.cookies.getAll().forEach(cookie => {
          redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
        })
        
        return redirectResponse
      }
    }

    if (url.pathname === '/auth/signout') {
      return supabaseResponse
    }

    if (!user) {
      // Not logged in -> Redirect to main domain login
      const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost'
      // Use raw NextResponse to prevent Next.js from normalizing localhost redirects to relative paths
      return new NextResponse(null, {
        status: 307,
        headers: {
          Location: `http://${rootDomain}:3000/login`
        }
      })
    }

    // Extract the slug
    const tenantSlug = hostname.split('.')[0]

    // Prevent infinite loops
    if (url.pathname.startsWith(`/${tenantSlug}`)) {
      return supabaseResponse
    }

    // Rewrite to the dynamic tenant folder
    return NextResponse.rewrite(new URL(`/${tenantSlug}${url.pathname}`, request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
  ],
}
