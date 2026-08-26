import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import StoreClient from '@/components/dashboard/StoreClient'

export default async function StorePage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const resolvedParams = await params
  const supabase = await createClient()

  // Verify auth and get tenant
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return notFound()
  }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name')
    .eq('slug', resolvedParams.tenantSlug)
    .single()

  if (!tenant) {
    return notFound()
  }

  // Get current subscription & active modules
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('id, plan_id, modules, status')
    .eq('tenant_id', tenant.id)
    .maybeSingle()

  const currentModules = subscription?.modules || {}

  // Fetch all active stripe prices
  const { data: stripePrices } = await supabase
    .from('stripe_prices')
    .select('*')
    .eq('active', true)

  return (
    <div className="dash-container">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Module Store</h1>
          <p className="dash-subtitle">Power up your workspace with tailored AI modules.</p>
        </div>
      </div>

      <StoreClient 
        tenantId={tenant.id} 
        tenantSlug={resolvedParams.tenantSlug}
        currentModules={currentModules} 
        stripePrices={stripePrices || []}
      />
    </div>
  )
}
