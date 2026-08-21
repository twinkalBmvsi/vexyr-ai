'use client'

import { useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area
} from 'recharts'
import { Calendar, Users, MessageCircle, CheckCircle, Clock, XCircle, RefreshCw, Activity, Bot } from 'lucide-react'

type DashboardAnalyticsProps = {
  totalAppointments: number
  totalCustomers: number
  totalConversations: number
  appointmentsByStatus: { name: string; value: number; fill: string }[]
  appointmentsBySource: { name: string; value: number; fill: string }[]
  appointmentsByDate: { date: string; value: number }[]
  topAgents: { name: string; value: number; fill: string }[]
  recentActivity: { id: string; title: string; status: string; created_at: string; customer_id: string }[]
  currentRange: string
}

export default function DashboardAnalytics({
  totalAppointments,
  totalCustomers,
  totalConversations,
  appointmentsByStatus,
  appointmentsBySource,
  appointmentsByDate,
  topAgents,
  recentActivity,
  currentRange
}: DashboardAnalyticsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const handleRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const range = e.target.value
    const params = new URLSearchParams(searchParams)
    params.set('range', range)
    
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  // Calculate status summaries
  const scheduledCount = appointmentsByStatus.find(s => s.name === 'Pending' || s.name === 'Confirmed')?.value || 0
  const completedCount = appointmentsByStatus.find(s => s.name === 'Completed')?.value || 0
  const canceledCount = appointmentsByStatus.find(s => s.name === 'Cancelled')?.value || 0
  const rescheduledCount = appointmentsByStatus.find(s => s.name === 'Rescheduled')?.value || 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', opacity: isPending ? 0.7 : 1, transition: 'opacity 0.2s' }}>
      
      {/* Header and Filter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: '1.8rem', color: 'var(--ink)', margin: 0 }}>Analytics Overview</h2>
        
        <select 
          value={currentRange}
          onChange={handleRangeChange}
          style={{ 
            padding: '0.5rem 1rem', 
            borderRadius: '4px', 
            border: '1px solid var(--border)', 
            background: 'var(--paper)',
            color: 'var(--ink)',
            fontSize: '0.9rem',
            cursor: 'pointer'
          }}
        >
          <option value="today">Today</option>
          <option value="this-week">This Week</option>
          <option value="last-week">Last Week</option>
          <option value="30-days">Last 30 Days</option>
          <option value="all-time">All Time</option>
        </select>
      </div>

      {/* Top Metrics Cards */}
      <div className="dash-grid">
        <div className="dash-card">
          <div className="dash-card-header">
            <span className="dash-card-title">Appointments</span>
            <Calendar size={20} color="var(--gold)" />
          </div>
          <span className="dash-card-value">{totalAppointments.toLocaleString()}</span>
          <span className="dash-card-desc">Booked in this period</span>
        </div>

        <div className="dash-card">
          <div className="dash-card-header">
            <span className="dash-card-title">Customers</span>
            <Users size={20} color="var(--gold)" />
          </div>
          <span className="dash-card-value">{totalCustomers.toLocaleString()}</span>
          <span className="dash-card-desc">Active customers</span>
        </div>

        <div className="dash-card">
          <div className="dash-card-header">
            <span className="dash-card-title">Chats Managed</span>
            <MessageCircle size={20} color="var(--gold)" />
          </div>
          <span className="dash-card-value">{totalConversations.toLocaleString()}</span>
          <span className="dash-card-desc">AI conversations handled</span>
        </div>
      </div>

      {/* Appointments Over Time (Area Chart) */}
      <div className="dash-card" style={{ padding: '2rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '1.5rem' }}>Booking Trends</h3>
        <div style={{ height: '250px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={appointmentsByDate} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--gold)" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="var(--gold)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--muted)' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--muted)' }} />
              <RechartsTooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', background: 'var(--paper)', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', color: 'var(--ink)' }}
              />
              <Area type="monotone" dataKey="value" stroke="var(--gold)" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row: Status & Agent Performance */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        
        {/* Appointment Status Donut */}
        <div className="dash-card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '1.5rem' }}>Appointment Status</h3>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ width: '50%', height: '200px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={appointmentsByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {appointmentsByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', background: 'var(--paper)', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}
                    itemStyle={{ color: 'var(--ink)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div style={{ width: '50%', display: 'flex', flexDirection: 'column', gap: '1rem', paddingLeft: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Clock size={16} color="#3b82f6" />
                <div style={{ flex: 1, fontSize: '0.9rem', color: 'var(--muted)' }}>Scheduled</div>
                <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{scheduledCount}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <CheckCircle size={16} color="#10b981" />
                <div style={{ flex: 1, fontSize: '0.9rem', color: 'var(--muted)' }}>Completed</div>
                <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{completedCount}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <RefreshCw size={16} color="#f59e0b" />
                <div style={{ flex: 1, fontSize: '0.9rem', color: 'var(--muted)' }}>Rescheduled</div>
                <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{rescheduledCount}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <XCircle size={16} color="#ef4444" />
                <div style={{ flex: 1, fontSize: '0.9rem', color: 'var(--muted)' }}>Canceled</div>
                <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{canceledCount}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Performing Agents (Horizontal Bar Chart) */}
        <div className="dash-card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '1.5rem' }}>Agent Performance (Conversations)</h3>
          <div style={{ height: '200px', width: '100%' }}>
            {topAgents.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topAgents} layout="vertical" margin={{ top: 0, right: 0, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--muted)' }} />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--ink)' }} width={120} />
                  <RechartsTooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', background: 'var(--paper)', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                    {topAgents.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: '0.9rem' }}>
                No active conversations for this period
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row: Sources & Recent Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        
        {/* Booking Sources Bar Chart */}
        <div className="dash-card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '1.5rem' }}>Booking Sources</h3>
          <div style={{ height: '250px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={appointmentsBySource} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--muted)' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--muted)' }} />
                <RechartsTooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', background: 'var(--paper)', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={48}>
                  {appointmentsBySource.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="dash-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={18} color="var(--gold)" />
            Recent Activity
          </h3>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {recentActivity.length > 0 ? recentActivity.map((activity) => {
              const d = new Date(activity.created_at)
              const timeString = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
              const dateString = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              
              let statusColor = 'var(--muted)'
              if (activity.status === 'confirmed') statusColor = '#10b981'
              else if (activity.status === 'cancelled') statusColor = '#ef4444'
              else if (activity.status === 'rescheduled') statusColor = '#f59e0b'

              return (
                <div key={activity.id} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{ 
                    width: '32px', height: '32px', borderRadius: '50%', 
                    background: 'var(--cream)', border: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Calendar size={14} color="var(--gold)" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--ink)', marginBottom: '0.2rem' }}>
                      New appointment <strong>{activity.title}</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontFamily: '"DM Mono", monospace' }}>
                      <span style={{ color: 'var(--muted)' }}>{dateString} at {timeString}</span>
                      <span style={{ color: 'var(--muted)' }}>•</span>
                      <span style={{ color: statusColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{activity.status}</span>
                    </div>
                  </div>
                </div>
              )
            }) : (
              <div style={{ color: 'var(--muted)', fontSize: '0.9rem', textAlign: 'center', marginTop: '2rem' }}>
                No recent activity found.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
