export default function CallsAnalytics() {
  const hourlyData = [
    { hour: "12AM", calls: 2 },
    { hour: "3AM", calls: 1 },
    { hour: "6AM", calls: 8 },
    { hour: "9AM", calls: 45 },
    { hour: "12PM", calls: 78 },
    { hour: "3PM", calls: 62 },
    { hour: "6PM", calls: 34 },
    { hour: "9PM", calls: 12 },
  ];

  const maxCalls = Math.max(...hourlyData.map(d => d.calls));

  return (
    <div className="analytics-card">
      <div className="card-header">
        <div>
          <h3 className="card-title">Call Volume</h3>
          <p className="card-subtitle">Hourly distribution over last 24 hours</p>
        </div>
        <div className="card-legend">
          <span className="legend-item">
            <span className="legend-dot"></span>
            Calls received
          </span>
        </div>
      </div>
      
      <div className="chart-container">
        <div className="bar-chart">
          {hourlyData.map((data, idx) => (
            <div key={idx} className="bar-group">
              <div className="bar-wrapper">
                <div 
                  className="bar" 
                  style={{ height: `${(data.calls / maxCalls) * 100}%` }}
                  title={`${data.calls} calls`}
                >
                  <span className="bar-value">{data.calls}</span>
                </div>
              </div>
              <span className="bar-label">{data.hour}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card-footer">
        <div className="footer-stat">
          <span className="footer-label">Peak Hour</span>
          <span className="footer-value">12 PM</span>
        </div>
        <div className="footer-stat">
          <span className="footer-label">Avg / Hour</span>
          <span className="footer-value">30.2</span>
        </div>
        <div className="footer-stat">
          <span className="footer-label">Total Today</span>
          <span className="footer-value">242</span>
        </div>
      </div>
    </div>
  );
}
