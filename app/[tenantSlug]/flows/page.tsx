import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import FlowList from '@/components/dashboard/FlowList'

export default async function FlowsPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params
  const supabase = await createClient()

  // 1. Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return notFound()

  // 2. Get tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name')
    .eq('slug', tenantSlug)
    .maybeSingle()

  if (!tenant) return notFound()

  // 3. Fetch flows
  const { data: flows } = await supabase
    .from('flows')
    .select('*')
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: false })

  return (
    <FlowList
      tenantId={tenant.id}
      tenantSlug={tenantSlug}
      initialFlows={(flows || []) as any[]}
    />
  )
}
