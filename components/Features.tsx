export default function Features() {
  return (
    <section className="features" id="features">
      <div className="section-label">What vexyr does</div>
      <h2 className="section-title">Every service your<br/>business <em>needs</em></h2>

      <div className="features-grid">
        <div className="feature-card">
          <div className="feature-num">01</div>
          <div className="feature-title">Appointment Booking</div>
          <p className="feature-desc">The AI checks your live calendar and books slots in real time. Confirmation SMS sent instantly. Zero double-bookings.</p>
        </div>
        <div className="feature-card">
          <div className="feature-num">02</div>
          <div className="feature-title">Order Taking</div>
          <p className="feature-desc">Captures full orders over the phone and sends them directly to your POS system. Payment link delivered by SMS.</p>
        </div>
        <div className="feature-card">
          <div className="feature-num">03</div>
          <div className="feature-title">Customer Support</div>
          <p className="feature-desc">Answers FAQs from your knowledge base. Complex questions are routed to you and automatically added to the knowledge base.</p>
        </div>
        <div className="feature-card">
          <div className="feature-num">04</div>
          <div className="feature-title">Returns Processing</div>
          <p className="feature-desc">Verifies order ID and eligibility, triggers the return workflow, and keeps the customer informed — all without human intervention.</p>
        </div>
        <div className="feature-card">
          <div className="feature-num">05</div>
          <div className="feature-title">Reputation Management</div>
          <p className="feature-desc">After every positive interaction, a Google review request fires automatically. Watch your rating climb while you sleep.</p>
        </div>
        <div className="feature-card">
          <div className="feature-num">06</div>
          <div className="feature-title">AI Reports & Insights</div>
          <p className="feature-desc">Weekly and monthly executive summaries delivered to your inbox. Know your busiest hours, best services, and revenue trends.</p>
        </div>
      </div>
    </section>
  );
}
