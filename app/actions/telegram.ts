'use server'

import { createClient } from '@/utils/supabase/server'

export async function registerTelegramWebhook(tenantSlug: string, baseUrl?: string) {
  const supabase = await createClient()

  // 1. Verify auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // 2. Get tenant ID
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', tenantSlug)
    .single()

  if (!tenant) {
    return { success: false, error: 'Tenant not found' }
  }

  // 3. Verify user belongs to tenant
  const { data: userRecord } = await supabase
    .from('users')
    .select('id')
    .eq('user_id', user.id)
    .eq('tenant_id', tenant.id)
    .single()

  if (!userRecord) {
    return { success: false, error: 'Unauthorized for this tenant' }
  }

  // 4. Get Telegram token
  const { data: channel } = await supabase
    .from('channels')
    .select('provider_config')
    .eq('tenant_id', tenant.id)
    .eq('provider', 'telegram')
    .single()

  if (!channel || !channel.provider_config?.token) {
    return { success: false, error: 'Telegram is not configured' }
  }

  const token = channel.provider_config.token.trim()

  // Determine base URL
  let finalBaseUrl = baseUrl?.trim()
  if (!finalBaseUrl) {
    // Attempt to use Vercel URL or default local URL
    if (process.env.NEXT_PUBLIC_SITE_URL) {
      finalBaseUrl = process.env.NEXT_PUBLIC_SITE_URL.trim()
    } else if (process.env.VERCEL_URL) {
      finalBaseUrl = `https://${process.env.VERCEL_URL.trim()}`
    } else {
      return { success: false, error: 'Base URL is required when running locally' }
    }
  }

  // Remove trailing slash if any
  finalBaseUrl = finalBaseUrl.replace(/\/$/, '')
  
  const webhookUrl = `${finalBaseUrl}/api/webhook/telegram/${tenantSlug}`

  // 5. Call Telegram API
  try {
    const telegramUrl = `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}`
    console.log(`Attempting to set Telegram webhook. URL: https://api.telegram.org/bot***MASKED***/setWebhook?url=${encodeURIComponent(webhookUrl)}`)
    
    const response = await fetch(telegramUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    })
    
    const data = await response.json()

    if (!data.ok) {
      console.error('Telegram API returned error:', data)
      return { success: false, error: data.description || 'Failed to set webhook' }
    }

    return { success: true, message: 'Webhook registered successfully!' }
  } catch (error: any) {
    console.error('Telegram setWebhook error. Full details:', {
      message: error?.message,
      cause: error?.cause,
      code: error?.code,
      stack: error?.stack
    })
    
    // Check if it's an ISP block / connection reset
    if (error?.cause?.code === 'ECONNRESET' || error?.message?.includes('ECONNRESET')) {
      return { 
        success: false, 
        error: 'Connection to Telegram blocked by your ISP/Network. Please turn on a VPN and try again.' 
      }
    }
    
    return { success: false, error: `Network error: ${error?.message || 'Unknown error'}. Check console for details.` }
  }
}
