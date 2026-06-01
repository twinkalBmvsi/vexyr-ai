export default function TopPerformers() {
  const services = [
    { name: "Appointment Booking", calls: 342, revenue: "$8,200", resolution: 98 },
    { name: "Order Taking", calls: 218, revenue: "$6,400", resolution: 95 },
    { name: "Customer Support", calls: 487, revenue: "$2,100", resolution: 92 },
    { name: "Returns Processing", calls: 124, revenue: "$1,200", resolution: 89 },
    { name: "General Inquiries", calls: 76, revenue: "$300", resolution: 94 },
  ];

  return (
    <div className="analytics-card">
      <div className="card-header">
        <div>
          <h3 className="card-title">Top Services</h3>
          <p className="card-subtitle">Performance by service type</p>
        </div>
      </div>
      
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Service</th>
              <th>Calls</th>
              <th>Revenue</th>
              <th>Resolution</th>
            </tr>
          </thead>
          <tbody>
            {services.map((service, idx) => (
              <tr key={idx}>
                <td className="service-name">
                  <span className="service-num">{String(idx + 1).padStart(2, '0')}</span>
                  {service.name}
                </td>
                <td className="calls-count">{service.calls}</td>
                <td className="revenue-amount">{service.revenue}</td>
                <td>
                  <div className="resolution-bar">
                    <div 
                      className="resolution-fill" 
                      style={{ width: `${service.resolution}%` }}
                    ></div>
                    <span className="resolution-text">{service.resolution}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
