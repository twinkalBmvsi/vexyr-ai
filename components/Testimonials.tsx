export default function Testimonials() {
  return (
    <section className="testimonials">
      <div className="section-label">What clients say</div>
      <h2 className="section-title" style={{ marginBottom: '3rem' }}>Real businesses,<br/><em>real results</em></h2>

      <div className="testi-grid">
        <div className="testi-card">
          <span className="testi-quote">"</span>
          <p className="testi-text">Since setting up Vexyr, we've not missed a single booking. Our Google rating went from 3.8 to 4.7 in just six weeks.</p>
          <div className="testi-author">
            <div className="testi-avatar">SK</div>
            <div>
              <div className="testi-name">Sunita Kapoor</div>
              <div className="testi-biz">Glamour Studio, Mumbai</div>
            </div>
          </div>
        </div>
        <div className="testi-card">
          <span className="testi-quote">"</span>
          <p className="testi-text">Our after-hours orders have tripled. The AI takes the order, sends the payment link, and the kitchen gets it before I even wake up.</p>
          <div className="testi-author">
            <div className="testi-avatar">RP</div>
            <div>
              <div className="testi-name">Rahul Patel</div>
              <div className="testi-biz">Spice Route Kitchen, Surat</div>
            </div>
          </div>
        </div>
        <div className="testi-card">
          <span className="testi-quote">"</span>
          <p className="testi-text">The weekly reports alone are worth it. I finally know which services drive the most revenue and when my busiest hours are.</p>
          <div className="testi-author">
            <div className="testi-avatar">AM</div>
            <div>
              <div className="testi-name">Arjun Mehta</div>
              <div className="testi-biz">AutoFix Garage, Ahmedabad</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
