# Admin Dashboard Components

Business analytics dashboard for Vexyr AI voice platform.

## Components

### AdminHeader
Page header with title and date range selector (Today, 7 Days, 30 Days, All Time)

### MetricsOverview
6-card grid showing key metrics:
- Total Calls
- Resolved percentage
- Average Duration
- Revenue Impact
- Appointments
- Customer Satisfaction

### CallsAnalytics
Bar chart showing hourly call volume distribution over 24 hours with peak hour stats

### RevenueChart
Line chart displaying weekly revenue trends with appointment correlation

### TopPerformers
Table showing top 5 services by calls, revenue, and resolution rate

### RecentActivity
Live activity feed showing recent customer interactions with status indicators

## Design System

Matches landing page aesthetic:
- **Fonts**: Cormorant Garamond (headings), DM Sans (body), DM Mono (labels/data)
- **Colors**: Ink (#0c0c0c), Paper (#f5f2ec), Cream (#ede9e0), Gold (#c9a84c)
- **Style**: Minimal, elegant, data-focused

## Route

Access at `/admin`
