export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-left">
        <div className="hero-tag">Voice AI for SMBs</div>
        <h1>Your business,<br/>always <em>answering.</em></h1>
        <p className="hero-sub">Vexyr gives small businesses an AI voice agent that books appointments, takes orders, handles returns, and grows your reputation — 24 hours a day.</p>
        <div className="hero-actions">
          <a href="#pricing" className="btn-primary">Start free trial</a>
          <a href="#how" className="btn-secondary">See how it works</a>
        </div>
      </div>

      <div className="hero-right">
        <div className="call-card">
          <div className="call-header">
            <div className="call-status">
              <div className="call-dot"></div>
              Live call
            </div>
            <div className="call-timer">02:14</div>
          </div>

          <div className="call-transcript">
            <div className="msg" style={{ animationDelay: '0.5s' }}>
              <span className="msg-label user">Caller</span>
              <span className="msg-text muted">Hi, I'd like to book a haircut for Saturday afternoon.</span>
            </div>
            <div className="msg" style={{ animationDelay: '1s' }}>
              <span className="msg-label ai">AI</span>
              <span className="msg-text">Of course! We have openings at 2 PM and 4 PM on Saturday. Which works best?</span>
            </div>
            <div className="msg" style={{ animationDelay: '1.5s' }}>
              <span className="msg-label user">Caller</span>
              <span className="msg-text muted">2 PM please. My name is Priya.</span>
            </div>
            <div className="msg" style={{ animationDelay: '2s' }}>
              <span className="msg-label ai">AI</span>
              <span className="msg-text">Perfect, Priya! Booking confirmed for Saturday 2 PM. You'll receive an SMS shortly.</span>
            </div>
          </div>

          <div className="waveform">
            <div className="wave-bar"></div>
            <div className="wave-bar"></div>
            <div className="wave-bar"></div>
            <div className="wave-bar"></div>
            <div className="wave-bar"></div>
            <div className="wave-bar"></div>
            <div className="wave-bar"></div>
            <div className="wave-bar"></div>
          </div>

          <div className="call-metrics">
            <div className="metric-item">
              <span className="metric-val">143</span>
              <span className="metric-lbl">Calls / mo</span>
            </div>
            <div className="metric-item">
              <span className="metric-val">94<small style={{ fontSize: '1rem' }}>%</small></span>
              <span className="metric-lbl">Resolved</span>
            </div>
            <div className="metric-item">
              <span className="metric-val">0</span>
              <span className="metric-lbl">Staff needed</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
