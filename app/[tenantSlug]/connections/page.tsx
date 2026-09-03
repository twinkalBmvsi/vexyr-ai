import ChannelConnections from '@/components/dashboard/ChannelConnections'
import { createClient } from '@/utils/supabase/server'

export default async function ConnectionsPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const resolvedParams = await params
  const supabase = await createClient()

  let hasWhatsapp = false
  let hasTelegram = false
  let waNumber = ''

  let initialTgConfig = { token: '' }
  let initialWaConfig = { token: '', phoneId: '', wabaId: '' }
  let isWhatsappAllowed = false
  let isTelegramAllowed = false
  let isAiAllowed = false
  let isFlowAllowed = false
  let initialWaRoutingMode: 'ai' | 'flow' = 'ai'
  let initialTgRoutingMode: 'ai' | 'flow' = 'ai'

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', resolvedParams.tenantSlug)
    .single()

  if (tenant) {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('modules')
      .eq('tenant_id', tenant.id)
      .maybeSingle()
    
    if (subscription?.modules) {
      isWhatsappAllowed = Boolean(subscription.modules.whatsappChannel) || Boolean(subscription.modules.messagingChannels)
      isTelegramAllowed = Boolean(subscription.modules.telegramChannel) || Boolean(subscription.modules.messagingChannels)
      isAiAllowed = Boolean(subscription.modules.ai_agents)
      isFlowAllowed = Boolean(subscription.modules.flow_forge)
    }
    // Delete any empty dummy channel rows that have no provider configuration
    await supabase
      .from('channels')
      .delete()
      .eq('tenant_id', tenant.id)
      .or('provider_config.is.null,provider_config.eq.{}')

    const { data: channels } = await supabase
      .from('channels')
      .select('provider, provider_config, routing_mode')
      .eq('tenant_id', tenant.id)

    if (channels) {
      const waChannel = channels.find(c => c.provider === 'whatsapp')
      if (waChannel) {
        if (waChannel.routing_mode) initialWaRoutingMode = waChannel.routing_mode as 'ai' | 'flow'
        if (waChannel.provider_config) {
          initialWaConfig = {
            token: waChannel.provider_config.token || '',
            phoneId: waChannel.provider_config.phoneId || '',
            wabaId: waChannel.provider_config.wabaId || ''
          }
          if (waChannel.provider_config.phone_number) {
            waNumber = waChannel.provider_config.phone_number
          }
          hasWhatsapp = Boolean(initialWaConfig.token || initialWaConfig.phoneId || waNumber)
        }
      }

      const tgChannel = channels.find(c => c.provider === 'telegram')
      if (tgChannel) {
        if (tgChannel.routing_mode) initialTgRoutingMode = tgChannel.routing_mode as 'ai' | 'flow'
        if (tgChannel.provider_config) {
          initialTgConfig = {
            token: tgChannel.provider_config.token || ''
          }
          hasTelegram = Boolean(initialTgConfig.token)
        }
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
        tenantSlug={resolvedParams.tenantSlug}
        initialHasWhatsapp={hasWhatsapp} 
        initialHasTelegram={hasTelegram} 
        initialWaNumber={waNumber}
        initialTgConfig={initialTgConfig}
        initialWaConfig={initialWaConfig}
        isWhatsappAllowed={isWhatsappAllowed}
        isTelegramAllowed={isTelegramAllowed}
        isAiAllowed={isAiAllowed}
        isFlowAllowed={isFlowAllowed}
        initialWaRoutingMode={initialWaRoutingMode}
        initialTgRoutingMode={initialTgRoutingMode}
      />
    </div>
  )
}
