import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { feeCollectionService } from "../../../services/fee/feeCollectionService";
import { feeReceiptService } from "../../../services/fee/feeReceiptService";
import { Plus, Upload, Search, X, AlertCircle, FileSpreadsheet, CheckCircle, Info } from "lucide-react";
import Papa from "papaparse";

export default function FeeStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");

  // Modals
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  
  // Add Student Form State
  const [form, setForm] = useState({
    student_name: "",
    roll_number: "",
    class_name: "Class 1",
    section_name: "A",
    parent_name: "",
    parent_phone: ""
  });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const navigate = useNavigate();

  // Assign Fee Form State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({
    academic_year: "2025-2026",
    class_name: "",
    section_name: "",
    total_fee_amount: ""
  });
  const [assignErrors, setAssignErrors] = useState({});
  const [assigning, setAssigning] = useState(false);

  // CSV Import State
  const fileInputRef = useRef(null);
  const [csvFile, setCsvFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // Selected Student Pane States
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedStudentHistory, setSelectedStudentHistory] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Notification Toast state
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    loadStudents();
  }, []);

  async function loadStudents() {
    setLoading(true);
    try {
      const data = await feeCollectionService.getStudents();
      setStudents(data);
    } catch (err) {
      console.error(err);
      showToast("Failed to load students.", "error");
    } finally {
      setLoading(false);
    }
  }

  const handleSelectStudent = async (student) => {
    setSelectedStudent(student);
    setLoadingDetails(true);
    try {
      // Find receipts for this student
      const allReceipts = await feeReceiptService.getReceipts();
      const studentReceipts = allReceipts.filter(r => r.students?.roll_number === student.roll_number || r.students?.admission_number === student.admission_number);
      setSelectedStudentHistory(studentReceipts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Filter logic
  const filteredStudents = students.filter(s => {
    const q = search.toLowerCase().trim();
    const matchesSearch = !q || 
      s.student_name.toLowerCase().includes(q) ||
      s.admission_number.toLowerCase().includes(q) ||
      s.roll_number.toLowerCase().includes(q) ||
      s.parent_name.toLowerCase().includes(q);

    const matchesClass = !classFilter || s.class_name === classFilter;
    const matchesSection = !sectionFilter || s.section_name === sectionFilter;

    return matchesSearch && matchesClass && matchesSection;
  });

  // Form submit
  const handleAddStudent = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.student_name.trim()) errs.student_name = "Student name is required";
    if (!form.roll_number.trim()) errs.roll_number = "Roll number is required";
    if (!form.parent_name.trim()) errs.parent_name = "Parent name is required";
    if (!form.parent_phone.trim()) errs.parent_phone = "Parent phone is required";

    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      return;
    }

    setSaving(true);
    try {
      const newStudent = await feeCollectionService.addStudent(form);
      setStudents(prev => [newStudent, ...prev]);
      setShowAdd(false);
      setForm({
        student_name: "",
        roll_number: "",
        class_name: "Class 1",
        section_name: "A",
        parent_name: "",
        parent_phone: ""
      });
      setFormErrors({});
      showToast(`Student ${newStudent.student_name} registered successfully.`);
    } catch (err) {
      console.error(err);
      showToast("Error adding student.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenAssignModal = () => {
    setAssignForm({
      academic_year: selectedStudent.academic_year || "2025-2026",
      class_name: selectedStudent.class_name || "Class 1",
      section_name: selectedStudent.section_name || "A",
      total_fee_amount: selectedStudent.total_fee_amount || ""
    });
    setAssignErrors({});
    setShowAssignModal(true);
  };

  const handleAssignFee = async (e) => {
    e.preventDefault();
    if (!assignForm.total_fee_amount || Number(assignForm.total_fee_amount) <= 0) {
      setAssignErrors({ total_fee_amount: "Please enter a valid fee amount" });
      return;
    }

    setAssigning(true);
    try {
      const updated = await feeCollectionService.assignFees(selectedStudent.id, {
        total_fee_amount: Number(assignForm.total_fee_amount),
        class_name: assignForm.class_name,
        section_name: assignForm.section_name,
        academic_year: assignForm.academic_year
      });

      // Update local students list
      setStudents(prev => prev.map(s => s.id === selectedStudent.id ? updated : s));
      setSelectedStudent(updated);
      setShowAssignModal(false);
      showToast(`Fee structure assigned to ${updated.student_name} successfully.`);
    } catch (err) {
      console.error(err);
      showToast("Error assigning fee structure.", "error");
    } finally {
      setAssigning(false);
    }
  };

  // CSV Parse
  const handleCSVImport = () => {
    if (!csvFile) {
      showToast("Please pick a valid CSV file.", "error");
      return;
    }
    setImporting(true);
    setImportResult(null);

    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data;
        let imported = 0;
        let failed = 0;

        for (const row of rows) {
          const name = row.student_name || row.Name || row.name;
          const roll = row.roll_number || row.RollNo || row.roll;
          const className = row.class_name || row.Class || "Class 1";
          const section = row.section_name || row.Section || "A";
          const parentName = row.parent_name || row.Parent || "Parent";
          const parentPhone = row.parent_phone || row.Phone || "9999999999";

          if (name && roll) {
            await feeCollectionService.addStudent({
              student_name: name,
              roll_number: roll,
              class_name: className,
              section_name: section,
              parent_name: parentName,
              parent_phone: parentPhone
            });
            imported++;
          } else {
            failed++;
          }
        }

        setImporting(false);
        setImportResult({ imported, failed, total: rows.length });
        showToast(`Import completed. ${imported} students loaded.`);
        loadStudents();
      },
      error: (err) => {
        console.error(err);
        showToast("Error parsing CSV file.", "error");
        setImporting(false);
      }
    });
  };

  const fmt = (n) => `₹${Number(n ?? 0).toLocaleString("en-IN")}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", width: "100%" }}>
      {/* Toast Alert */}
      {toast && (
        <div style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          padding: "12px 24px",
          background: toast.type === "success" ? "var(--success)" : "var(--danger)",
          color: "white",
          borderRadius: "var(--radius-md)",
          boxShadow: "var(--shadow-lg)",
          zIndex: 1100,
          fontWeight: 600
        }}>
          {toast.message}
        </div>
      )}

      {/* Action Strip */}
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        {/* Search */}
        <div style={{ display: "flex", alignItems: "center", background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: "4px 12px", width: "320px", gap: "8px" }}>
          <Search size={16} color="var(--text-secondary)" />
          <input
            type="text"
            placeholder="Search by student name or parent..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ background: "transparent", border: "none", outline: "none", color: "var(--text-primary)", fontSize: "14px", width: "100%" }}
          />
          {search && <X size={14} color="var(--text-secondary)" onClick={() => setSearch("")} style={{ cursor: "pointer" }} />}
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn btn-secondary" onClick={() => setShowImport(true)}>
            <Upload size={16} /> Import CSV
          </button>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Add Student
          </button>
        </div>
      </div>

      {/* Filters Strip */}
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", background: "var(--bg-card)", border: "1px solid var(--border-color)", padding: "16px", borderRadius: "var(--radius-lg)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", minWidth: "150px" }}>
          <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>Filter by Class</label>
          <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="form-select" style={{ height: "38px" }}>
            <option value="">All Classes</option>
            {Array.from({ length: 10 }, (_, i) => (
              <option key={i+1} value={`Class ${i+1}`}>{`Class ${i+1}`}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px", minWidth: "120px" }}>
          <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>Filter by Section</label>
          <select value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)} className="form-select" style={{ height: "38px" }}>
            <option value="">All Sections</option>
            <option value="A">Section A</option>
            <option value="B">Section B</option>
            <option value="C">Section C</option>
          </select>
        </div>
      </div>

      {/* Main Two Pane Directory */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: selectedStudent ? "1fr 400px" : "1fr", 
        gap: "20px",
        transition: "all 0.3s ease"
      }}>
        {/* Left Side Table */}
        <div className="table-card" style={{ height: "fit-content" }}>
          <div className="custom-table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Admission No</th>
                  <th>Class / Sec</th>
                  <th>Parent Name</th>
                  <th>Total Fee</th>
                  <th>Paid</th>
                  <th>Dues</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", padding: "40px" }}>
                      <div style={{ display: "flex", justifyContent: "center" }}><div className="spinner" /></div>
                    </td>
                  </tr>
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", padding: "30px", color: "var(--text-secondary)" }}>
                      No students found matching current filters.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s) => (
                    <tr 
                      key={s.id} 
                      onClick={() => handleSelectStudent(s)} 
                      style={{ 
                        cursor: "pointer",
                        background: selectedStudent?.id === s.id ? "rgba(99, 102, 241, 0.08)" : ""
                      }}
                    >
                      <td style={{ fontWeight: 600 }}>{s.student_name}</td>
                      <td style={{ fontFamily: "monospace", fontSize: "13px" }}>{s.admission_number}</td>
                      <td>{s.class_name} - {s.section_name}</td>
                      <td>{s.parent_name}</td>
                      <td>{fmt(s.total_fee_amount)}</td>
                      <td style={{ color: "var(--success)", fontWeight: 600 }}>{fmt(s.amount_paid)}</td>
                      <td style={{ color: s.due_amount > 0 ? "var(--danger)" : "var(--success)", fontWeight: 600 }}>{fmt(s.due_amount)}</td>
                      <td>
                        <span className="badge" style={{
                          backgroundColor: s.fee_status === "Paid" ? "var(--success-light)" : 
                                           s.fee_status === "Partially Paid" ? "var(--warning-light)" :
                                           s.fee_status === "Unpaid" ? "var(--danger-light)" :
                                           "rgba(156, 163, 175, 0.1)",
                          color: s.fee_status === "Paid" ? "var(--success)" : 
                                 s.fee_status === "Partially Paid" ? "var(--warning)" :
                                 s.fee_status === "Unpaid" ? "var(--danger)" :
                                 "var(--text-secondary)",
                          border: s.fee_status === "Paid" ? "1px solid var(--success)" : 
                                  s.fee_status === "Partially Paid" ? "1px solid var(--warning)" :
                                  s.fee_status === "Unpaid" ? "1px solid var(--danger)" :
                                  "1px solid var(--border-color)"
                        }}>
                          {s.fee_status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side Detail Drawer */}
        {selectedStudent && (
          <div style={{ 
            background: "var(--bg-card)", 
            border: "1px solid var(--border-color)", 
            borderRadius: "var(--radius-lg)", 
            padding: "24px",
            height: "fit-content",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            animation: "slideIn 0.2s ease-out"
          }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <h3 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>{selectedStudent.student_name}</h3>
                  <span className="badge" style={{
                    backgroundColor: selectedStudent.fee_status === "Paid" ? "var(--success-light)" : 
                                     selectedStudent.fee_status === "Partially Paid" ? "var(--warning-light)" :
                                     selectedStudent.fee_status === "Unpaid" ? "var(--danger-light)" :
                                     "rgba(156, 163, 175, 0.1)",
                    color: selectedStudent.fee_status === "Paid" ? "var(--success)" : 
                           selectedStudent.fee_status === "Partially Paid" ? "var(--warning)" :
                           selectedStudent.fee_status === "Unpaid" ? "var(--danger)" :
                           "var(--text-secondary)",
                    border: selectedStudent.fee_status === "Paid" ? "1px solid var(--success)" : 
                            selectedStudent.fee_status === "Partially Paid" ? "1px solid var(--warning)" :
                            selectedStudent.fee_status === "Unpaid" ? "1px solid var(--danger)" :
                            "1px solid var(--border-color)"
                  }}>
                    {selectedStudent.fee_status}
                  </span>
                </div>
                <span style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "monospace" }}>{selectedStudent.admission_number}</span>
              </div>
              <button 
                onClick={() => setSelectedStudent(null)}
                style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Profile Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", background: "var(--bg-main)", padding: "14px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", fontSize: "13px" }}>
              <div>
                <div style={{ color: "var(--text-muted)", fontSize: "11px" }}>CLASS / SECTION</div>
                <div style={{ fontWeight: 600 }}>{selectedStudent.class_name} - {selectedStudent.section_name}</div>
              </div>
              <div>
                <div style={{ color: "var(--text-muted)", fontSize: "11px" }}>ROLL NUMBER</div>
                <div style={{ fontWeight: 600 }}>{selectedStudent.roll_number}</div>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ color: "var(--text-muted)", fontSize: "11px" }}>PARENT / GUARDIAN</div>
                <div style={{ fontWeight: 600 }}>{selectedStudent.parent_name} ({selectedStudent.parent_phone})</div>
              </div>
            </div>

            {/* Balances summary */}
            {selectedStudent.fee_status === "Not Assigned" ? (
              <div style={{ background: "rgba(99, 102, 241, 0.05)", border: "1px dashed var(--primary)", padding: "16px", borderRadius: "var(--radius-md)", display: "flex", flexDirection: "column", gap: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                  <AlertCircle size={16} color="var(--primary)" /> Fee Structure Not Assigned
                </div>
                <p style={{ margin: 0, fontSize: "12px", color: "var(--text-secondary)" }}>
                  No fee payments or expectations are recorded yet.
                </p>
                <button 
                  className="btn btn-primary btn-sm" 
                  onClick={handleOpenAssignModal}
                  style={{ width: "100%" }}
                >
                  Assign Fee Structure
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Expected Bill:</span>
                    <span style={{ fontWeight: 600 }}>{fmt(selectedStudent.total_fee_amount)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Total Credited:</span>
                    <span style={{ fontWeight: 600, color: "var(--success)" }}>{fmt(selectedStudent.amount_paid)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", fontWeight: 700, borderTop: "1px dashed var(--border-color)", paddingTop: "8px", marginTop: "4px" }}>
                    <span style={{ color: "var(--text-primary)" }}>Outstanding Due:</span>
                    <span style={{ color: selectedStudent.due_amount > 0 ? "var(--danger)" : "var(--success)" }}>{fmt(selectedStudent.due_amount)}</span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                  <button 
                    className="btn btn-secondary btn-sm" 
                    onClick={handleOpenAssignModal}
                    style={{ flex: 1 }}
                  >
                    Update Fee Structure
                  </button>
                  {selectedStudent.due_amount > 0 && (
                    <button 
                      className="btn btn-primary btn-sm" 
                      onClick={() => navigate("/admin/fee/collections", { state: { studentId: selectedStudent.id } })}
                      style={{ flex: 1 }}
                    >
                      Collect Payment
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Transactions timeline */}
            <div>
              <h4 style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "12px", borderBottom: "1px solid var(--border-color)", paddingBottom: "4px" }}>
                Recent payments history
              </h4>
              {loadingDetails ? (
                <div style={{ textAlign: "center", padding: "10px" }}><div className="spinner-sm" /></div>
              ) : selectedStudentHistory.length === 0 ? (
                <div style={{ fontSize: "12px", color: "var(--text-muted)", textAlign: "center", padding: "12px 0" }}>No collections recorded.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {selectedStudentHistory.map(r => (
                    <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-main)", padding: "10px", borderRadius: "var(--radius-sm)", fontSize: "13px" }}>
                      <div>
                        <span style={{ fontWeight: 700, color: "var(--primary)", fontSize: "12px" }}>{r.receipt_number}</span>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{r.receipt_date} via {r.payment_mode}</div>
                      </div>
                      <span style={{ fontWeight: 700, color: "var(--success)" }}>{fmt(r.total_amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Student Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Register New Student</h2>
              <button className="modal-close" onClick={() => setShowAdd(false)}>×</button>
            </div>
            
            <form onSubmit={handleAddStudent}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Student Name *</label>
                  <input
                    type="text"
                    value={form.student_name}
                    onChange={(e) => setForm(prev => ({ ...prev, student_name: e.target.value }))}
                    className="form-input"
                    placeholder="e.g. Ramesh Reddy"
                    required
                  />
                  {formErrors.student_name && <span className="form-error">{formErrors.student_name}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Roll Number *</label>
                  <input
                    type="text"
                    value={form.roll_number}
                    onChange={(e) => setForm(prev => ({ ...prev, roll_number: e.target.value }))}
                    className="form-input"
                    placeholder="e.g. R01"
                    required
                  />
                  {formErrors.roll_number && <span className="form-error">{formErrors.roll_number}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Class Level *</label>
                  <select
                    value={form.class_name}
                    onChange={(e) => setForm(prev => ({ ...prev, class_name: e.target.value }))}
                    className="form-select"
                  >
                    {Array.from({ length: 10 }, (_, i) => (
                      <option key={i+1} value={`Class ${i+1}`}>{`Class ${i+1}`}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Section *</label>
                  <select
                    value={form.section_name}
                    onChange={(e) => setForm(prev => ({ ...prev, section_name: e.target.value }))}
                    className="form-select"
                  >
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Parent / Guardian Name *</label>
                  <input
                    type="text"
                    value={form.parent_name}
                    onChange={(e) => setForm(prev => ({ ...prev, parent_name: e.target.value }))}
                    className="form-input"
                    placeholder="Parent Name"
                    required
                  />
                  {formErrors.parent_name && <span className="form-error">{formErrors.parent_name}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Parent Phone Number *</label>
                  <input
                    type="tel"
                    value={form.parent_phone}
                    onChange={(e) => setForm(prev => ({ ...prev, parent_phone: e.target.value }))}
                    className="form-input"
                    placeholder="Parent Phone"
                    required
                  />
                  {formErrors.parent_phone && <span className="form-error">{formErrors.parent_phone}</span>}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Registering..." : "Save Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showImport && (
        <div className="modal-overlay" onClick={() => setShowImport(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "500px" }}>
            <div className="modal-header">
              <h2>CSV Bulk Import</h2>
              <button className="modal-close" onClick={() => setShowImport(false)}>×</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "10px 0" }}>
              <div style={{ border: "1.5px dashed var(--border-color)", padding: "20px", borderRadius: "var(--radius-md)", textAlign: "center", background: "var(--bg-main)", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                <FileSpreadsheet size={32} color="var(--primary)" />
                <div>
                  <span style={{ fontSize: "14px", fontWeight: 600 }}>Select student csv file</span>
                  <p style={{ fontSize: "11px", color: "var(--text-secondary)", margin: "4px 0" }}>Columns required: student_name, roll_number, class_name, section_name, parent_name, parent_phone</p>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv"
                  style={{ display: "none" }}
                  onChange={(e) => setCsvFile(e.target.files[0])}
                />
                <button className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current.click()}>
                  Browse File
                </button>
                {csvFile && <span style={{ fontSize: "12px", color: "var(--success)" }}>Selected: {csvFile.name}</span>}
              </div>

              {importResult && (
                <div style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid var(--success)", padding: "12px", borderRadius: "var(--radius-md)", fontSize: "13px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div style={{ fontWeight: 700, color: "var(--success)", display: "flex", alignItems: "center", gap: "6px" }}>
                    <CheckCircle size={16} /> Import report summary
                  </div>
                  <span>Total Parsed Rows: {importResult.total}</span>
                  <span>Successful Uploads: {importResult.imported}</span>
                  <span>Failed Rows: {importResult.failed}</span>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowImport(false)}>Close</button>
              <button type="button" className="btn btn-primary" onClick={handleCSVImport} disabled={!csvFile || importing}>
                {importing ? "Processing..." : "Import Students"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Fee Structure Modal */}
      {showAssignModal && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "450px" }}>
            <div className="modal-header">
              <h2>Assign Fee Structure</h2>
              <button className="modal-close" onClick={() => setShowAssignModal(false)}>×</button>
            </div>
            
            <form onSubmit={handleAssignFee}>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                
                <div style={{ padding: "10px", background: "var(--primary-light)", border: "1px solid var(--primary)", borderRadius: "var(--radius-md)", fontSize: "13px" }}>
                  <span>Assigning fee for student: <strong>{selectedStudent.student_name}</strong></span>
                  <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>
                    Current Level: {selectedStudent.class_name} - {selectedStudent.section_name}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Academic Year *</label>
                  <select
                    value={assignForm.academic_year}
                    onChange={(e) => setAssignForm(prev => ({ ...prev, academic_year: e.target.value }))}
                    className="form-select"
                    required
                  >
                    <option value="2025-2026">2025-2026</option>
                    <option value="2026-2027">2026-2027</option>
                    <option value="2027-2028">2027-2028</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Class *</label>
                  <select
                    value={assignForm.class_name}
                    onChange={(e) => setAssignForm(prev => ({ ...prev, class_name: e.target.value }))}
                    className="form-select"
                    required
                  >
                    {Array.from({ length: 10 }, (_, i) => (
                      <option key={i+1} value={`Class ${i+1}`}>{`Class ${i+1}`}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Section *</label>
                  <select
                    value={assignForm.section_name}
                    onChange={(e) => setAssignForm(prev => ({ ...prev, section_name: e.target.value }))}
                    className="form-select"
                    required
                  >
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Total Fee Amount (₹) *</label>
                  <input
                    type="number"
                    value={assignForm.total_fee_amount}
                    onChange={(e) => setAssignForm(prev => ({ ...prev, total_fee_amount: e.target.value }))}
                    className="form-input"
                    placeholder="e.g. 25000"
                    required
                  />
                  {assignErrors.total_fee_amount && <span className="form-error">{assignErrors.total_fee_amount}</span>}
                  
                  {/* Preset helpers */}
                  <div style={{ display: "flex", gap: "8px", marginTop: "10px", alignItems: "center" }}>
                    <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Presets:</span>
                    {[15000, 25000, 40000].map(val => (
                      <button
                        key={val}
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ padding: "4px 8px", fontSize: "11px" }}
                        onClick={() => setAssignForm(prev => ({ ...prev, total_fee_amount: val }))}
                      >
                        ₹{val.toLocaleString("en-IN")}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              <div className="modal-footer" style={{ marginTop: "20px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAssignModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={assigning}>
                  {assigning ? "Saving..." : "✓ Assign Fee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
