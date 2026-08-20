'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import DOMPurify from 'isomorphic-dompurify'

export async function getEmailTemplates(tenantId: string) {
  const supabase = await createClient()

  // Verify auth & tenant access
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Check if tenant has the customEmails module active
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status, modules')
    .eq('tenant_id', tenantId)
    .single()

  const hasCustomEmails = subscription?.status === 'active' && (subscription.modules as Record<string, any>)?.customEmails === true
  
  if (!hasCustomEmails) {
    throw new Error('Custom Emails module is not active for this workspace.')
  }

  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('tenant_id', tenantId)

  if (error) {
    console.error('Error fetching email templates:', error)
    throw new Error('Failed to fetch templates')
  }

  return data
}

export async function saveEmailTemplate(tenantId: string, templateType: string, subject: string, body: string) {
  const supabase = await createClient()

  // Verify auth & tenant access
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Check module access again for security
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status, modules')
    .eq('tenant_id', tenantId)
    .single()

  const hasCustomEmails = subscription?.status === 'active' && (subscription.modules as Record<string, any>)?.customEmails === true
  
  if (!hasCustomEmails) {
    throw new Error('Custom Emails module is not active for this workspace.')
  }

  // Upsert the template
  const { error } = await supabase
    .from('email_templates')
    .upsert(
      {
        tenant_id: tenantId,
        template_type: templateType,
        subject,
        body: DOMPurify.sanitize(body), // Sanitize HTML before saving to prevent Stored XSS
        updated_at: new Date().toISOString()
      },
      { onConflict: 'tenant_id,template_type' } // This uses the UNIQUE constraint we added in the migration
    )

  if (error) {
    console.error('Error saving email template:', error)
    throw new Error('Failed to save template')
  }

  // Revalidate the emails settings page
  revalidatePath(`/[tenantSlug]/settings/emails`, 'page')
  
  return { success: true }
}
