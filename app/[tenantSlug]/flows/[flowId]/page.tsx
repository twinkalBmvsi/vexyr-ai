import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import FlowEditor from '@/components/dashboard/FlowEditor'

export default async function FlowEditorPage({
  params
}: {
  params: Promise<{ tenantSlug: string; flowId: string }>
}) {
  const { tenantSlug, flowId } = await params
  const supabase = await createClient()

  // 1. Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return notFound()

  // 2. Get tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', tenantSlug)
    .maybeSingle()

  if (!tenant) return notFound()

  // 3. Get flow
  const { data: flow, error } = await supabase
    .from('flows')
    .select('*')
    .eq('id', flowId)
    .eq('tenant_id', tenant.id)
    .maybeSingle()

  if (!flow) {
    console.error('FlowForge 404 Debug:', { flowId, tenantId: tenant.id, error })
    return notFound()
  }

  return (
    <FlowEditor
      flow={flow as any}
      tenantId={tenant.id}
      tenantSlug={tenantSlug}
    />
  )
}
