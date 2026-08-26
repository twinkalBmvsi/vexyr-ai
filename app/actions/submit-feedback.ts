'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function submitFeedback(tenantId: string, rating: number, comment: string, tenantSlug: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  // Ensure user is an owner of this tenant
  const { data: userRole } = await supabase
    .from('users')
    .select('id, role')
    .eq('user_id', user.id)
    .eq('tenant_id', tenantId)
    .single()

  if (!userRole || userRole.role !== 'owner') {
    return { success: false, error: 'Unauthorized. Only workspace owners can submit feedback.' }
  }

  // Insert feedback
  const { error } = await supabase
    .from('feedbacks')
    .insert({
      tenant_id: tenantId,
      user_id: userRole.id,
      rating,
      comment
    })

  if (error) {
    console.error('Error submitting feedback:', error)
    return { success: false, error: 'Failed to submit feedback. Please try again.' }
  }

  // Revalidate the dashboard page so the widget hides, and the landing page to show the new testimonial
  revalidatePath(`/${tenantSlug}`)
  revalidatePath('/')

  return { success: true }
}
