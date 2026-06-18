import React, { useEffect, useState } from "react";
import { feeDashboardService } from "../../../services/fee/feeDashboardService";
import { feeReportService } from "../../../services/fee/feeReportService";
import { 
  IndianRupee, 
  Users, 
  UserCheck, 
  UserX, 
  CalendarDays,
  FileCheck,
  Percent, 
  TrendingUp, 
  ArrowUpRight,
  TrendingDown
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, Cell } from "recharts";

export default function FeeDashboard() {
  const [stats, setStats] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [recentTx, setRecentTx] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [dashStats, repData, recent] = await Promise.all([
          feeDashboardService.getDashboardStats(),
          feeReportService.getReportData(),
          feeDashboardService.getRecentTransactions()
        ]);
        setStats(dashStats);
        setReportData(repData);
        setRecentTx(recent);
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const fmt = (val) => `₹${Number(val ?? 0).toLocaleString("en-IN")}`;

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "300px", flexDirection: "column", gap: "12px" }}>
        <div className="spinner" />
        <span style={{ color: "var(--text-secondary)" }}>Loading dashboard analytics...</span>
      </div>
    );
  }

  // Find monthly collection for current month
  const currentMonthData = reportData?.monthly?.[reportData.monthly.length - 1];
  const monthlyCollection = currentMonthData ? currentMonthData.collected : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* Metrics Row 1: School Overview */}
      <div className="dashboard-grid">
        <div className="stat-card">
          <div className="stat-icon primary">
            <Users size={24} />
          </div>
          <div>
            <div className="stat-label">Total Students</div>
            <div className="stat-value">{reportData?.summary?.totalStudents}</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon success">
            <UserCheck size={24} />
          </div>
          <div>
            <div className="stat-label">Paid Students</div>
            <div className="stat-value">{reportData?.summary?.paidStudents}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon danger">
            <UserX size={24} />
          </div>
          <div>
            <div className="stat-label">Pending Students</div>
            <div className="stat-value">{reportData?.summary?.pendingStudents}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon warning">
            <Percent size={24} />
          </div>
          <div>
            <div className="stat-label">Collection Rate</div>
            <div className="stat-value">{(reportData?.summary?.collectionRate || 0).toFixed(1)}%</div>
          </div>
        </div>
      </div>

      {/* Metrics Row 2: Financial Aggregates */}
      <div className="dashboard-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        <div className="stat-card" style={{ borderLeft: "4px solid var(--primary)" }}>
          <div className="stat-icon" style={{ background: "var(--primary-light)", color: "var(--primary)" }}>
            <IndianRupee size={24} />
          </div>
          <div>
            <div className="stat-label">Total Expected Fees</div>
            <div className="stat-value" style={{ color: "var(--primary)" }}>{fmt(reportData?.summary?.totalFeeAmount)}</div>
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: "4px solid var(--success)" }}>
          <div className="stat-icon" style={{ background: "var(--success-light)", color: "var(--success)" }}>
            <IndianRupee size={24} />
          </div>
          <div>
            <div className="stat-label">Total Collected Fees</div>
            <div className="stat-value" style={{ color: "var(--success)" }}>{fmt(reportData?.summary?.totalCollected)}</div>
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: "4px solid var(--danger)" }}>
          <div className="stat-icon" style={{ background: "var(--danger-light)", color: "var(--danger)" }}>
            <IndianRupee size={24} />
          </div>
          <div>
            <div className="stat-label">Total Outstanding Fees</div>
            <div className="stat-value" style={{ color: "var(--danger)" }}>{fmt(reportData?.summary?.totalOutstanding)}</div>
          </div>
        </div>
      </div>

      {/* Metrics Row 3: Collection Speeds */}
      <div className="dashboard-grid">
        <div className="stat-card" style={{ background: "linear-gradient(135deg, #4f46e5 0%, #312e81 100%)", borderColor: "transparent" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#e0e7ff" }}>Today's Collection</span>
              <ArrowUpRight size={18} color="#818cf8" />
            </div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#ffffff" }}>
              {fmt(stats?.totalCollectionToday)}
            </div>
            <div style={{ fontSize: "11px", color: "#c7d2fe", display: "flex", gap: "10px", marginTop: "4px" }}>
              <span>Cash: {fmt(stats?.cashCollection)}</span>
              <span>•</span>
              <span>UPI: {fmt(stats?.upiCollection)}</span>
            </div>
          </div>
        </div>

        <div className="stat-card" style={{ background: "linear-gradient(135deg, #0f766e 0%, #115e59 100%)", borderColor: "transparent" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#ccfbf1" }}>Monthly Collection</span>
              <CalendarDays size={18} color="#2dd4bf" />
            </div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#ffffff" }}>
              {fmt(monthlyCollection)}
            </div>
            <div style={{ fontSize: "11px", color: "#99f6e4", marginTop: "4px" }}>
              Current billing term collection progress
            </div>
          </div>
        </div>

        <div className="stat-card" style={{ background: "linear-gradient(135deg, #b45309 0%, #78350f 100%)", borderColor: "transparent" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#fef3c7" }}>Receipts Issued Today</span>
              <FileCheck size={18} color="#fbbf24" />
            </div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#ffffff" }}>
              {stats?.receiptsGenerated}
            </div>
            <div style={{ fontSize: "11px", color: "#fde68a", marginTop: "4px" }}>
              Receipt invoices printed and signed
            </div>
          </div>
        </div>
      </div>

      {/* Chart and Recent payments split */}
      <div className="charts-grid">
        {/* Collection Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <h2>Collection Trends</h2>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Monthly Revenue Intake</div>
          </div>
          <div style={{ width: "100%", height: "260px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={reportData?.monthly || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
                <Tooltip 
                  formatter={(val) => [fmt(val), "Collected"]}
                  contentStyle={{ background: "var(--bg-card)", borderColor: "var(--border-color)", borderRadius: "var(--radius-md)" }}
                  labelStyle={{ color: "var(--text-primary)" }}
                />
                <Area type="monotone" dataKey="collected" stroke="var(--primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorCollected)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment mode share */}
        <div className="chart-card">
          <div className="chart-header">
            <h2>Mode Distribution</h2>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Total Collected Share</div>
          </div>
          <div style={{ width: "100%", height: "260px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportData?.byPaymentMode || []} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <XAxis dataKey="mode" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
                <Tooltip 
                  formatter={(val) => [fmt(val), "Collected"]}
                  contentStyle={{ background: "var(--bg-card)", borderColor: "var(--border-color)", borderRadius: "var(--radius-md)" }}
                />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                  {(reportData?.byPaymentMode || []).map((entry, index) => {
                    const colors = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];
                    return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Payments Table */}
      <div className="table-card">
        <div className="table-header-container">
          <h2>Recent Fee Collections</h2>
          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Last 10 payments received</div>
        </div>
        
        <div className="custom-table-wrapper">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Receipt No</th>
                <th>Student Name</th>
                <th>Admission No</th>
                <th>Class / Section</th>
                <th>Mode</th>
                <th>Date</th>
                <th style={{ textAlign: "right" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {recentTx.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "30px", color: "var(--text-secondary)" }}>
                    No collections logged recently.
                  </td>
                </tr>
              ) : (
                recentTx.map((tx) => {
                  return (
                    <tr key={tx.id}>
                      <td style={{ fontWeight: 700, color: "var(--primary)" }}>{tx.receipt_number}</td>
                      <td>{tx.student_name}</td>
                      <td style={{ fontFamily: "monospace", fontSize: "13px" }}>{tx.admission_number}</td>
                      <td>{tx.class_name ? `${tx.class_name} - ${tx.section_name}` : "—"}</td>
                      <td>
                        <span className={`badge ${
                          tx.payment_mode === "Cash" ? "badge-success" : 
                          tx.payment_mode === "UPI" ? "badge-primary" : 
                          "badge-warning"
                        }`}>
                          {tx.payment_mode}
                        </span>
                      </td>
                      <td>{new Date(tx.receipt_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                      <td style={{ textAlign: "right", fontWeight: 700, color: "var(--success)" }}>{fmt(tx.amount)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
