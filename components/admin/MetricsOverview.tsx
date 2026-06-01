export default function MetricsOverview() {
  const metrics = [
    { label: "Total Calls", value: "1,247", change: "+12.3%", trend: "up" },
    { label: "Resolved", value: "94%", change: "+2.1%", trend: "up" },
    { label: "Avg Duration", value: "2:14", change: "-0:08", trend: "down" },
    { label: "Revenue Impact", value: "$18.2K", change: "+24.5%", trend: "up" },
    { label: "Appointments", value: "342", change: "+18.2%", trend: "up" },
    { label: "Customer Satisfaction", value: "4.8", change: "+0.2", trend: "up" },
  ];

  return (
    <div className="metrics-overview">
      {metrics.map((metric, idx) => (
        <div key={idx} className="metric-card">
          <div className="metric-header">
            <span className="metric-label">{metric.label}</span>
            <span className={`metric-change ${metric.trend}`}>{metric.change}</span>
          </div>
          <div className="metric-value">{metric.value}</div>
        </div>
      ))}
    </div>
  );
}
