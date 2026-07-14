export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-left">
        <div className="hero-tag">WhatsApp & Telegram AI for SMBs</div>
        <h1>Schedule appointments<br/>via <em>chat.</em></h1>
        <p className="hero-sub">Vexyr gives small businesses an AI agent that talks to your users via text, schedules appointments, and sends confirmation emails — 24 hours a day.</p>
        <div className="hero-actions">
          <a href="/login" className="btn-primary">Start free trial</a>
          <a href="#how" className="btn-secondary">See how it works</a>
        </div>
      </div>

      <div className="hero-right">
        <div className="chat-card">
          <div className="chat-header">
            <div className="chat-status">
              <div className="chat-dot"></div>
              WhatsApp Chat
            </div>
            <div className="chat-timer">Online</div>
          </div>

          <div className="chat-transcript">
            <div className="msg" style={{ animationDelay: '0.5s' }}>
              <span className="msg-label user">User</span>
              <span className="msg-text muted">HI, I need an appointment.</span>
            </div>
            <div className="msg" style={{ animationDelay: '1s' }}>
              <span className="msg-label ai">AI</span>
              <span className="msg-text">Hello! I'd be happy to help. We have openings at 2 PM and 4 PM on Saturday. Which works best?</span>
            </div>
            <div className="msg" style={{ animationDelay: '1.5s' }}>
              <span className="msg-label user">User</span>
              <span className="msg-text muted">2 PM please. My email is priya@example.com.</span>
            </div>
            <div className="msg" style={{ animationDelay: '2s' }}>
              <span className="msg-label ai">AI</span>
              <span className="msg-text">Perfect, Priya! Booking confirmed for Saturday 2 PM. I just sent a confirmation to your email.</span>
            </div>
          </div>

          <div className="typing-indicator" style={{ animationDelay: '2.5s' }}>
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
          </div>

          <div className="chat-metrics">
            <div className="metric-item">
              <span className="metric-val">412</span>
              <span className="metric-lbl">Chats / mo</span>
            </div>
            <div className="metric-item">
              <span className="metric-val">98<small style={{ fontSize: '1rem' }}>%</small></span>
              <span className="metric-lbl">Booked</span>
            </div>
            <div className="metric-item">
              <span className="metric-val">100<small style={{ fontSize: '1rem' }}>%</small></span>
              <span className="metric-lbl">Follow-ups</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
