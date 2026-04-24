export default function HowItWorks() {
  return (
    <section className="how" id="how">
      <div className="how-grid">
        <div>
          <div className="section-label">How it works</div>
          <h2 className="section-title">Live in <em>minutes,</em><br/>not months</h2>

          <div className="steps">
            <div className="step">
              <div className="step-num">01</div>
              <div className="step-content">
                <div className="step-title">Register & choose your modules</div>
                <p className="step-desc">Sign up, select your plan, and tick the modules your business needs. Pay once, get access instantly.</p>
              </div>
            </div>
            <div className="step">
              <div className="step-num">02</div>
              <div className="step-content">
                <div className="step-title">We configure your AI agent</div>
                <p className="step-desc">Your phone number is assigned, your knowledge base is loaded, and your agent is configured — all automatically within minutes.</p>
              </div>
            </div>
            <div className="step">
              <div className="step-num">03</div>
              <div className="step-content">
                <div className="step-title">Customise from your dashboard</div>
                <p className="step-desc">Set your business hours, services, AI tone, and review triggers from a simple dashboard. No technical skills required.</p>
              </div>
            </div>
            <div className="step">
              <div className="step-num">04</div>
              <div className="step-content">
                <div className="step-title">Your AI answers every call</div>
                <p className="step-desc">Customers call your number. The AI handles everything. You review bookings, orders, and reports from your dashboard.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="how-visual">
          <div className="phone-mock">
            <div className="phone-notch"></div>
            <div className="phone-screen">
              <div className="phone-calling">Incoming call</div>
              <div className="phone-business">Glamour Studio</div>
              <div className="phone-waves">
                <div className="phone-wave ph-w1"></div>
                <div className="phone-wave ph-w2"></div>
                <div className="phone-wave ph-w3"></div>
                <div className="phone-wave ph-w4"></div>
                <div className="phone-wave ph-w5"></div>
              </div>
              <div className="phone-time">AI answering · 00:08</div>
            </div>
          </div>

          <div className="visual-stats">
            <div className="vstat">
              <span className="vstat-num">47</span>
              <span className="vstat-lbl">Bookings this week</span>
            </div>
            <div className="vstat">
              <span className="vstat-num">$3.2k</span>
              <span className="vstat-lbl">Est. revenue</span>
            </div>
            <div className="vstat">
              <span className="vstat-num">4.8</span>
              <span className="vstat-lbl">Google rating</span>
            </div>
            <div className="vstat">
              <span className="vstat-num">12</span>
              <span className="vstat-lbl">New reviews</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
