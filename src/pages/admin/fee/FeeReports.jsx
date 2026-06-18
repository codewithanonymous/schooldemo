import React, { useState, useEffect, useCallback } from "react";
import { feeReportService } from "../../../services/fee/feeReportService";
import { Download, RefreshCw, TrendingUp, IndianRupee, Users, BarChart2, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";

export default function FeeReports() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const fetchAnalytics = useCallback(async (sd, ed) => {
    setLoading(true);
    setError(null);
    try {
      const report = await feeReportService.getReportData(sd, ed);
      setData(report);
    } catch (err) {
      console.error(err);
      setError("Failed to compile financial summaries.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics("", "");
  }, [fetchAnalytics]);

  const handleGenerate = () => {
    fetchAnalytics(startDate, endDate);
  };

  const exportExcel = () => {
    if (!data) return;
    setExporting(true);

    try {
      const wb = XLSX.utils.book_new();

      // ── Sheet 1: Financial Summary ──
      const s1Rows = [
        ["Greenwoods International School — Financial Report"],
        ["Generated On", data.generatedAt],
        data.filters.startDate || data.filters.endDate
          ? ["Date Filter", `${data.filters.startDate || "All"} to ${data.filters.endDate || "All"}`]
          : ["Date Filter", "All Time"],
        [],
        ["KPI Indicator", "Value"],
        ["Total Fees Collected", fmt(data.summary.totalCollected)],
        ["Total Outstanding Fees", fmt(data.summary.totalOutstanding)],
        ["Total Expected Fees", fmt(data.summary.totalFeeAmount)],
        ["Collection Rate", `${data.summary.collectionRate.toFixed(1)}%`],
        ["Total Receipts Issued", data.summary.totalReceipts],
        ["Total Active Students", data.summary.totalStudents],
        ["Students with Dues Cleared", data.summary.paidStudents],
        ["Students with Pending Dues", data.summary.pendingStudents],
      ];
      const ws1 = XLSX.utils.aoa_to_sheet(s1Rows);
      ws1["!cols"] = [{ wch: 36 }, { wch: 26 }];
      XLSX.utils.book_append_sheet(wb, ws1, "Financial Summary");

      // ── Sheet 2: Class Revenue ──
      const s2Rows = [
        ["Class Level", "Revenue (₹)", "% share"],
        ...data.byClass.map((c) => [
          c.class_name,
          c.revenue,
          data.summary.totalCollected > 0
            ? parseFloat(((c.revenue / data.summary.totalCollected) * 100).toFixed(2))
            : 0
        ]),
        [],
        ["Total", data.summary.totalCollected, 100]
      ];
      const ws2 = XLSX.utils.aoa_to_sheet(s2Rows);
      ws2["!cols"] = [{ wch: 20 }, { wch: 18 }, { wch: 14 }];
      XLSX.utils.book_append_sheet(wb, ws2, "Class Revenue");

      // ── Sheet 3: Section Revenue ──
      const s3Rows = [
        ["Section", "Revenue (₹)", "% share"],
        ...data.bySection.map((s) => [
          s.section_name,
          s.revenue,
          data.summary.totalCollected > 0
            ? parseFloat(((s.revenue / data.summary.totalCollected) * 100).toFixed(2))
            : 0
        ]),
        [],
        ["Total", data.summary.totalCollected, 100]
      ];
      const ws3 = XLSX.utils.aoa_to_sheet(s3Rows);
      ws3["!cols"] = [{ wch: 20 }, { wch: 18 }, { wch: 14 }];
      XLSX.utils.book_append_sheet(wb, ws3, "Section Revenue");

      // ── Sheet 4: Monthly Collections ──
      const s4Rows = [
        ["Month", "Amount Collected (₹)", "Receipts Issued"],
        ...data.monthly.map((m) => [m.month, m.collected, m.receipts]),
        [],
        ["Total", data.summary.totalCollected, data.summary.totalReceipts]
      ];
      const ws4 = XLSX.utils.aoa_to_sheet(s4Rows);
      ws4["!cols"] = [{ wch: 18 }, { wch: 22 }, { wch: 16 }];
      XLSX.utils.book_append_sheet(wb, ws4, "Monthly Collection");

      // ── Sheet 5: Mode Share ──
      const s5Rows = [
        ["Payment Mode", "Amount Collected (₹)", "Receipts Issued", "% share"],
        ...data.byPaymentMode.map((p) => [
          p.mode,
          p.amount,
          p.count,
          data.summary.totalCollected > 0
            ? parseFloat(((p.amount / data.summary.totalCollected) * 100).toFixed(2))
            : 0
        ]),
        [],
        ["Total", data.summary.totalCollected, data.summary.totalReceipts, 100]
      ];
      const ws5 = XLSX.utils.aoa_to_sheet(s5Rows);
      ws5["!cols"] = [{ wch: 18 }, { wch: 22 }, { wch: 16 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, ws5, "Payment Mode Share");

      // Save workbook
      const dateStr = new Date().toISOString().split("T")[0];
      XLSX.writeFile(wb, `School_Fee_Report_${dateStr}.xlsx`);
    } catch (err) {
      console.error(err);
      setError("Error exporting excel file.");
    } finally {
      setExporting(false);
    }
  };

  const fmt = (n) => `₹${n.toLocaleString("en-IN")}`;
  const pct = (n) => `${n.toFixed(1)}%`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", width: "100%" }}>
      {/* Date filter row */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: "14px", flexWrap: "wrap", background: "var(--bg-card)", border: "1px solid var(--border-color)", padding: "20px 24px", borderRadius: "var(--radius-lg)" }}>
        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>START DATE</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ padding: "9px 12px", border: "1px solid var(--border-color)", borderRadius: "8px", background: "var(--bg-main)", color: "var(--text-primary)", outline: "none", fontSize: "14px" }}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>END DATE</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ padding: "9px 12px", border: "1px solid var(--border-color)", borderRadius: "8px", background: "var(--bg-main)", color: "var(--text-primary)", outline: "none", fontSize: "14px" }}
          />
        </div>

        <button className="btn btn-primary" onClick={handleGenerate} disabled={loading} style={{ height: "38px" }}>
          <RefreshCw size={14} className={loading ? "spinner" : ""} />
          Generate Report
        </button>

        {data && !loading && (
          <button className="btn btn-secondary" onClick={exportExcel} disabled={exporting} style={{ height: "38px" }}>
            <Download size={14} />
            {exporting ? "Exporting..." : "Download Excel"}
          </button>
        )}
      </div>

      {error && (
        <div style={{ padding: "12px 18px", background: "var(--danger-light)", border: "1px solid var(--danger)", color: "var(--danger)", borderRadius: "var(--radius-md)", display: "flex", gap: "8px", alignItems: "center" }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div style={{ padding: "50px", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "12px" }}><div className="spinner" /></div>
          <span style={{ color: "var(--text-secondary)" }}>Compiling finance ledgers...</span>
        </div>
      )}

      {data && !loading && (
        <>
          {/* KPI grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
            <KpiCard icon={<IndianRupee size={16}/>} label="Total Collected" val={fmt(data.summary.totalCollected)} color="var(--success)" bg="var(--success-light)" border="var(--success)" />
            <KpiCard icon={<IndianRupee size={16}/>} label="Outstanding Dues" val={fmt(data.summary.totalOutstanding)} color="var(--danger)" bg="var(--danger-light)" border="var(--danger)" />
            <KpiCard icon={<TrendingUp size={16}/>} label="Collection Rate" val={pct(data.summary.collectionRate)} color="var(--primary)" bg="var(--primary-light)" border="var(--primary)" />
            <KpiCard icon={<Users size={16}/>} label="Total Students" val={String(data.summary.totalStudents)} color="var(--text-primary)" bg="var(--bg-card)" border="var(--border-color)" />
            <KpiCard icon={<Users size={16}/>} label="Dues Cleared" val={String(data.summary.paidStudents)} color="var(--success)" bg="var(--success-light)" border="var(--success)" />
            <KpiCard icon={<Users size={16}/>} label="Pending Dues" val={String(data.summary.pendingStudents)} color="var(--danger)" bg="var(--danger-light)" border="var(--danger)" />
            <KpiCard icon={<BarChart2 size={16}/>} label="Receipts Issued" val={String(data.summary.totalReceipts)} color="var(--warning)" bg="var(--warning-light)" border="var(--warning)" />
            <KpiCard icon={<IndianRupee size={16}/>} label="Expected Bill" val={fmt(data.summary.totalFeeAmount)} color="var(--text-primary)" bg="var(--bg-card)" border="var(--border-color)" />
          </div>

          {/* Tables layout */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginTop: "10px" }}>
            
            {/* Revenue by Class */}
            <ReportTable
              title="Revenue by Class Level"
              headers={["Class Level", "Revenue Collected", "Percent Share"]}
              rows={data.byClass.map(c => [
                c.class_name,
                fmt(c.revenue),
                data.summary.totalCollected > 0 ? pct((c.revenue / data.summary.totalCollected) * 100) : "—"
              ])}
            />

            {/* Revenue by Section */}
            <ReportTable
              title="Revenue by Section Stream"
              headers={["Section Stream", "Revenue Collected", "Percent Share"]}
              rows={data.bySection.map(s => [
                s.section_name,
                fmt(s.revenue),
                data.summary.totalCollected > 0 ? pct((s.revenue / data.summary.totalCollected) * 100) : "—"
              ])}
            />

            {/* Mode Breakdown */}
            <ReportTable
              title="Collections by Payment Mode"
              headers={["Mode", "Amount", "Receipts", "Percent Share"]}
              rows={data.byPaymentMode.map(p => [
                p.mode,
                fmt(p.amount),
                String(p.count),
                data.summary.totalCollected > 0 ? pct((p.amount / data.summary.totalCollected) * 100) : "—"
              ])}
            />

            {/* Monthly collection */}
            <ReportTable
              title="Monthly collection summaries"
              headers={["Billing Month", "Amount Collected", "Receipts Issued"]}
              rows={data.monthly.map(m => [
                m.month,
                fmt(m.collected),
                String(m.receipts)
              ])}
            />

          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({ icon, label, val, color, bg, border }) {
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: "var(--radius-md)", padding: "14px 18px", display: "flex", flexDirection: "column", gap: "6px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", color, fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>
        {icon}
        <span>{label}</span>
      </div>
      <div style={{ fontSize: "20px", fontWeight: 800, color }}>{val}</div>
    </div>
  );
}

function ReportTable({ title, headers, rows }) {
  return (
    <div className="table-card">
      <div style={{ padding: "16px 20px", background: "rgba(99, 102, 241, 0.08)", borderBottom: "1px solid var(--border-color)", fontWeight: 700, fontSize: "14px", color: "var(--text-primary)" }}>
        {title}
      </div>
      <div className="custom-table-wrapper">
        <table className="custom-table" style={{ fontSize: "13px" }}>
          <thead>
            <tr style={{ background: "var(--bg-main)" }}>
              {headers.map(h => <th key={h}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={headers.length} style={{ textAlign: "center", padding: "20px", color: "var(--text-secondary)" }}>No data available.</td></tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={idx}>
                  {row.map((cell, cIdx) => <td key={cIdx}>{cell}</td>)}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
