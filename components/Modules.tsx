export default function Modules() {
  return (
    <section className="modules">
      <div className="modules-header">
        <div>
          <div className="section-label">Add-on modules</div>
          <h2 className="section-title" style={{ fontSize: '2rem', marginBottom: 0 }}>Bolt on only what you need</h2>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 300, maxWidth: '30ch', textAlign: 'right' }}>Add any module to any plan. Billed monthly. Cancel anytime.</p>
      </div>

      <div className="modules-grid">
        <div className="module-item">
          <span className="module-name">Appointment Booking</span>
          <span className="module-price">+$39/mo</span>
        </div>
        <div className="module-item">
          <span className="module-name">Custom Email Templates</span>
          <span className="module-price">+$29/mo</span>
        </div>
        <div className="module-item">
          <span className="module-name">Broadcast Messaging</span>
          <span className="module-price">+$49/mo</span>
        </div>
        <div className="module-item">
          <span className="module-name">Automated Follow-ups</span>
          <span className="module-price">+$29/mo</span>
        </div>
        <div className="module-item">
          <span className="module-name">Reputation Management</span>
          <span className="module-price">+$39/mo</span>
        </div>
        <div className="module-item">
          <span className="module-name">Meta Ads Reporting</span>
          <span className="module-price">+$49/mo</span>
        </div>
        <div className="module-item">
          <span className="module-name">Google Ads Reporting</span>
          <span className="module-price">+$49/mo</span>
        </div>
        <div className="module-item">
          <span className="module-name">LinkedIn Ads Reporting</span>
          <span className="module-price">+$49/mo</span>
        </div>
      </div>
    </section>
  );
}
