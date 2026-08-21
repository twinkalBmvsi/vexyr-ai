import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import InboxClient from '@/components/dashboard/InboxClient'

export default async function LiveChatsPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
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

  // Pass necessary auth and tenant info to the client component
  // to allow it to initialize Supabase real-time correctly.
  
  return (
    <div style={{ height: 'calc(100vh - 4rem)', display: 'flex', flexDirection: 'column', marginTop: '-2rem' }}>
      <div className="dash-header" style={{ paddingBottom: '1rem', flexShrink: 0 }}>
        <h1 className="dash-title">Live Chats</h1>
        <p className="dash-subtitle">Monitor real-time conversations between your AI agents and customers.</p>
      </div>
      
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <InboxClient tenantId={tenant.id} />
      </div>
    </div>
  )
}
