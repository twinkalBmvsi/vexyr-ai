export default function RevenueChart() {
  const weeklyData = [
    { day: "Mon", revenue: 2400, appointments: 42 },
    { day: "Tue", revenue: 3200, appointments: 58 },
    { day: "Wed", revenue: 2800, appointments: 48 },
    { day: "Thu", revenue: 3800, appointments: 65 },
    { day: "Fri", revenue: 4200, appointments: 72 },
    { day: "Sat", revenue: 3600, appointments: 61 },
    { day: "Sun", revenue: 2200, appointments: 38 },
  ];

  const maxRevenue = Math.max(...weeklyData.map(d => d.revenue));

  return (
    <div className="analytics-card">
      <div className="card-header">
        <div>
          <h3 className="card-title">Revenue Impact</h3>
          <p className="card-subtitle">AI-attributed revenue this week</p>
        </div>
        <div className="card-legend">
          <span className="legend-item">
            <span className="legend-dot gold"></span>
            Revenue
          </span>
          <span className="legend-item">
            <span className="legend-dot muted"></span>
            Appointments
          </span>
        </div>
      </div>
      
      <div className="chart-container">
        <div className="line-chart">
          <svg viewBox="0 0 400 200" className="chart-svg">
            {/* Grid lines */}
            <line x1="0" y1="50" x2="400" y2="50" stroke="var(--border)" strokeWidth="1" />
            <line x1="0" y1="100" x2="400" y2="100" stroke="var(--border)" strokeWidth="1" />
            <line x1="0" y1="150" x2="400" y2="150" stroke="var(--border)" strokeWidth="1" />
            
            {/* Revenue line */}
            <polyline
              points={weeklyData.map((d, i) => 
                `${(i * 57) + 28},${200 - (d.revenue / maxRevenue) * 150}`
              ).join(' ')}
              fill="none"
              stroke="var(--gold)"
              strokeWidth="2.5"
            />
            
            {/* Data points */}
            {weeklyData.map((d, i) => (
              <circle
                key={i}
                cx={(i * 57) + 28}
                cy={200 - (d.revenue / maxRevenue) * 150}
                r="4"
                fill="var(--gold)"
              />
            ))}
          </svg>
        </div>
        
        <div className="chart-labels">
          {weeklyData.map((d, idx) => (
            <div key={idx} className="chart-label-item">
              <span className="chart-day">{d.day}</span>
              <span className="chart-amount">${(d.revenue / 1000).toFixed(1)}K</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card-footer">
        <div className="footer-stat">
          <span className="footer-label">This Week</span>
          <span className="footer-value">$22.2K</span>
        </div>
        <div className="footer-stat">
          <span className="footer-label">Last Week</span>
          <span className="footer-value">$18.4K</span>
        </div>
        <div className="footer-stat">
          <span className="footer-label">Growth</span>
          <span className="footer-value growth">+20.7%</span>
        </div>
      </div>
    </div>
  );
}
