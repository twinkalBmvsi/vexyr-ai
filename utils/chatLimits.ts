import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
// Using admin client to bypass RLS for webhook usage
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

const FREE_TIER_LIMIT = 50;

/**
 * Checks if the tenant has exceeded their monthly interaction limit.
 * Returns { allowed: true } if they are within limits or have Unlimited Chats.
 * Returns { allowed: false, reason: string } if they are over the limit.
 */
export async function checkChatLimit(tenantId: string): Promise<{ allowed: boolean, reason?: string }> {
  try {
    // 1. Check if the tenant has the 'unlimitedChats' module active
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('modules')
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (subscription?.modules?.unlimitedChats) {
      return { allowed: true }; // Unlimited chats, no need to check count
    }

    // 2. Count messages in the current calendar month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count, error } = await supabaseAdmin
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('sender_type', 'user') // Count incoming user messages
      .gte('created_at', startOfMonth.toISOString());

    if (error) {
      console.error('Error counting messages for chat limit:', error);
      // In case of DB error, default to allowed to prevent breaking the service
      return { allowed: true };
    }

    const currentCount = count || 0;

    if (currentCount >= FREE_TIER_LIMIT) {
      return { 
        allowed: false, 
        reason: 'Monthly free tier limit of 50 interactions reached. Please purchase the Unlimited Chats module.'
      };
    }

    return { allowed: true };

  } catch (err) {
    console.error('Unexpected error in checkChatLimit:', err);
    return { allowed: true };
  }
}
