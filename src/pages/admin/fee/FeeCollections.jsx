import React, { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { feeCollectionService } from "../../../services/fee/feeCollectionService";
import { Search, Plus, Trash2, X, Users, IndianRupee, Calculator, CheckCircle } from "lucide-react";

export default function FeeCollections() {
  const location = useLocation();

  // Remote lists
  const [allStudents, setAllStudents] = useState([]);
  const [feeTypes, setFeeTypes] = useState([]);
  const [collectors, setCollectors] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(true);

  // Search UI
  const [rollQuery, setRollQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef(null);

  // Form inputs
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [inputTotalFees, setInputTotalFees] = useState("");
  const [inputAlreadyPaid, setInputAlreadyPaid] = useState("");
  const [amountPayingNow, setAmountPayingNow] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [selectedFees, setSelectedFees] = useState([]);
  const [transactionRef, setTransactionRef] = useState("");
  const [collectedBy, setCollectedBy] = useState("2"); // Default to Principal Office
  const [remarks, setRemarks] = useState("");

  // New workflow fields
  const [collectionDate, setCollectionDate] = useState(new Date().toISOString().split("T")[0]);
  const [upiProofFile, setUpiProofFile] = useState(null);
  const [generateReceipt, setGenerateReceipt] = useState(true);

  // Status/Alerts
  const [touchedPayNow, setTouchedPayNow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null);

  useEffect(() => {
    async function loadInitialData() {
      setStudentsLoading(true);
      try {
        const [studentsList, typesList, collectorsList] = await Promise.all([
          feeCollectionService.getStudents(),
          feeCollectionService.getFeeTypes(),
          feeCollectionService.getCollectors()
        ]);
        setAllStudents(studentsList);
        setFeeTypes(typesList);
        setCollectors(collectorsList);
      } catch (err) {
        console.error(err);
        setAlertMessage({ type: "error", text: "Failed to load initial workspace data." });
      } finally {
        setStudentsLoading(false);
      }
    }
    loadInitialData();
  }, []);

  useEffect(() => {
    if (location.state?.studentId && allStudents.length > 0) {
      const student = allStudents.find(s => s.id === Number(location.state.studentId));
      if (student) {
        handleSelectStudent(student);
      }
    }
  }, [location.state, allStudents]);

  // Close dropdown on outside click
  useEffect(() => {
    const fn = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  // Filtered student list (memoized)
  const filteredStudents = useMemo(() => {
    const q = rollQuery.trim().toLowerCase();
    if (!q) return allStudents;
    return allStudents.filter(s => 
      s.roll_number.toLowerCase().includes(q) || 
      s.admission_number.toLowerCase().includes(q) || 
      s.student_name.toLowerCase().includes(q)
    );
  }, [rollQuery, allStudents]);

  // Derived values
  const totalFees = typeof inputTotalFees === "number" ? inputTotalFees : 0;
  const alreadyPaid = typeof inputAlreadyPaid === "number" ? inputAlreadyPaid : 0;
  const currentDue = Math.max(0, totalFees - alreadyPaid);

  const payNow = typeof amountPayingNow === "number" ? amountPayingNow : 0;
  const newTotalPaid = alreadyPaid + payNow;
  const newRemainingDue = Math.max(0, totalFees - newTotalPaid);
  const statusAfter = newRemainingDue <= 0 ? "Paid" : newTotalPaid > 0 ? "Partially Paid" : "Unpaid";

  const hasFeeInfo = totalFees > 0;
  const payNowTouched = touchedPayNow && typeof amountPayingNow === "number";
  const payNowExceeds = payNowTouched && payNow > currentDue;

  const breakdownTotal = selectedFees.reduce((sum, f) => sum + f.amount, 0);
  const breakdownMismatch = payNow > 0 && selectedFees.length > 0 && Math.abs(breakdownTotal - payNow) > 0.01;

  const canSubmit = !loading && hasFeeInfo && payNow > 0 && !payNowExceeds && !breakdownMismatch && selectedFees.length > 0;

  // Search selections
  const handleSelectStudent = (s) => {
    setSelectedStudent(s);
    setRollQuery(s.admission_number);
    setShowDropdown(false);
    setAlertMessage(null);
    setInputTotalFees(s.total_fee_amount);
    setInputAlreadyPaid(s.amount_paid);
    setAmountPayingNow("");
    setSelectedFees([]);
    setTouchedPayNow(false);
  };

  const handleClearSearch = () => {
    setRollQuery("");
    setSelectedStudent(null);
    setShowDropdown(false);
    setAlertMessage(null);
    setInputTotalFees("");
    setInputAlreadyPaid("");
    setAmountPayingNow("");
    setSelectedFees([]);
    setTouchedPayNow(false);
  };

  // Fee breakdown actions
  const addFeeItem = () => {
    if (feeTypes.length === 0) return;
    const defaultAmount = selectedFees.length === 0 && payNow > 0 ? payNow : 0;
    setSelectedFees(prev => [
      ...prev,
      { fee_type_id: feeTypes[0].id, fee_name: feeTypes[0].fee_name, amount: defaultAmount }
    ]);
  };

  const removeFeeItem = (idx) => {
    setSelectedFees(prev => prev.filter((_, i) => i !== idx));
  };

  const updateFeeItem = (idx, field, value) => {
    setSelectedFees(prev => {
      const updated = [...prev];
      if (field === "fee_type_id") {
        const ft = feeTypes.find(f => f.id === value);
        updated[idx] = { ...updated[idx], fee_type_id: value, fee_name: ft ? ft.fee_name : "" };
      } else {
        updated[idx] = { ...updated[idx], amount: value };
      }
      return updated;
    });
  };

  const resetForm = () => {
    handleClearSearch();
    setPaymentMode("Cash");
    setTransactionRef("");
    setCollectedBy("2"); // Default to Principal Office
    setRemarks("");
    setCollectionDate(new Date().toISOString().split("T")[0]);
    setUpiProofFile(null);
    setGenerateReceipt(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouchedPayNow(true);

    if (!selectedStudent) {
      setAlertMessage({ type: "error", text: "Please select a student." });
      return;
    }
    if (payNow <= 0) {
      setAlertMessage({ type: "error", text: "Please enter a valid amount to pay." });
      return;
    }
    if (payNow > currentDue) {
      setAlertMessage({ type: "error", text: `Payment amount exceeds outstanding dues (${fmt(currentDue)})` });
      return;
    }
    if (selectedFees.length === 0) {
      setAlertMessage({ type: "error", text: "Please allocate fee breakdown rows." });
      return;
    }
    if (Math.abs(breakdownTotal - payNow) > 0.01) {
      setAlertMessage({ type: "error", text: "Breakdown total does not equal paying amount." });
      return;
    }
    if (!collectedBy) {
      setAlertMessage({ type: "error", text: "Please select who collected the cash/transfer." });
      return;
    }
    if (paymentMode === "UPI" && !upiProofFile) {
      setAlertMessage({ type: "error", text: "Please upload UPI proof screenshot." });
      return;
    }

    setLoading(true);
    setAlertMessage(null);

    try {
      const res = await feeCollectionService.recordPayment({
        student_id: selectedStudent.id,
        total_amount: payNow,
        payment_mode: paymentMode,
        transaction_reference: transactionRef,
        remarks: remarks,
        collected_by: collectedBy,
        breakdown: selectedFees,
        collection_date: collectionDate,
        generate_receipt: generateReceipt,
        upi_proof_file: upiProofFile ? upiProofFile.name : null
      });

      if (res.success) {
        setAlertMessage({ 
          type: "success", 
          text: `✅ Payment recorded!${generateReceipt ? ` Receipt Issued: ${res.receipt_number}` : ""}` 
        });
        // Update local students list in cache
        setAllStudents(prev => prev.map(s => s.id === selectedStudent.id ? res.student : s));
        setTimeout(resetForm, 2500);
      }
    } catch (err) {
      console.error(err);
      setAlertMessage({ type: "error", text: "Error recording transaction. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n) => `₹${n.toLocaleString("en-IN")}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", width: "100%" }}>
      {/* Alert Banner */}
      {alertMessage && (
        <div style={{
          padding: "14px 18px",
          background: alertMessage.type === "success" ? "var(--success-light)" : "var(--danger-light)",
          color: alertMessage.type === "success" ? "var(--success)" : "var(--danger)",
          border: `1px solid ${alertMessage.type === "success" ? "var(--success)" : "var(--danger)"}`,
          borderRadius: "var(--radius-md)",
          fontSize: "14px",
          fontWeight: 600
        }}>
          {alertMessage.text}
        </div>
      )}

      {/* STEP 1: Search student */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", padding: "24px", borderRadius: "var(--radius-lg)", display: "flex", flexDirection: "column", gap: "16px" }}>
        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--primary)" }}>Step 1: Search Student Record</h3>
        <p style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary)" }}>
          Type Admission Number, Roll Number, or Name to retrieve billing metrics.
        </p>

        <div ref={searchRef} style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", border: "2px solid var(--primary)", borderRadius: "var(--radius-md)", background: "var(--bg-main)", overflow: "hidden", padding: "4px 12px" }}>
            <Search size={18} color="var(--primary)" style={{ flexShrink: 0 }} />
            <input
              type="text"
              placeholder={studentsLoading ? "Loading student directories..." : "Type e.g. ADM2026001..."}
              value={rollQuery}
              onChange={(e) => { setRollQuery(e.target.value); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              disabled={studentsLoading}
              autoComplete="off"
              style={{ flex: 1, padding: "8px 10px", background: "transparent", border: "none", outline: "none", fontSize: "15px", color: "var(--text-primary)" }}
            />
            {rollQuery && (
              <button onClick={handleClearSearch} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center" }}>
                <X size={18} />
              </button>
            )}
          </div>

          {showDropdown && rollQuery && (
            <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-premium)", zIndex: 100, maxHeight: 220, overflowY: "auto" }}>
              {filteredStudents.length === 0 ? (
                <div style={{ padding: "16px", textAlign: "center", color: "var(--text-secondary)", fontSize: "13px" }}>
                  No students found matching query.
                </div>
              ) : (
                filteredStudents.slice(0, 8).map(s => (
                  <div
                    key={s.id}
                    onClick={() => handleSelectStudent(s)}
                    style={{ padding: "12px 16px", cursor: "pointer", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--primary-light)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--text-primary)" }}>{s.student_name}</div>
                      <div style={{ fontSize: "12px", color: "var(--text-secondary)", fontFamily: "monospace" }}>{s.admission_number} ({s.roll_number})</div>
                    </div>
                    <span className="badge badge-primary">{s.class_name}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Selected Student summary banner */}
        {selectedStudent && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--primary-light)", border: "1px solid var(--primary)", padding: "16px", borderRadius: "var(--radius-md)", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--primary)" }}>✓ Active Student Profile Selected</span>
              <div style={{ display: "flex", gap: "16px", fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                <span>Name: {selectedStudent.student_name}</span>
                <span>•</span>
                <span>Class: {selectedStudent.class_name} - {selectedStudent.section_name}</span>
                <span>•</span>
                <span>Guardian: {selectedStudent.parent_name}</span>
              </div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={resetForm}>Clear</button>
          </div>
        )}
      </div>

      {/* Step 2-4 Form Panels (Only visible when student selected) */}
      {selectedStudent && (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* STEP 2: Payment Details */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", padding: "24px", borderRadius: "var(--radius-lg)", display: "flex", flexDirection: "column", gap: "16px" }}>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--primary)" }}>Step 2: Collect Expected Dues</h3>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div className="form-group">
                <label className="form-label">Total Expected Fees *</label>
                <input
                  type="number"
                  value={inputTotalFees}
                  onChange={(e) => {
                    setInputTotalFees(e.target.value === "" ? "" : Number(e.target.value));
                    setAmountPayingNow("");
                  }}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Amount Already Paid</label>
                <input
                  type="number"
                  value={inputAlreadyPaid}
                  onChange={(e) => {
                    setInputAlreadyPaid(e.target.value === "" ? "" : Number(e.target.value));
                    setAmountPayingNow("");
                  }}
                  className="form-input"
                  disabled
                />
              </div>
            </div>

            {hasFeeInfo && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", background: "var(--bg-main)", padding: "16px", borderRadius: "var(--radius-md)" }}>
                <div>
                  <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>BILL AMOUNT</div>
                  <div style={{ fontSize: "18px", fontWeight: 700 }}>{fmt(totalFees)}</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>PREVIOUSLY PAID</div>
                  <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--success)" }}>{fmt(alreadyPaid)}</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>CURRENT OUTSTANDING</div>
                  <div style={{ fontSize: "18px", fontWeight: 700, color: currentDue > 0 ? "var(--danger)" : "var(--success)" }}>{fmt(currentDue)}</div>
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div className="form-group">
                <label className="form-label">Amount Paying Now *</label>
                <input
                  type="number"
                  placeholder={`Max ${currentDue}`}
                  value={amountPayingNow}
                  onChange={(e) => {
                    setAmountPayingNow(e.target.value === "" ? "" : Number(e.target.value));
                    setTouchedPayNow(true);
                  }}
                  className="form-input"
                  style={{ borderColor: payNowExceeds ? "var(--danger)" : "" }}
                  disabled={!hasFeeInfo}
                  required
                />
                {payNowExceeds && <span className="form-error">Amount cannot exceed current outstanding due ({fmt(currentDue)})</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Payment Method *</label>
                <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="form-select">
                  <option value="Cash">💵 Cash Payment</option>
                  <option value="UPI">📱 UPI / QR Code</option>
                  <option value="Bank Transfer">🏦 Bank Transfer</option>
                  <option value="Card">💳 Card Swipe</option>
                  <option value="Cheque">📄 Cheque Deposit</option>
                </select>
              </div>
            </div>

            {/* Live payment summary */}
            {hasFeeInfo && payNow > 0 && !payNowExceeds && (
              <div style={{ background: "rgba(16, 185, 129, 0.08)", border: "1px solid var(--success)", padding: "16px", borderRadius: "var(--radius-md)", fontSize: "13px" }}>
                <div style={{ fontWeight: 700, color: "var(--success)", marginBottom: "10px" }}>Transaction Outcome Preview</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                  <span>Total paid after: <strong>{fmt(newTotalPaid)}</strong></span>
                  <span>Due balance remaining: <strong style={{ color: newRemainingDue > 0 ? "var(--danger)" : "var(--success)" }}>{fmt(newRemainingDue)}</strong></span>
                  <span>Status: <span className={`badge ${newRemainingDue <= 0 ? "badge-success" : "badge-warning"}`}>{statusAfter}</span></span>
                </div>
              </div>
            )}
          </div>

          {/* STEP 3: Fee Breakdown */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", padding: "24px", borderRadius: "var(--radius-lg)", display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--primary)" }}>Step 3: Fee Categories Allocation</h3>
                <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--text-secondary)" }}>Allocate the paying amount to fee ledger accounts.</p>
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={addFeeItem}>
                + Add Allocation Row
              </button>
            </div>

            {selectedFees.length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px", color: "var(--text-secondary)", fontSize: "13px", border: "1px dashed var(--border-color)", borderRadius: "var(--radius-md)" }}>
                Click "Add Allocation Row" to map payment ledger accounts.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {selectedFees.map((item, idx) => (
                  <div key={idx} style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <select
                      value={item.fee_type_id}
                      onChange={(e) => updateFeeItem(idx, "fee_type_id", Number(e.target.value))}
                      className="form-select"
                      style={{ flex: 2 }}
                    >
                      {feeTypes.map(f => (
                        <option key={f.id} value={f.id}>{f.fee_name}</option>
                      ))}
                    </select>
                    
                    <input
                      type="number"
                      placeholder="Amount"
                      value={item.amount || ""}
                      onChange={(e) => updateFeeItem(idx, "amount", Number(e.target.value))}
                      className="form-input"
                      style={{ flex: 1 }}
                      required
                    />

                    <button type="button" className="btn-icon btn-icon-danger" onClick={() => removeFeeItem(idx)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}

                {/* Sub-summary */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-main)", padding: "12px 16px", borderRadius: "var(--radius-md)", marginTop: "8px" }}>
                  <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Breakdown Allocation Total:</span>
                  <strong style={{ fontSize: "16px", color: breakdownMismatch ? "var(--danger)" : "var(--success)" }}>{fmt(breakdownTotal)}</strong>
                </div>

                {breakdownMismatch && (
                  <div style={{ fontSize: "12px", color: "var(--danger)", fontWeight: 600 }}>
                    ⚠ Allocation total must equal "Amount Paying Now" ({fmt(payNow)}).
                  </div>
                )}
              </div>
            )}
          </div>

          {/* STEP 4: Collection Details */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", padding: "24px", borderRadius: "var(--radius-lg)", display: "flex", flexDirection: "column", gap: "16px" }}>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--primary)" }}>Step 4: Collection Details</h3>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div className="form-group">
                <label className="form-label">Collection Date *</label>
                <input
                  type="date"
                  value={collectionDate}
                  onChange={(e) => setCollectionDate(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Transaction Reference {paymentMode !== "Cash" && "*"}</label>
                <input
                  type="text"
                  placeholder="e.g. UPI ID / Chq No / Bank Txn ID"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  className="form-input"
                  required={paymentMode !== "Cash"}
                />
              </div>

              {paymentMode === "UPI" && (
                <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                  <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    UPI Proof Upload (Screenshot) *
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setUpiProofFile(e.target.files[0])}
                    className="form-input"
                    required
                  />
                  {upiProofFile && (
                    <span style={{ fontSize: "12px", color: "var(--success)", display: "block", marginTop: "4px" }}>
                      ✓ Selected: {upiProofFile.name}
                    </span>
                  )}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Collected By Officer *</label>
                <select value={collectedBy} onChange={(e) => setCollectedBy(e.target.value)} className="form-select" required>
                  <option value="">— Select Staff Officer —</option>
                  {collectors.map(c => (
                    <option key={c.id} value={c.id}>{c.full_name} ({c.role})</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "24px" }}>
                <input
                  type="checkbox"
                  id="chkGenerateReceipt"
                  checked={generateReceipt}
                  onChange={(e) => setGenerateReceipt(e.target.checked)}
                  style={{ width: "18px", height: "18px", accentColor: "var(--primary)" }}
                />
                <label htmlFor="chkGenerateReceipt" style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", cursor: "pointer" }}>
                  Generate Receipt
                </label>
              </div>

              <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                <label className="form-label">Remarks / Notes</label>
                <textarea
                  placeholder="Log additional payment particulars..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="form-input"
                  style={{ minHeight: "60px", resize: "vertical" }}
                />
              </div>
            </div>
          </div>

          {/* Submission row */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancel Reset</button>
            <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
              {loading ? "Recording Transaction..." : "✓ Record Fee Payment & Issue Receipt"}
            </button>
          </div>

        </form>
      )}
    </div>
  );
}
