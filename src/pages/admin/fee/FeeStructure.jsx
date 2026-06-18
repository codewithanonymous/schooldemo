import React, { useEffect, useState } from "react";
import { feeCollectionService } from "../../../services/fee/feeCollectionService";
import { feeReceiptService } from "../../../services/fee/feeReceiptService";
import { MOCK_FEE_STRUCTURES, MOCK_ACADEMIC_YEARS } from "../../../mock/fee/feeStructures";
import { Plus, Trash2, ShieldCheck, HelpCircle } from "lucide-react";

export default function FeeStructure() {
  const [activeTab, setActiveTab] = useState("classes");
  const [feeTypes, setFeeTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const types = await feeCollectionService.getFeeTypes();
        setFeeTypes(types);
      } catch (err) {
        console.error("Error loading structure data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [activeTab]);

  const fmt = (n) => `₹${Number(n ?? 0).toLocaleString("en-IN")}`;

  const triggerNotification = () => {
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 4000);
  };

  const renderClassesTab = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: 600 }}>Class-Wise Fee Structure</h2>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0 }}>Allocation of expected annual fees per class level.</p>
        </div>
        <button className="btn btn-primary" onClick={triggerNotification}>
          <Plus size={16} /> Allocate Class Fee
        </button>
      </div>

      <div className="table-card">
        <div className="custom-table-wrapper">
          <table className="custom-table">
            <thead>
              <tr style={{ background: "rgba(15, 23, 42, 0.4)" }}>
                <th>Class Name</th>
                <th>Tuition Fee</th>
                <th>Transport Fee</th>
                <th>Exam Fee</th>
                <th>Uniform Fee</th>
                <th style={{ textAlign: "right" }}>Total Expected</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_FEE_STRUCTURES.map((fs) => {
                const tuition = fs.fees.find(f => f.fee_type_id === 1)?.amount || 0;
                const transport = fs.fees.find(f => f.fee_type_id === 2)?.amount || 0;
                const exam = fs.fees.find(f => f.fee_type_id === 3)?.amount || 0;
                const uniform = fs.fees.find(f => f.fee_type_id === 4)?.amount || 0;
                return (
                  <tr key={fs.class_id}>
                    <td style={{ fontWeight: 600 }}>{fs.class_name}</td>
                    <td>{fmt(tuition)}</td>
                    <td>{fmt(transport)}</td>
                    <td>{fmt(exam)}</td>
                    <td>{fmt(uniform)}</td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: "var(--primary)" }}>{fmt(fs.total_amount)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderSectionsTab = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: 600 }}>Sections Management</h2>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0 }}>Active school sections linked to tuition streams.</p>
        </div>
        <button className="btn btn-primary" onClick={triggerNotification}>
          <Plus size={16} /> Add Section
        </button>
      </div>

      <div className="table-card">
        <div className="custom-table-wrapper">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Section Code</th>
                <th>Section Name</th>
                <th>Stream</th>
                <th>Status</th>
                <th style={{ textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {[
                { code: "SEC-A", name: "Section A", stream: "General", status: "Active" },
                { code: "SEC-B", name: "Section B", stream: "General", status: "Active" },
                { code: "SEC-C", name: "Section C", stream: "Special/Alternative", status: "Active" }
              ].map((sec, idx) => (
                <tr key={sec.code}>
                  <td style={{ fontWeight: 600 }}>{sec.code}</td>
                  <td>{sec.name}</td>
                  <td>{sec.stream}</td>
                  <td>
                    <span className="badge badge-success">{sec.status}</span>
                  </td>
                  <td style={{ display: "flex", justifyContent: "center" }}>
                    <button className="btn-icon btn-icon-danger" onClick={triggerNotification}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderFeeTypesTab = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: 600 }}>Fee Type Directory</h2>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0 }}>Definitions of active fee categories collected by the school.</p>
        </div>
        <button className="btn btn-primary" onClick={triggerNotification}>
          <Plus size={16} /> Add Fee Type
        </button>
      </div>

      <div className="table-card">
        <div className="custom-table-wrapper">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Fee Code</th>
                <th>Fee Name</th>
                <th>Description</th>
                <th>Status</th>
                <th style={{ textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {feeTypes.map((ft) => (
                <tr key={ft.id}>
                  <td style={{ fontWeight: 600, fontFamily: "monospace", color: "var(--primary)" }}>{ft.fee_code}</td>
                  <td>{ft.fee_name}</td>
                  <td style={{ color: "var(--text-secondary)" }}>{ft.description || "—"}</td>
                  <td>
                    <span className={`badge ${ft.is_active ? "badge-success" : "badge-danger"}`}>
                      {ft.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={{ display: "flex", justifyContent: "center" }}>
                    <button className="btn-icon btn-icon-danger" onClick={triggerNotification}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderAcademicYearsTab = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: 600 }}>Academic Term Cycles</h2>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0 }}>Enrollment and fee cycles boundaries definitions.</p>
        </div>
        <button className="btn btn-primary" onClick={triggerNotification}>
          <Plus size={16} /> Add Academic Year
        </button>
      </div>

      <div className="table-card">
        <div className="custom-table-wrapper">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Year Name</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Term Status</th>
                <th style={{ textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_ACADEMIC_YEARS.map((ay) => (
                <tr key={ay.id}>
                  <td style={{ fontWeight: 600 }}>{ay.year_name}</td>
                  <td>{new Date(ay.start_date).toLocaleDateString("en-IN")}</td>
                  <td>{new Date(ay.end_date).toLocaleDateString("en-IN")}</td>
                  <td>
                    <span className={`badge ${ay.is_active ? "badge-success" : "badge-secondary"}`}>
                      {ay.is_active ? "Active Term" : "Archived"}
                    </span>
                  </td>
                  <td style={{ display: "flex", justifyContent: "center" }}>
                    <button className="btn-icon btn-icon-danger" onClick={triggerNotification}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Settings Notification alert */}
      {showNotification && (
        <div style={{ 
          padding: "12px 18px", 
          background: "var(--primary-light)", 
          border: "1px solid var(--primary)", 
          color: "var(--text-primary)", 
          borderRadius: "var(--radius-md)", 
          fontSize: "14px",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <ShieldCheck size={18} color="var(--primary)" />
          <span>This workspace is running in <strong>Mock Abstraction Mode</strong>. Creating and deleting rows is disabled in the UI demonstration.</span>
        </div>
      )}

      {/* Local Tabs */}
      <div style={{ 
        display: "flex", 
        gap: "10px", 
        borderBottom: "2px solid var(--border-color)",
        marginBottom: "10px"
      }}>
        {[
          { id: "classes", label: "Classes & Allocations" },
          { id: "sections", label: "Sections List" },
          { id: "fee_types", label: "Fee Type Directory" },
          { id: "academic_years", label: "Academic Terms" }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "12px 20px",
              background: "transparent",
              color: activeTab === tab.id ? "var(--primary)" : "var(--text-secondary)",
              border: "none",
              borderBottom: activeTab === tab.id ? "3px solid var(--primary)" : "3px solid transparent",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "14px",
              transition: "all 0.2s"
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Contents Frame */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-lg)", padding: "24px" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "30px" }}><div className="spinner" /></div>
        ) : (
          <>
            {activeTab === "classes" && renderClassesTab()}
            {activeTab === "sections" && renderSectionsTab()}
            {activeTab === "fee_types" && renderFeeTypesTab()}
            {activeTab === "academic_years" && renderAcademicYearsTab()}
          </>
        )}
      </div>
    </div>
  );
}
