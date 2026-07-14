export default function Signup() {
  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Create account</h1>
          <p className="auth-subtitle">Join hundreds of small businesses on Vexyr</p>
        </div>

        <form className="auth-form" action="#">
          <div className="form-group">
            <label className="form-label" htmlFor="fullName">Full Name</label>
            <input 
              type="text" 
              id="fullName" 
              name="fullName" 
              className="form-input" 
              placeholder="Priya Patel" 
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="businessName">Business Name</label>
            <input 
              type="text" 
              id="businessName" 
              name="businessName" 
              className="form-input" 
              placeholder="Glamour Studio" 
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <input 
              type="email" 
              id="email" 
              name="email" 
              className="form-input" 
              placeholder="name@company.com" 
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input 
              type="password" 
              id="password" 
              name="password" 
              className="form-input" 
              placeholder="Create a strong password" 
              required 
            />
          </div>

          <button type="submit" className="auth-btn" style={{ marginTop: '0.5rem' }}>Start Free Trial</button>
        </form>

        <div className="auth-switch">
          Already have an account? <a href="/login">Sign in</a>
        </div>
      </div>
    </div>
  );
}
