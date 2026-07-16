import ChannelConnections from '@/components/dashboard/ChannelConnections'
import { createClient } from '@/utils/supabase/server'

export default async function ConnectionsPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const resolvedParams = await params
  const supabase = await createClient()

  let hasWhatsapp = false
  let hasTelegram = false
  let waNumber = ''

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', resolvedParams.tenantSlug)
    .single()

  if (tenant) {
    const { data: channels } = await supabase
      .from('channels')
      .select('provider, provider_config')
      .eq('tenant_id', tenant.id)

    if (channels) {
      hasWhatsapp = channels.some(c => c.provider === 'whatsapp')
      hasTelegram = channels.some(c => c.provider === 'telegram')
      
      const waChannel = channels.find(c => c.provider === 'whatsapp')
      if (waChannel && waChannel.provider_config?.phone_number) {
        waNumber = waChannel.provider_config.phone_number
      }
    }
  }

  return (
    <div>
      <div className="dash-header">
        <h1 className="dash-title">Channel Connections</h1>
        <p className="dash-subtitle">Link your messaging platforms to Glamour Studio.</p>
      </div>

      <ChannelConnections 
        initialHasWhatsapp={hasWhatsapp} 
        initialHasTelegram={hasTelegram} 
        initialWaNumber={waNumber} 
      />
    </div>
  )
}
