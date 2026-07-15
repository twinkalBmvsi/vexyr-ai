"use client";

import { useState } from "react";

export default function Pricing({ tenantId }: { tenantId?: string }) {
  const [isYearly, setIsYearly] = useState(false);

  const getPlanLink = (planId: 'starter' | 'growth' | 'enterprise') => {
    if (!tenantId) return '/login';
    
    let link = '';
    if (planId === 'starter') {
      link = isYearly ? 'https://buy.stripe.com/test_5kQ6oJbZnfsr9mtbq7gIo03' : 'https://buy.stripe.com/test_14A28t9Rf3JJeGN9hZgIo02';
    } else if (planId === 'growth') {
      link = isYearly ? 'https://buy.stripe.com/test_4gM5kF4wV2FF1U1cubgIo05' : 'https://buy.stripe.com/test_dRmcN7d3r2FFgOVcubgIo04';
    } else if (planId === 'enterprise') {
      link = isYearly ? 'https://buy.stripe.com/test_4gM28t3sReon4299hZgIo07' : 'https://buy.stripe.com/test_aFa4gBgfDcgf1U1fGngIo06';
    }
    
    return `${link}?client_reference_id=${tenantId}`;
  };

  return (
    <section className="pricing" id="pricing">
      <div className="pricing-intro">
        <div>
          <div className="section-label">Pricing</div>
          <h2 className="section-title">Simple, <em>modular</em><br/>pricing</h2>
        </div>
        <div>
          <p className="pricing-note" style={{ marginBottom: '2rem' }}>Every plan includes the core text AI infrastructure. Activate only the modules your business needs. No contracts, no hidden fees. Cancel anytime.</p>
          
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ display: 'inline-flex', background: 'var(--paper)', border: '1px solid var(--border-strong)', borderRadius: '40px', padding: '6px' }}>
              <button 
                onClick={() => setIsYearly(false)}
                style={{ 
                  padding: '0.7rem 1.8rem', 
                  borderRadius: '30px', 
                  border: 'none', 
                  background: !isYearly ? 'var(--ink)' : 'transparent', 
                  color: !isYearly ? 'var(--paper)' : 'var(--muted)', 
                  cursor: 'pointer', 
                  fontFamily: "'DM Mono', monospace", 
                  fontSize: '0.75rem', 
                  letterSpacing: '0.1em', 
                  textTransform: 'uppercase', 
                  transition: 'all 0.3s ease' 
                }}
              >
                Monthly
              </button>
              <button 
                onClick={() => setIsYearly(true)}
                style={{ 
                  padding: '0.7rem 1.8rem', 
                  borderRadius: '30px', 
                  border: 'none', 
                  background: isYearly ? 'var(--ink)' : 'transparent', 
                  color: isYearly ? 'var(--paper)' : 'var(--muted)', 
                  cursor: 'pointer', 
                  fontFamily: "'DM Mono', monospace", 
                  fontSize: '0.75rem', 
                  letterSpacing: '0.1em', 
                  textTransform: 'uppercase', 
                  transition: 'all 0.3s ease' 
                }}
              >
                Yearly <span style={{ color: isYearly ? 'var(--gold-light)' : 'var(--gold)', marginLeft: '6px' }}>-20%</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="pricing-grid">
        <div className="plan-card">
          <div className="plan-name">Starter</div>
          <div className="plan-price">
            <sup>$</sup>
            <span style={{ display: 'inline-block', minWidth: '70px', transition: 'all 0.3s ease' }}>{isYearly ? '427' : '44'}</span>
            <sub>{isYearly ? '/year' : '/mo'}</sub>
          </div>
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
          <a href={getPlanLink('starter')} className="plan-btn">Get started</a>
        </div>

        <div className="plan-card featured">
          <div className="featured-badge">Most popular</div>
          <div className="plan-name">Growth</div>
          <div className="plan-price">
            <sup>$</sup>
            <span style={{ display: 'inline-block', minWidth: '95px', transition: 'all 0.3s ease' }}>{isYearly ? '1064' : '112'}</span>
            <sub>{isYearly ? '/year' : '/mo'}</sub>
          </div>
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
          <a href={getPlanLink('growth')} className="plan-btn">Get started</a>
        </div>

        <div className="plan-card">
          <div className="plan-name">Enterprise</div>
          <div className="plan-price">
            <sup>$</sup>
            <span style={{ display: 'inline-block', minWidth: '95px', transition: 'all 0.3s ease' }}>{isYearly ? '2144' : '224'}</span>
            <sub>{isYearly ? '/year' : '/mo'}</sub>
          </div>
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
          <a href={getPlanLink('enterprise')} className="plan-btn">{tenantId ? 'Subscribe' : 'Contact sales'}</a>
        </div>
      </div>
    </section>
  );
}
