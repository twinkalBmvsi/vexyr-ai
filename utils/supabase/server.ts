import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              // Only set domain for real domains or localtest.me (Chrome blocks localhost domains)
              let domain = options.domain
              if (process.env.NEXT_PUBLIC_ROOT_DOMAIN) {
                domain = `.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`
              }
              cookieStore.set(name, value, { ...options, domain })
            })
          } catch (error) {
            // The `setAll` method was called from a Server Component.
          }
        },
      },
    }
  )
}
