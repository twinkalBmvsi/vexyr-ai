export default function AdminHeader() {
  return (
    <div className="admin-header">
      <div className="admin-header-left">
        <div className="section-label">Business Analytics</div>
        <h1 className="admin-title">Performance <em>Dashboard</em></h1>
        <p className="admin-subtitle">Real-time insights into your AI voice operations</p>
      </div>
      <div className="admin-header-right">
        <div className="date-range-selector">
          <button className="date-btn active">Today</button>
          <button className="date-btn">7 Days</button>
          <button className="date-btn">30 Days</button>
          <button className="date-btn">All Time</button>
        </div>
      </div>
    </div>
  );
}
