"use client";

import { useEffect } from "react";

export default function Pricing({ tenantId }: { tenantId?: string }) {
  useEffect(() => {
    if (tenantId) {
      localStorage.setItem('checkoutTenantId', tenantId);
    }
  }, [tenantId]);

  return (
    <section className="pricing" id="pricing" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Subtle Background Glow */}
      <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translate(-50%, -50%)', width: '80vw', height: '80vw', background: 'radial-gradient(circle, rgba(201, 168, 76, 0.03) 0%, rgba(0,0,0,0) 70%)', pointerEvents: 'none', zIndex: 0 }}></div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        
        {/* Intro */}
        <div style={{ marginBottom: '5rem' }}>
          <div className="section-label" style={{ marginBottom: '1.5rem' }}>Pricing</div>
          <h2 className="section-title" style={{ maxWidth: '100%', margin: '0' }}>
            Start for free.<br/><em>Bolt on</em> power.
          </h2>
        </div>

        {/* Base Platform & Philosophy Split */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2.5rem', marginBottom: '8rem' }}>
          
          {/* The Core Engine */}
          <div className="plan-card featured" style={{ display: 'flex', flexDirection: 'column', padding: '3.5rem' }}>
            <div className="featured-badge">Included for Everyone</div>
            <div style={{ flexGrow: 1 }}>
              <div className="plan-name" style={{ fontSize: '0.8rem', letterSpacing: '0.2em' }}>Vexyr Base Engine</div>
              <div className="plan-price" style={{ fontSize: '4.5rem', margin: '1rem 0' }}>
                <sup style={{ fontSize: '1.8rem' }}>$</sup>0<sub style={{ fontSize: '1rem' }}>/mo</sub>
              </div>
              <p className="plan-tagline" style={{ fontSize: '0.9rem', marginBottom: '2.5rem' }}>
                Everything you need to launch your AI automation journey, completely risk-free.
              </p>
              <hr className="plan-divider" style={{ marginBottom: '2.5rem' }} />
              <ul className="plan-features" style={{ gap: '1.2rem' }}>
                <li className="plan-feature">1 Intelligent AI Chat Agent</li>
                <li className="plan-feature">50 free interactions / month</li>
                <li className="plan-feature">Embeddable Web Widget</li>
                <li className="plan-feature">In-App Appointment Booking</li>
                <li className="plan-feature">Core Analytics Dashboard</li>
              </ul>
            </div>
            <div style={{ marginTop: '3rem' }}>
              <a href="/login" className="plan-btn" style={{ padding: '1.2rem', fontSize: '0.8rem' }}>Create Free Account</a>
            </div>
          </div>

          {/* The Philosophy */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '3.5rem 0' }}>
            <h3 style={{ fontSize: '2.2rem', fontFamily: 'Cormorant Garamond', fontWeight: 300, marginBottom: '1.5rem', lineHeight: 1.2 }}>
              Why pay for what you <span style={{ color: 'var(--gold)', fontStyle: 'italic' }}>don't use?</span>
            </h3>
            <p style={{ fontSize: '0.95rem', color: 'var(--muted)', lineHeight: 1.8, marginBottom: '3rem' }}>
              Traditional SaaS platforms force you into expensive, bloated subscription tiers. Vexyr changes the paradigm. 
              <br/><br/>
              You get our powerful core engine for free. From there, you simply bolt on the specific modules, integrations, and reporting features your business actually needs. No hidden fees. No wasted money.
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ padding: '0.8rem 1.2rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--gold)' }}></span>
                <span style={{ fontSize: '0.7rem', fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)' }}>Zero Bloat</span>
              </div>
              <div style={{ padding: '0.8rem 1.2rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--gold)' }}></span>
                <span style={{ fontSize: '0.7rem', fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)' }}>Cancel Anytime</span>
              </div>
            </div>
          </div>

        </div>

        {/* Modules Add-on Grid */}
        <div className="modules" style={{ padding: 0, border: 'none' }}>
          <div className="modules-header" style={{ marginBottom: '3rem' }}>
            <div>
              <div className="section-label" style={{ marginBottom: '0.5rem' }}>Ecosystem</div>
              <h2 className="section-title" style={{ fontSize: '2.2rem', marginBottom: 0 }}>Add-on Modules</h2>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.6, textAlign: 'right' }}>
              Unlock these instantly inside your<br/>dashboard whenever you're ready.
            </p>
          </div>

          <div className="modules-grid">
            {/* Row 1 - Available */}
            <div className="module-item">
              <span className="module-name">Custom Email Templates</span>
              <span className="module-price">+$28/mo</span>
            </div>
            <div className="module-item">
              <span className="module-name">Broadcast Messaging</span>
              <span className="module-price">+$49/mo</span>
            </div>
            <div className="module-item">
              <span className="module-name">Automated Follow-ups</span>
              <span className="module-price">+$28/mo</span>
            </div>
            <div className="module-item">
              <span className="module-name">Extra AI Agents</span>
              <span className="module-price">+$15/mo</span>
            </div>

            {/* Row 2 - Available */}
            <div className="module-item">
              <span className="module-name">Messaging Channels</span>
              <span className="module-price">+$25/mo</span>
            </div>
            <div className="module-item">
              <span className="module-name">Unlimited Chats</span>
              <span className="module-price">+$49/mo</span>
            </div>
            <div className="module-item">
              <span className="module-name">Remove Branding</span>
              <span className="module-price">+$49/mo</span>
            </div>
            <div className="module-item">
              <span className="module-name">WhatsApp Channel</span>
              <span className="module-price">+$29/mo</span>
            </div>

            {/* Row 3 - Available */}
            <div className="module-item">
              <span className="module-name">Telegram Channel</span>
              <span className="module-price">+$19/mo</span>
            </div>
            
            {/* Row 4 - Coming Soon */}
            <div className="module-item">
              <span className="module-name">3rd-Party Calendar Sync (Coming Soon)</span>
              <span className="module-price">+$8/mo</span>
            </div>
            <div className="module-item">
              <span className="module-name">Reputation Management (Coming Soon)</span>
              <span className="module-price">+$39/mo</span>
            </div>
            <div className="module-item">
              <span className="module-name">Meta Ads Reporting (Coming Soon)</span>
              <span className="module-price">+$49/mo</span>
            </div>

            {/* Row 5 - Coming Soon */}
            <div className="module-item">
              <span className="module-name">Google Ads Reporting (Coming Soon)</span>
              <span className="module-price">+$49/mo</span>
            </div>
            <div className="module-item">
              <span className="module-name">Telegram Ads Reporting (Coming Soon)</span>
              <span className="module-price">+$49/mo</span>
            </div>
            <div className="module-item">
              <span className="module-name">Slack Channel (Coming Soon)</span>
              <span className="module-price">+$25/mo</span>
            </div>


          </div>
        </div>

      </div>
    </section>
  );
}

