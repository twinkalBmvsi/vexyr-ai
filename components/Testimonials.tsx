import { createClient } from '@supabase/supabase-js'
import TestimonialCarousel from './TestimonialCarousel'

export default async function Testimonials() {
  // Use service role to fetch feedbacks for public display, bypassing RLS
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!
  )

  const { data: rawFeedbacks } = await supabaseAdmin
    .from('feedbacks')
    .select(`
      id,
      rating,
      comment,
      users ( full_name ),
      tenants ( name )
    `)
    .gte('rating', 4)
    .order('created_at', { ascending: false })
    .limit(6)

  // Use mock data if no real feedbacks exist yet
  const displayData = rawFeedbacks && rawFeedbacks.length > 0 ? rawFeedbacks.map((f: any) => ({
    id: f.id,
    quote: f.comment,
    initials: f.users?.full_name ? f.users.full_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'U',
    name: f.users?.full_name || 'Anonymous User',
    business: f.tenants?.name || 'Vexyr Customer'
  })) : [
    {
      id: '1',
      quote: "Since setting up Vexyr, we've not missed a single booking. Our Google rating went from 3.8 to 4.7 in just six weeks.",
      initials: 'SK',
      name: 'Sunita Kapoor',
      business: 'Glamour Studio, Mumbai'
    },
    {
      id: '2',
      quote: "Our after-hours orders have tripled. The AI takes the order, sends the payment link, and the kitchen gets it before I even wake up.",
      initials: 'RP',
      name: 'Rahul Patel',
      business: 'Spice Route Kitchen, Surat'
    },
    {
      id: '3',
      quote: "The weekly reports alone are worth it. I finally know which services drive the most revenue and when my busiest hours are.",
      initials: 'AM',
      name: 'Arjun Mehta',
      business: 'AutoFix Garage, Ahmedabad'
    }
  ]

  return (
    <section className="testimonials">
      <div className="section-label">What clients say</div>
      <h2 className="section-title" style={{ marginBottom: '3rem' }}>Real businesses,<br/><em>real results</em></h2>

      <TestimonialCarousel testimonials={displayData} />
    </section>
  );
}
