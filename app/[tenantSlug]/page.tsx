import Link from 'next/link'
import { Bot, MessageCircle, Zap, Calendar, Users } from 'lucide-react'
import DashboardAnalytics from '@/components/dashboard/DashboardAnalytics'
import { createClient } from '@/utils/supabase/server'

export default async function TenantDashboard({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams
  const currentRange = (resolvedSearchParams.range as string) || 'all-time'
  const supabase = await createClient()

  // 1. Fetch tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, plan_id, name')
    .eq('slug', resolvedParams.tenantSlug)
    .single()

  let agentsCount = 0
  let conversationsCount = 0
  let planName = 'Free Tier'
  let renewsOn = 'N/A'
  let currentUserName = 'User'
  let companyName = resolvedParams.tenantSlug

  if (tenant) {
    companyName = tenant.name || resolvedParams.tenantSlug

    // Get the current user
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: userRecord } = await supabase
        .from('users')
        .select('full_name')
        .eq('user_id', user.id)
        .eq('tenant_id', tenant.id)
        .single()
      
      if (userRecord && userRecord.full_name) {
        currentUserName = userRecord.full_name
      } else {
        currentUserName = user.email ? user.email.split('@')[0] : 'User'
      }
    }

    // DATE FILTERING LOGIC
    let startDate: Date | null = null
    const now = new Date()

    if (currentRange === 'today') {
      startDate = new Date(now.setHours(0, 0, 0, 0))
    } else if (currentRange === 'this-week') {
      const day = now.getDay()
      const diff = now.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
      startDate = new Date(now.setDate(diff))
      startDate.setHours(0, 0, 0, 0)
    } else if (currentRange === 'last-week') {
      const day = now.getDay()
      const diff = now.getDate() - day + (day === 0 ? -6 : 1) - 7
      startDate = new Date(now.setDate(diff))
      startDate.setHours(0, 0, 0, 0)
    } else if (currentRange === '30-days') {
      startDate = new Date(now.setDate(now.getDate() - 30))
    }

    // 2. Fetch Active Agents Count
    let agentsQuery = supabase.from('agents').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.id)
    if (startDate) agentsQuery = agentsQuery.gte('created_at', startDate.toISOString())
    const { count: aCount } = await agentsQuery
    agentsCount = aCount || 0

    // 3. Fetch Conversations Count
    let convQuery = supabase.from('conversations').select('id, agent_id, created_at').eq('tenant_id', tenant.id)
    if (startDate) convQuery = convQuery.gte('created_at', startDate.toISOString())
    const { data: convData } = await convQuery
    conversationsCount = convData ? convData.length : 0

    // Fetch Total Customers
    let custQuery = supabase.from('customers').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.id)
    if (startDate) custQuery = custQuery.gte('created_at', startDate.toISOString())
    const { count: custCount } = await custQuery
    const totalCustomers = custCount || 0

    // Fetch Appointments for Analytics
    let apptQuery = supabase.from('appointments').select('id, status, agent_id, created_at').eq('tenant_id', tenant.id)
    if (startDate) apptQuery = apptQuery.gte('created_at', startDate.toISOString())
    const { data: rawAppointments } = await apptQuery

    const appointments = rawAppointments || []
    const totalAppointments = appointments.length

    // Aggregate appointments by status
    let scheduled = 0, completed = 0, canceled = 0, rescheduled = 0
    let bookedByAgent = 0
    let bookedManually = 0
    
    // Aggregate appointments by date
    const dateMap = new Map<string, number>()

    appointments.forEach(a => {
      // Status
      if (a.status === 'pending' || a.status === 'confirmed') scheduled++
      else if (a.status === 'completed') completed++
      else if (a.status === 'cancelled') canceled++
      else if (a.status === 'rescheduled') rescheduled++
      
      // Source
      if (a.agent_id) bookedByAgent++
      else bookedManually++

      // Date
      const d = new Date(a.created_at)
      const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      dateMap.set(key, (dateMap.get(key) || 0) + 1)
    })

    const appointmentsByStatus = [
      { name: 'Pending', value: scheduled, fill: '#3b82f6' },
      { name: 'Completed', value: completed, fill: '#10b981' },
      { name: 'Rescheduled', value: rescheduled, fill: '#f59e0b' },
      { name: 'Cancelled', value: canceled, fill: '#ef4444' }
    ].filter(item => item.value > 0)

    const appointmentsBySource = [
      { name: 'AI Agent (WhatsApp/Telegram)', value: bookedByAgent, fill: 'var(--gold)' },
      { name: 'Website / Manual', value: bookedManually, fill: 'var(--border-strong)' }
    ]
    
    // Sort dates chronologically or just leave as is if we sort map keys
    // For simplicity, we just convert map to array. A real impl might fill in missing dates.
    const appointmentsByDate = Array.from(dateMap.entries())
      .map(([date, value]) => ({ date, value }))
      .reverse() // assuming descending order in query, we want ascending for area chart

    // Group conversations by agent
    const agentMap = new Map<string, number>()
    if (convData) {
      convData.forEach(c => {
        if (c.agent_id) {
          agentMap.set(c.agent_id, (agentMap.get(c.agent_id) || 0) + 1)
        }
      })
    }

    // Fetch Agent Names
    const { data: allAgents } = await supabase.from('agents').select('id, name').eq('tenant_id', tenant.id)
    const agentNames = new Map(allAgents?.map(a => [a.id, a.name]) || [])

    const topAgents = Array.from(agentMap.entries())
      .map(([agentId, value]) => ({
        name: agentNames.get(agentId) || 'Unknown Agent',
        value,
        fill: 'var(--gold)'
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5) // Top 5 agents

    // 5. Fetch Recent Activity
    let activityQuery = supabase.from('appointments')
      .select('id, title, status, created_at, customer_id')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })
      .limit(5)
    
    const { data: recentActivityData } = await activityQuery
    const recentActivity = recentActivityData || []

    // 4. Fetch Subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('tenant_id', tenant.id)
      .single()

    const planId = subscription?.plan_id || tenant.plan_id || 'free'
    if (planId === 'starter') planName = 'Starter'
    else if (planId === 'growth') planName = 'Growth'
    else if (planId === 'enterprise') planName = 'Enterprise'
    else if (planId === 'modular') {
      const activeModules = Object.values(subscription?.modules || {}).filter(Boolean).length
      planName = `Modular (${activeModules} module${activeModules !== 1 ? 's' : ''})`
    }

    const isActive = subscription?.status === 'active'

    if (isActive) {
      const renewalDate = subscription.current_period_end 
        ? new Date(subscription.current_period_end)
        : new Date(new Date(subscription.created_at).getTime() + 30 * 24 * 60 * 60 * 1000);
        
      const diffTime = renewalDate.getTime() - new Date().getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      renewsOn = diffDays > 0 ? `Renews in ${diffDays} days` : 'Renewed today'
    } else {
      renewsOn = 'No active subscription'
    }

    return (
      <div>
        <div className="dash-header">
          <h1 className="dash-title">Welcome back, <em>{currentUserName}</em></h1>
          <p className="dash-subtitle">Here is what is happening at <strong>{companyName}</strong>.</p>
        </div>

        <DashboardAnalytics 
          totalAppointments={totalAppointments}
          totalCustomers={totalCustomers}
          totalConversations={conversationsCount}
          appointmentsByStatus={appointmentsByStatus}
          appointmentsBySource={appointmentsBySource}
          appointmentsByDate={appointmentsByDate}
          topAgents={topAgents}
          recentActivity={recentActivity}
          currentRange={currentRange}
        />
      </div>
    )
  }
  
  return null
}
