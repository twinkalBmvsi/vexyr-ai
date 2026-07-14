export default function Pricing() {
  return (
    <section className="pricing" id="pricing">
      <div className="pricing-intro">
        <div>
          <div className="section-label">Pricing</div>
          <h2 className="section-title">Simple, <em>modular</em><br/>pricing</h2>
        </div>
        <p className="pricing-note">Every plan includes the core text AI infrastructure. Activate only the modules your business needs. No contracts, no hidden fees. Cancel anytime.</p>
      </div>

      <div className="pricing-grid">
        <div className="plan-card">
          <div className="plan-name">Starter</div>
          <div className="plan-price"><sup>$</sup>97<sub>/mo</sub></div>
          <p className="plan-tagline">For new businesses getting started</p>
          <hr className="plan-divider" />
          <ul className="plan-features">
            <li className="plan-feature">1 AI chat agent</li>
            <li className="plan-feature">1 WhatsApp or Telegram integration</li>
            <li className="plan-feature">Customer Support (FAQ)</li>
            <li className="plan-feature">Up to 1,000 chats / month</li>
            <li className="plan-feature">Basic dashboard</li>
            <li className="plan-feature">Weekly email report</li>
            <li className="plan-feature dimmed">Appointment Booking</li>
            <li className="plan-feature dimmed">Automated Follow-ups</li>
            <li className="plan-feature dimmed">Reputation Management</li>
          </ul>
          <a href="/login" className="plan-btn">Get started</a>
        </div>

        <div className="plan-card featured">
          <div className="featured-badge">Most popular</div>
          <div className="plan-name">Growth</div>
          <div className="plan-price"><sup>$</sup>247<sub>/mo</sub></div>
          <p className="plan-tagline">For businesses ready to scale</p>
          <hr className="plan-divider" />
          <ul className="plan-features">
            <li className="plan-feature">1 AI chat agent</li>
            <li className="plan-feature">2 Messaging integrations</li>
            <li className="plan-feature">Customer Support (FAQ)</li>
            <li className="plan-feature">Appointment Booking</li>
            <li className="plan-feature">Automated Follow-ups</li>
            <li className="plan-feature">Reputation Management</li>
            <li className="plan-feature">Up to 5,000 chats / month</li>
            <li className="plan-feature">Full dashboard + reports</li>
            <li className="plan-feature">AI executive summaries</li>
          </ul>
          <a href="/login" className="plan-btn">Get started</a>
        </div>

        <div className="plan-card">
          <div className="plan-name">Enterprise</div>
          <div className="plan-price"><sup>$</sup>497<sub>/mo</sub></div>
          <p className="plan-tagline">For high-volume operations</p>
          <hr className="plan-divider" />
          <ul className="plan-features">
            <li className="plan-feature">Multiple AI chat agents</li>
            <li className="plan-feature">Unlimited Messaging integrations</li>
            <li className="plan-feature">All core modules</li>
            <li className="plan-feature">Custom Email Templates</li>
            <li className="plan-feature">Meta, Google, LinkedIn Ads</li>
            <li className="plan-feature">Unlimited chats</li>
            <li className="plan-feature">Priority support</li>
            <li className="plan-feature">Custom integrations</li>
            <li className="plan-feature">Dedicated engineer hours</li>
          </ul>
          <a href="/login" className="plan-btn">Contact sales</a>
        </div>
      </div>
    </section>
  );
}
