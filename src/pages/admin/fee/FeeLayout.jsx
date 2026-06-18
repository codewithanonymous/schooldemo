import React from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Settings, 
  Users, 
  PlusCircle, 
  AlertTriangle, 
  History, 
  FileText, 
  BarChart3 
} from "lucide-react";

export default function FeeLayout() {
  const location = useLocation();

  const tabItems = [
    { path: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "structure", label: "Structures", icon: Settings },
    { path: "students", label: "Students", icon: Users },
    { path: "collections", label: "Collect Fees", icon: PlusCircle },
    { path: "pending", label: "Pending Dues", icon: AlertTriangle },
    { path: "transactions", label: "Transactions", icon: History },
    { path: "receipts", label: "Receipts", icon: FileText },
    { path: "reports", label: "Reports", icon: BarChart3 }
  ];

  // Derive page name for breadcrumb
  const currentTab = location.pathname.split("/").pop();
  const pageTitle = tabItems.find(t => t.path === currentTab)?.label || "Fee Management";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", width: "100%", animation: "fadeIn 0.3s ease-out" }}>
      {/* Breadcrumb & Section Info */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>
          <span>Admin Workspace</span>
          <span>/</span>
          <span>Fee Management</span>
          <span>/</span>
          <span style={{ color: "var(--primary)" }}>{pageTitle}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              School Fee Workspace
            </h1>
            <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: "14px" }}>
              Overview and audit controls for student tuition, transport, and term billing.
            </p>
          </div>
        </div>
      </div>

      {/* Workspace Menu Bar */}
      <div style={{ 
        display: "flex", 
        gap: "6px", 
        borderBottom: "1px solid var(--border-color)", 
        paddingBottom: "4px",
        overflowX: "auto",
        whiteSpace: "nowrap"
      }}>
        {tabItems.map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 18px",
                borderRadius: "var(--radius-md)",
                color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                background: isActive ? "var(--primary)" : "transparent",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: 600,
                transition: "all 0.2s ease"
              })}
            >
              <Icon size={16} />
              {item.label}
            </NavLink>
          );
        })}
      </div>

      {/* Nested Page Content */}
      <div style={{ minHeight: "400px" }}>
        <Outlet />
      </div>
    </div>
  );
}
