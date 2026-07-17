import { createClient } from '@supabase/supabase-js'

// Note: This client uses the service role key and bypasses Row Level Security (RLS).
// It should ONLY be used in server-side API routes or Server Actions
// after verifying the user's permissions.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!
  )
}
