import Pricing from "@/components/Pricing";

export default async function SelectPlanPage({ searchParams }: { searchParams: Promise<{ tenantId?: string }> }) {
  const { tenantId } = await searchParams;

  return (
    <main className="min-h-screen bg-black">
      <div className="pt-20 pb-10 text-center" style={{ textAlign: 'center', paddingTop: '5rem', paddingBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white', marginBottom: '1rem' }}>Choose Your Plan</h1>
        <p style={{ color: 'var(--muted)' }}>Please select a subscription plan to access your dashboard.</p>
      </div>
      <Pricing tenantId={tenantId} />
    </main>
  );
}
