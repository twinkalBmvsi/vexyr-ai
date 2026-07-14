export default async function TenantDashboard({
  params,
}: {
  params: Promise<{ tenantSlug: string }>
}) {
  const resolvedParams = await params
  
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Tenant Dashboard</h1>
      <p>Welcome to the isolated workspace for: <strong>{resolvedParams.tenantSlug}</strong></p>
      <hr style={{ margin: '2rem 0' }} />
      <p>This is where the internal SaaS dashboard (sidebar, stats, etc.) will go.</p>
    </div>
  )
}
