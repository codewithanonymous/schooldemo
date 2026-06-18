import React, { useState, useEffect } from "react";
import { feeTransactionService } from "../../../services/fee/feeTransactionService";
import { Search, RefreshCw, AlertCircle, Calendar } from "lucide-react";

export default function FeeTransactions() {
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [allTransactions, setAllTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const txs = await feeTransactionService.getTransactions();
      setAllTransactions(txs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Group transactions by receipt number
  const receiptGroups = (() => {
    const map = new Map();

    allTransactions.forEach((tx) => {
      const rn = tx.receipts?.receipt_number ?? "UNKNOWN";
      if (!map.has(rn)) {
        map.set(rn, {
          receipt_number: rn,
          payment_mode: tx.receipts?.payment_mode ?? "—",
          receipt_total: Number(tx.receipts?.total_amount ?? 0),
          breakdown_total: 0,
          transaction_date: tx.transaction_date,
          student_name: tx.students?.student_name ?? "—",
          admission_number: tx.students?.admission_number ?? "—",
          class_name: tx.students?.class_name ?? "—",
          section_name: tx.students?.section_name ?? "—",
          collected_by_name: tx.receipts?.users?.full_name ?? "—",
          fee_types: [],
          tx_ids: []
        });
      }
      const g = map.get(rn);
      g.breakdown_total += Number(tx.amount);
      if (tx.fee_types?.fee_name && !g.fee_types.includes(tx.fee_types.fee_name)) {
        g.fee_types.push(tx.fee_types.fee_name);
      }
      g.tx_ids.push(tx.id);
    });

    return [...map.values()];
  })();

  // Filter receipt groups
  const filtered = receiptGroups.filter((g) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      g.receipt_number.toLowerCase().includes(q) ||
      g.student_name.toLowerCase().includes(q) ||
      g.admission_number.toLowerCase().includes(q) ||
      g.fee_types.join(" ").toLowerCase().includes(q);

    let matchesDate = true;
    if (g.transaction_date) {
      const d = new Date(g.transaction_date);
      if (startDate) {
        const s = new Date(startDate);
        s.setHours(0, 0, 0, 0);
        if (d < s) matchesDate = false;
      }
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        if (d > e) matchesDate = false;
      }
    } else if (startDate || endDate) {
      matchesDate = false;
    }

    return matchesSearch && matchesDate;
  });

  const grandTotal = filtered.reduce((sum, g) => sum + g.receipt_total, 0);
  const fmt = (n) => `₹${Number(n ?? 0).toLocaleString("en-IN")}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", width: "100%" }}>
      
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: 700, margin: 0 }}>Collections Log & Audit</h2>
          <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: "13px" }}>
            Complete audit trail of all receipts generated, grouped by invoice transactions.
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => loadTransactions(true)} disabled={refreshing}>
          <RefreshCw size={14} className={refreshing ? "spinner" : ""} />
          {refreshing ? "Refreshing..." : "Refresh Logs"}
        </button>
      </div>

      {/* Filter strip */}
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        {/* Search */}
        <div style={{ display: "flex", alignItems: "center", background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: "4px 12px", flex: "1 1 300px", gap: "8px" }}>
          <Search size={16} color="var(--text-secondary)" />
          <input
            type="text"
            placeholder="Search by Receipt No, Student Name, Admission No..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ background: "transparent", border: "none", outline: "none", color: "var(--text-primary)", fontSize: "14px", width: "100%" }}
          />
          {searchQuery && <X size={14} color="var(--text-secondary)" onClick={() => setSearchQuery("")} style={{ cursor: "pointer" }} />}
        </div>

        {/* Dates */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--bg-card)", border: "1px solid var(--border-color)", padding: "4px 12px", borderRadius: "var(--radius-md)", flexWrap: "wrap" }}>
          <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)" }}>From:</label>
          <input 
            type="date" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)}
            style={{ border: "1px solid var(--border-color)", borderRadius: "6px", padding: "4px 8px", fontSize: "13px", background: "var(--bg-main)", color: "var(--text-primary)", outline: "none" }} 
          />
          <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)" }}>To:</label>
          <input 
            type="date" 
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)}
            style={{ border: "1px solid var(--border-color)", borderRadius: "6px", padding: "4px 8px", fontSize: "13px", background: "var(--bg-main)", color: "var(--text-primary)", outline: "none" }} 
          />
          {(startDate || endDate) && (
            <button 
              onClick={() => { setStartDate(""); setEndDate(""); }}
              className="btn btn-danger btn-sm"
              style={{ padding: "4px 10px", fontSize: "12px" }}
            >
              Clear Range
            </button>
          )}
        </div>
      </div>

      {/* KPI strip */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <div style={{ padding: "10px 18px", background: "var(--primary-light)", border: "1px solid var(--primary)", borderRadius: "var(--radius-md)", minWidth: "150px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase" }}>Receipts Count</div>
            <div style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)" }}>{filtered.length}</div>
          </div>
          <div style={{ padding: "10px 18px", background: "var(--success-light)", border: "1px solid var(--success)", borderRadius: "var(--radius-md)", minWidth: "150px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--success)", textTransform: "uppercase" }}>Total Collected</div>
            <div style={{ fontSize: "20px", fontWeight: 800, color: "var(--success)" }}>{fmt(grandTotal)}</div>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="table-card">
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "12px" }}><div className="spinner" /></div>
            <span style={{ color: "var(--text-secondary)" }}>Loading transaction logs...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
            <AlertCircle size={32} color="var(--text-muted)" style={{ opacity: 0.5, marginBottom: "8px" }} />
            <p style={{ margin: 0 }}>No payment logs match current parameters.</p>
          </div>
        ) : (
          <div className="custom-table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Receipt No</th>
                  <th>Student Name</th>
                  <th>Admission No</th>
                  <th>Class / Section</th>
                  <th>Ledger Accounts</th>
                  <th>Payment Mode</th>
                  <th>Collected By</th>
                  <th style={{ textAlign: "right" }}>Amount Paid</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((g) => (
                  <tr key={g.receipt_number}>
                    <td style={{ color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                      {new Date(g.transaction_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td style={{ fontWeight: 700, color: "var(--primary)" }}>{g.receipt_number}</td>
                    <td style={{ fontWeight: 600 }}>{g.student_name}</td>
                    <td style={{ fontFamily: "monospace", fontSize: "13px" }}>{g.admission_number}</td>
                    <td>{g.class_name} - {g.section_name}</td>
                    <td style={{ fontSize: "13px", color: "var(--text-secondary)", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={g.fee_types.join(", ")}>
                      {g.fee_types.join(", ")}
                    </td>
                    <td>
                      <span className="badge badge-primary">{g.payment_mode}</span>
                    </td>
                    <td>{g.collected_by_name}</td>
                    <td style={{ textAlign: "right", fontWeight: 800, color: "var(--success)" }}>{fmt(g.receipt_total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: "rgba(16, 185, 129, 0.08)", fontWeight: 800 }}>
                  <td colSpan={8} style={{ color: "var(--success)" }}>Total Collection Summary</td>
                  <td style={{ textAlign: "right", color: "var(--success)", fontSize: "15px" }}>{fmt(grandTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
