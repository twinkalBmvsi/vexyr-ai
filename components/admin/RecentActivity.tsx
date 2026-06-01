export default function RecentActivity() {
  const activities = [
    {
      type: "appointment",
      customer: "Sarah Chen",
      action: "Booked haircut appointment",
      time: "2 min ago",
      status: "completed"
    },
    {
      type: "order",
      customer: "Michael Torres",
      action: "Placed order for delivery",
      time: "8 min ago",
      status: "completed"
    },
    {
      type: "support",
      customer: "Emma Wilson",
      action: "Asked about store hours",
      time: "12 min ago",
      status: "completed"
    },
    {
      type: "return",
      customer: "James Park",
      action: "Initiated return process",
      time: "18 min ago",
      status: "pending"
    },
    {
      type: "appointment",
      customer: "Lisa Anderson",
      action: "Rescheduled appointment",
      time: "24 min ago",
      status: "completed"
    },
    {
      type: "support",
      customer: "David Kim",
      action: "Product inquiry",
      time: "31 min ago",
      status: "completed"
    },
  ];

  const getTypeIcon = (type: string) => {
    const icons = {
      appointment: "📅",
      order: "🛍️",
      support: "💬",
      return: "↩️"
    };
    return icons[type as keyof typeof icons] || "•";
  };

  return (
    <div className="analytics-card">
      <div className="card-header">
        <div>
          <h3 className="card-title">Recent Activity</h3>
          <p className="card-subtitle">Live call log and interactions</p>
        </div>
        <button className="view-all-btn">View all</button>
      </div>
      
      <div className="activity-list">
        {activities.map((activity, idx) => (
          <div key={idx} className="activity-item">
            <div className="activity-icon">{getTypeIcon(activity.type)}</div>
            <div className="activity-content">
              <div className="activity-customer">{activity.customer}</div>
              <div className="activity-action">{activity.action}</div>
            </div>
            <div className="activity-meta">
              <div className="activity-time">{activity.time}</div>
              <span className={`activity-status ${activity.status}`}>
                {activity.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
