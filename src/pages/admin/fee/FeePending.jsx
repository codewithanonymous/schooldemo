import React, { useState, useEffect, useRef, useCallback } from "react";
import { feeCollectionService } from "../../../services/fee/feeCollectionService";
import { feeReceiptService } from "../../../services/fee/feeReceiptService";
import { Search, Info, CheckCircle2, RefreshCw, AlertCircle, Clock, IndianRupee } from "lucide-react";

export default function FeePending() {
  const [allStudents, setAllStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState("Unpaid,Partially Paid"); // show outstanding by default
  const [classFilter, setClassFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Selection
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(false);

  const searchRef = useRef(null);

  // Close suggestions on outside click
  useEffect(() => {
    const fn = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const data = await feeCollectionService.getStudents();
      setAllStudents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchTransactions = useCallback(async (student) => {
    setTxLoading(true);
    setTransactions([]);
    try {
      // Fetch receipts list
      const receiptsList = await feeReceiptService.getReceipts();
      // Filter for this student
      const studentReceipts = receiptsList.filter(r => r.students?.admission_number === student.admission_number || r.students?.roll_number === student.roll_number);
      
      // Fetch details for each receipt to compile full transaction lines list
      const fullHistory = [];
      for (const rec of studentReceipts) {
        const lines = await feeReceiptService.getReceiptDetails(rec.id);
        lines.forEach(line => {
          fullHistory.push({
            id: line.id,
            amount: line.amount,
            transaction_date: rec.receipt_date,
            fee_types: line.fee_types,
            receipts: {
              receipt_number: rec.receipt_number,
              payment_mode: rec.payment_mode,
              users: rec.users
            }
          });
        });
      }
      setTransactions(fullHistory);
    } catch (err) {
      console.error("Error loading student transactions:", err);
    } finally {
      setTxLoading(false);
    }
  }, []);

  const handleSelectStudent = (s) => {
    setSelectedStudent(s);
    fetchTransactions(s);
    setShowSuggestions(false);
    setSearchQuery(s.student_name);
  };

  const handleRefresh = () => loadStudents(true);

  // Filters logic
  const filteredStudents = allStudents.filter(s => {
    // Status Filter
    if (filterStatus) {
      const allowed = filterStatus.split(",").map(x => x.trim());
      if (!allowed.includes(s.fee_status)) return false;
    }

    if (classFilter && s.class_name !== classFilter) return false;
    if (sectionFilter && s.section_name !== sectionFilter) return false;

    const q = searchQuery.toLowerCase().trim();
    if (q && !s.student_name.toLowerCase().includes(q) && !s.admission_number.toLowerCase().includes(q)) {
      return false;
    }

    return true;
  });

  const fmt = (n) => `₹${Number(n ?? 0).toLocaleString("en-IN")}`;

  const statusColor = (status) => {
    if (status === "Paid") return { bg: "rgba(16, 185, 129, 0.1)", border: "var(--success)", text: "var(--success)" };
    if (status === "Partially Paid") return { bg: "rgba(245, 158, 11, 0.1)", border: "var(--warning)", text: "var(--warning)" };
    if (status === "Unpaid") return { bg: "rgba(239, 68, 68, 0.1)", border: "var(--danger)", text: "var(--danger)" };
    return { bg: "rgba(156, 163, 175, 0.1)", border: "var(--text-secondary)", text: "var(--text-secondary)" }; // Not Assigned
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", width: "100%" }}>
      
      {/* Title & Refresh */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: 700, margin: 0 }}>Outstanding Student Balances</h2>
          <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: "13px" }}>
            Live fee records audits. Updated automatically.
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw size={14} className={refreshing ? "spinner" : ""} />
          {refreshing ? "Refreshing..." : "Refresh Status"}
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", background: "var(--bg-card)", border: "1px solid var(--border-color)", padding: "16px", borderRadius: "var(--radius-lg)" }}>
        <div className="filter-group" style={{ minWidth: "160px" }}>
          <label className="filter-label">Fee Status</label>
          <select
            className="form-select"
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setSelectedStudent(null); }}
          >
            <option value="">All Statuses</option>
            <option value="Unpaid,Partially Paid">Outstanding Dues (Unpaid/Partially Paid)</option>
            <option value="Unpaid">Unpaid Only</option>
            <option value="Partially Paid">Partially Paid Only</option>
            <option value="Paid">Dues Cleared (Paid)</option>
            <option value="Not Assigned">Not Assigned</option>
          </select>
        </div>

        <div className="filter-group" style={{ minWidth: "160px" }}>
          <label className="filter-label">Class Level</label>
          <select
            className="form-select"
            value={classFilter}
            onChange={(e) => { setClassFilter(e.target.value); setSelectedStudent(null); }}
          >
            <option value="">All Classes</option>
            {Array.from({ length: 10 }, (_, i) => (
              <option key={i+1} value={`Class ${i+1}`}>{`Class ${i+1}`}</option>
            ))}
          </select>
        </div>

        <div className="filter-group" style={{ minWidth: "120px" }}>
          <label className="filter-label">Section</label>
          <select
            className="form-select"
            value={sectionFilter}
            onChange={(e) => { setSectionFilter(e.target.value); setSelectedStudent(null); }}
          >
            <option value="">All Sections</option>
            <option value="A">Section A</option>
            <option value="B">Section B</option>
            <option value="C">Section C</option>
          </select>
        </div>
      </div>

      {/* Search box suggestion overlay */}
      <div ref={searchRef} style={{ position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: "4px 12px", gap: "8px" }}>
          <Search size={16} color="var(--text-secondary)" />
          <input
            type="text"
            className="search-field"
            placeholder="Type student name or admission number to verify details..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); if(!e.target.value) setSelectedStudent(null); }}
            onFocus={() => setShowSuggestions(true)}
            style={{ background: "transparent", border: "none", outline: "none", color: "var(--text-primary)", fontSize: "14px", width: "100%" }}
          />
          {searchQuery && (
            <X size={14} color="var(--text-secondary)" onClick={() => { setSearchQuery(""); setSelectedStudent(null); setShowSuggestions(false); }} style={{ cursor: "pointer" }} />
          )}
        </div>

        {showSuggestions && searchQuery.trim() && (
          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-premium)", zIndex: 100, maxHeight: 200, overflowY: "auto", marginTop: "4px" }}>
            {filteredStudents.length === 0 ? (
              <div style={{ padding: "12px", color: "var(--text-muted)", fontSize: "13px" }}>No students match query.</div>
            ) : (
              filteredStudents.slice(0, 8).map(s => (
                <div
                  key={s.id}
                  onClick={() => handleSelectStudent(s)}
                  style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--primary-light)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                >
                  <div>
                    <span style={{ fontWeight: 600, fontSize: "13px", color: "var(--text-primary)" }}>{s.student_name}</span>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)", marginLeft: "8px" }}>({s.admission_number})</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "12px", color: "var(--danger)", fontWeight: 700 }}>{fmt(s.due_amount)} outstanding</span>
                    <span className="badge badge-primary">{s.class_name}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Summary KPI Strips */}
      {!loading && allStudents.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px" }}>
          {[
            { label: "Total Tracked", val: allStudents.length, color: "var(--primary)", bg: "var(--primary-light)", border: "var(--primary)" },
            { label: "Unpaid", val: allStudents.filter(s => s.fee_status === "Unpaid").length, color: "var(--danger)", bg: "var(--danger-light)", border: "var(--danger)" },
            { label: "Partially Paid", val: allStudents.filter(s => s.fee_status === "Partially Paid").length, color: "var(--warning)", bg: "var(--warning-light)", border: "var(--warning)" },
            { label: "Paid", val: allStudents.filter(s => s.fee_status === "Paid").length, color: "var(--success)", bg: "var(--success-light)", border: "var(--success)" },
            { label: "Not Assigned", val: allStudents.filter(s => s.fee_status === "Not Assigned").length, color: "var(--text-secondary)", bg: "var(--bg-main)", border: "var(--border-color)" }
          ].map(kpi => (
            <div key={kpi.label} style={{ padding: "12px 16px", background: kpi.bg, border: `1px solid ${kpi.border}`, borderRadius: "var(--radius-md)" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: kpi.color, textTransform: "uppercase" }}>{kpi.label}</div>
              <div style={{ fontSize: "20px", fontWeight: 800, color: kpi.color, marginTop: "4px" }}>{kpi.val}</div>
            </div>
          ))}
        </div>
      )}

      {/* Main Grid View */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}><div className="spinner" /></div>
      ) : allStudents.length === 0 ? (
        <div className="empty-state-card">
          <CheckCircle2 size={36} color="var(--success)" />
          <span>No students found in the local workspace.</span>
        </div>
      ) : (
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: selectedStudent ? "340px 1fr" : "1fr", 
          gap: "20px",
          transition: "all 0.3s ease",
          alignItems: "start"
        }}>
          {/* Left: Outstanding list */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "600px", overflowY: "auto", paddingRight: "4px" }}>
            {filteredStudents.length === 0 ? (
              <div className="empty-state-card" style={{ padding: "30px 16px" }}>
                <AlertCircle size={28} color="var(--text-muted)" style={{ opacity: 0.5 }} />
                <span>No matching outstanding accounts found.</span>
              </div>
            ) : (
              filteredStudents.map(s => {
                const sc = statusColor(s.fee_status);
                const isActive = selectedStudent?.id === s.id;
                return (
                  <div
                    key={s.id}
                    className={`student-due-card ${isActive ? "active" : ""}`}
                    onClick={() => handleSelectStudent(s)}
                    style={{ 
                      cursor: "pointer",
                      background: isActive ? "rgba(99, 102, 241, 0.08)" : "var(--bg-card)",
                      border: `1px solid ${isActive ? "var(--primary)" : "var(--border-color)"}`,
                      borderRadius: "var(--radius-md)",
                      padding: "16px"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>{s.student_name}</h4>
                        <span style={{ fontSize: "11px", color: "var(--text-secondary)", fontFamily: "monospace" }}>{s.admission_number}</span>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                          {s.class_name} - {s.section_name}
                        </div>
                      </div>
                      <span className="badge" style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>{s.fee_status}</span>
                    </div>

                    <div style={{ marginTop: "12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 8px", fontSize: "12px" }}>
                      <div style={{ color: "var(--text-secondary)" }}>Total: <strong>{fmt(s.total_fee_amount)}</strong></div>
                      <div style={{ color: "var(--text-secondary)" }}>Paid: <strong style={{ color: "var(--success)" }}>{fmt(s.amount_paid)}</strong></div>
                      <div style={{ color: "var(--text-secondary)", gridColumn: "1 / -1" }}>Remaining Due: <strong style={{ color: "var(--danger)" }}>{fmt(s.due_amount)}</strong></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right: Selected Detail Summary */}
          {selectedStudent && (
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-lg)", padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>{selectedStudent.student_name}</h3>
                  <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: "13px" }}>
                    Admission: {selectedStudent.admission_number} (Roll: {selectedStudent.roll_number}) • {selectedStudent.class_name} - {selectedStudent.section_name}
                  </p>
                </div>
                <span className="badge" style={{ ...statusColor(selectedStudent.fee_status), padding: "4px 12px" }}>
                  {selectedStudent.fee_status}
                </span>
              </div>

              {/* Three Column Summary Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                <div style={{ padding: "12px 14px", background: "var(--bg-main)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", textAlign: "center" }}>
                  <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Total Bill</div>
                  <div style={{ fontSize: "16px", fontWeight: 800, marginTop: "4px" }}>{fmt(selectedStudent.total_fee_amount)}</div>
                </div>
                <div style={{ padding: "12px 14px", background: "var(--success-light)", border: "1px solid var(--success)", borderRadius: "var(--radius-md)", textAlign: "center" }}>
                  <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--success)", textTransform: "uppercase" }}>Amount Paid</div>
                  <div style={{ fontSize: "16px", fontWeight: 800, color: "var(--success)", marginTop: "4px" }}>{fmt(selectedStudent.amount_paid)}</div>
                </div>
                <div style={{ padding: "12px 14px", background: "var(--danger-light)", border: "1px solid var(--danger)", borderRadius: "var(--radius-md)", textAlign: "center" }}>
                  <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--danger)", textTransform: "uppercase" }}>Remaining Due</div>
                  <div style={{ fontSize: "16px", fontWeight: 800, color: "var(--danger)", marginTop: "4px" }}>{fmt(selectedStudent.due_amount)}</div>
                </div>
              </div>

              {/* Payment history */}
              <h4 style={{ margin: "10px 0 0", fontSize: "14px", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                <Clock size={16} /> Chronological Payment Records
              </h4>

              {txLoading ? (
                <div style={{ textAlign: "center", padding: "20px" }}><div className="spinner-sm" /></div>
              ) : transactions.length === 0 ? (
                <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                  No payment ledger transactions found for this student.
                </div>
              ) : (
                <div className="due-table-wrapper">
                  <table className="due-details-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                    <thead>
                      <tr style={{ background: "var(--bg-main)" }}>
                        <th>Date</th>
                        <th>Receipt No</th>
                        <th>Ledger Account</th>
                        <th>Method</th>
                        <th style={{ textAlign: "right" }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx, idx) => (
                        <tr key={idx}>
                          <td style={{ color: "var(--text-secondary)" }}>
                            {new Date(tx.transaction_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                          </td>
                          <td style={{ fontWeight: 700, color: "var(--primary)" }}>{tx.receipts?.receipt_number}</td>
                          <td>{tx.fee_types?.fee_name}</td>
                          <td>
                            <span className="badge" style={{ background: "var(--bg-main)", color: "var(--text-primary)", padding: "2px 6px" }}>
                              {tx.receipts?.payment_mode}
                            </span>
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 700, color: "var(--success)" }}>{fmt(tx.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: "rgba(16, 185, 129, 0.08)", fontWeight: 700 }}>
                        <td colSpan={4} style={{ padding: "10px", color: "var(--success)" }}>Total Credited</td>
                        <td style={{ textAlign: "right", padding: "10px", color: "var(--success)", fontSize: "14px" }}>
                          {fmt(transactions.reduce((sum, t) => sum + t.amount, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
