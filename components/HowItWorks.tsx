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
                <div className="step-title">Register & choose your plan</div>
                <p className="step-desc">Sign up, select your plan, and tick the modules your business needs. Pay once, get access instantly.</p>
              </div>
            </div>
            <div className="step">
              <div className="step-num">02</div>
              <div className="step-content">
                <div className="step-title">Connect messaging accounts</div>
                <p className="step-desc">Link your WhatsApp Business and Telegram accounts with one click. Your AI agent is instantly configured to reply on these channels.</p>
              </div>
            </div>
            <div className="step">
              <div className="step-num">03</div>
              <div className="step-content">
                <div className="step-title">Customise from your dashboard</div>
                <p className="step-desc">Set your business hours, calendar links, AI tone, and email confirmation templates from a simple dashboard. No technical skills required.</p>
              </div>
            </div>
            <div className="step">
              <div className="step-num">04</div>
              <div className="step-content">
                <div className="step-title">Your AI handles the chats</div>
                <p className="step-desc">Customers message you. The AI handles the conversation, schedules appointments, and sends email confirmations automatically.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="how-visual">
          <div className="phone-mock">
            <div className="phone-notch"></div>
            <div className="phone-screen">
              <div className="chat-mock-header">WhatsApp Business</div>
              <div className="chat-mock-business">Glamour Studio</div>
              <div className="chat-mock-bubbles">
                <div className="mock-bubble user-bubble">Hi, do you have time today?</div>
                <div className="mock-bubble ai-bubble">Yes! We have a 3 PM slot available. Shall I book it for you?</div>
              </div>
              <div className="chat-mock-input">
                <div className="mock-input-bar">Message...</div>
              </div>
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
