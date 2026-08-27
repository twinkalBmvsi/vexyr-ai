const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function main() {
  console.log('Starting migration to Hard-Linked agent licenses...')

  const { data: subscriptions, error: subError } = await supabase
    .from('subscriptions')
    .select('tenant_id, modules')

  if (subError) {
    console.error('Error fetching subscriptions:', subError)
    process.exit(1)
  }

  for (const sub of subscriptions) {
    if (!sub.modules || !sub.modules.extraBots) {
      continue
    }

    const eb = sub.modules.extraBots

    // Skip if it's already in the new format
    if (eb.assigned_slots !== undefined || eb.unassigned_slots !== undefined) {
      console.log(`Tenant ${sub.tenant_id} already migrated.`)
      continue
    }

    console.log(`Migrating tenant ${sub.tenant_id}...`)

    // Fetch agents for this tenant to bind them
    const { data: agents } = await supabase
      .from('agents')
      .select('id, name')
      .eq('tenant_id', sub.tenant_id)
      .order('id', { ascending: true })

    const assigned_slots = {}
    const unassigned_slots = []

    let agentIndexToAssign = 1 // Skip agents[0] (included in plan)

    let legacyBots = []
    if (Array.isArray(eb)) {
      legacyBots = eb
    } else if (typeof eb === 'object' && eb.expires_at) {
      legacyBots = [eb]
    } else if (typeof eb === 'number') {
      legacyBots = [{ quantity: eb, expires_at: new Date(Date.now() + 30*24*60*60*1000).toISOString() }]
    }

    // Sort legacy bots by expiration date to match the previous sequential assignment logic
    legacyBots.sort((a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime())

    for (const bot of legacyBots) {
      if (bot.expires_at && new Date(bot.expires_at) > new Date()) {
        const qty = bot.quantity || 1
        for (let i = 0; i < qty; i++) {
          if (agents && agents[agentIndexToAssign]) {
            // Assign to existing agent
            const targetAgent = agents[agentIndexToAssign]
            assigned_slots[targetAgent.id] = { expires_at: bot.expires_at }
            console.log(`- Bound slot expiring ${bot.expires_at} to agent ${targetAgent.name} (${targetAgent.id})`)
            agentIndexToAssign++
          } else {
            // No agent exists for this slot, make it unassigned
            unassigned_slots.push({ expires_at: bot.expires_at })
            console.log(`- Added unassigned slot expiring ${bot.expires_at}`)
          }
        }
      }
    }

    const newModules = { ...sub.modules }
    newModules.extraBots = {
      assigned_slots,
      unassigned_slots
    }

    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({ modules: newModules })
      .eq('tenant_id', sub.tenant_id)

    if (updateError) {
      console.error(`Error updating tenant ${sub.tenant_id}:`, updateError)
    } else {
      console.log(`✅ Successfully migrated tenant ${sub.tenant_id}`)
    }
  }

  console.log('Migration complete.')
}

main()
