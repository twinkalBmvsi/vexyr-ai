import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  const url = request.nextUrl

  // 0. Skip authentication and subdomain redirection for API routes & public webhooks
  if (url.pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  const { supabaseResponse, user, supabase } = await updateSession(request)
  
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
        
        // Strip the tokens from the URL and redirect to dashboard or next param
        const nextParam = url.searchParams.get('next') || '/'
        const redirectUrl = new URL(nextParam, request.url)
        redirectUrl.searchParams.delete('access_token')
        redirectUrl.searchParams.delete('refresh_token')
        redirectUrl.searchParams.delete('next')
        
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
      const host = request.headers.get('host') || 'localhost:3000'
      const port = host.includes(':') ? `:${host.split(':')[1]}` : ''
      const protocol = host.includes('localhost') || host.includes('localtest.me') ? 'http' : 'https'
      
      // Use localhost for local development
      const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || (host.includes('localhost') || host.includes('localtest.me') ? 'localhost' : host.split(':')[0])
      
      const loginUrl = `${protocol}://${rootDomain}${port}/login`
      
      // Avoid redirect loops if we are already on the target login page (shouldn't happen on subdomain, but safety first)
      if (request.url === loginUrl) return supabaseResponse

      // Use raw Response to completely bypass Next.js URL normalization which causes the ERR_TOO_MANY_REDIRECTS loop
      return new Response(null, {
        status: 302,
        headers: {
          Location: loginUrl
        }
      })
    }

    // If user IS logged in but tries to access auth pages on a subdomain, redirect to main domain
    const authPages = ['/login', '/signup', '/forgot-password', '/reset-password', '/verify-email']
    if (authPages.includes(url.pathname)) {
      const host = request.headers.get('host') || 'localhost:3000'
      const port = host.includes(':') ? `:${host.split(':')[1]}` : ''
      const protocol = host.includes('localhost') || host.includes('localtest.me') ? 'http' : 'https'
      const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || (host.includes('localhost') || host.includes('localtest.me') ? 'localhost' : host.split(':')[0])
      
      return NextResponse.redirect(`${protocol}://${rootDomain}${port}${url.pathname}`)
    }

    // Extract the slug
    const tenantSlug = hostname.split('.')[0]

    // Prevent infinite loops or rewriting API routes
    if (url.pathname.startsWith(`/${tenantSlug}`) || url.pathname.startsWith('/api/')) {
      return supabaseResponse
    }

    // Rewrite to the dynamic tenant folder
    const rewriteUrl = new URL(`/${tenantSlug}${url.pathname}`, request.url)
    const rewriteResponse = NextResponse.rewrite(rewriteUrl)
    
    supabaseResponse.headers.forEach((value, key) => {
      rewriteResponse.headers.append(key, value)
    })

    return rewriteResponse
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
  ],
}
