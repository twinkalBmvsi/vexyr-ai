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

  // 2. Authorize the user (Layer 2 Security)
  const { data: userRecord } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (userRecord?.tenant_id) {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('slug')
      .eq('id', userRecord.tenant_id)
      .single()

    // If the user's actual assigned tenant slug doesn't match the URL slug they are visiting
    if (tenant?.slug && tenant.slug !== resolvedParams.tenantSlug) {
      // Force redirect them to THEIR correct tenant dashboard
      const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost'
      redirect(`http://${tenant.slug}.${rootDomain}:3000`)
    }
  } else {
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost'
    redirect(`http://${rootDomain}:3000/login`)
  }

  return (
    <div className="dashboard-layout">
      <Sidebar tenantSlug={resolvedParams.tenantSlug} />
      <main className="dashboard-main">
        {children}
      </main>
    </div>
  )
}
