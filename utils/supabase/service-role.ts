import { createClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase client configured with the Service Role key.
 * 
 * WARNING: This client bypasses all Row Level Security (RLS) policies.
 * It should ONLY be used on the server for admin tasks (e.g., initial tenant setup).
 * NEVER expose this client or the service role key to the browser.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
