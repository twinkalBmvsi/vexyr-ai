import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import Sidebar from '@/components/dashboard/Sidebar'

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ tenantSlug: string }>
}) {
  const resolvedParams = await params
  const supabase = await createClient()

  // 1. Get the authenticated user (Middleware already ensures this exists, but we double check)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost'
    redirect(`http://${rootDomain}:3000/login`)
  }

  let companyName = resolvedParams.tenantSlug

  // 2. Authorize the user against the tenant they selected in the URL.
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name')
    .eq('slug', resolvedParams.tenantSlug)
    .single()

  if (!tenant) {
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost'
    redirect(`http://${rootDomain}:3000/login`)
  }

  const { data: userRecord } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('user_id', user.id)
    .eq('tenant_id', tenant.id)
    .single()

  if (!userRecord) {
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost'
    redirect(`http://${rootDomain}:3000/org-selector`)
  }

  companyName = tenant.name || resolvedParams.tenantSlug

  return (
    <div className="dashboard-layout">
      <Sidebar tenantSlug={resolvedParams.tenantSlug} companyName={companyName} />
      <main className="dashboard-main">
        {children}
      </main>
    </div>
  )
}
