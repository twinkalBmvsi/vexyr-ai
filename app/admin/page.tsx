import "./styles.css";
import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminHeader from "../../components/admin/AdminHeader";
import MetricsOverview from "../../components/admin/MetricsOverview";
import CallsAnalytics from "../../components/admin/CallsAnalytics";
import RevenueChart from "../../components/admin/RevenueChart";
import TopPerformers from "../../components/admin/TopPerformers";
import RecentActivity from "../../components/admin/RecentActivity";

export default function AdminDashboard() {
  return (
    <div className="admin-layout">
      <AdminSidebar />
      <main className="admin-main">
        <AdminHeader />
        <MetricsOverview />
        <div className="admin-grid">
          <CallsAnalytics />
          <RevenueChart />
        </div>
        <div className="admin-grid">
          <TopPerformers />
          <RecentActivity />
        </div>
      </main>
    </div>
  );
}
