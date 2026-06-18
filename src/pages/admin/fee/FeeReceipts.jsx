import React, { useState, useEffect, useRef } from "react";
import { feeReceiptService } from "../../../services/fee/feeReceiptService";
import { convertNumberToWords } from "../../../utils/numberToWords";
import { Search, Info, Printer, X, FileText } from "lucide-react";

export default function FeeReceipts() {
  const [receipts, setReceipts] = useState([]);
  const [query, setQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selected, setSelected] = useState(null);
  const [txLines, setTxLines] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef(null);

  useEffect(() => {
    loadReceipts();
    loadConfig();
  }, []);

  async function loadReceipts() {
    setLoading(true);
    try {
      const data = await feeReceiptService.getReceipts();
      setReceipts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadConfig() {
    try {
      const res = await feeReceiptService.getReceiptConfig();
      setConfig(res);
    } catch (err) {
      console.error(err);
    }
  }

  const handleSelect = async (receipt) => {
    setSelected(receipt);
    setTxLines([]);
    try {
      const lines = await feeReceiptService.getReceiptDetails(receipt.id);
      setTxLines(lines);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrint = () => {
    if (!printRef.current || !selected) return;

    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;border:none;";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument;
    doc.open();
    doc.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>Receipt - ${selected.receipt_number}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 11pt;
    color: #000;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .rp {
    width: 190mm;
    margin: 10mm auto;
    padding: 0;
  }
  .rp-border {
    border: 2px solid #000;
    padding: 8mm 10mm 6mm;
  }
  .rp-college-name {
    text-align: center;
    font-size: 16pt;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 1px;
    line-height: 1.3;
  }
  .rp-college-sub {
    text-align: center;
    font-size: 9pt;
    color: #333;
    margin-top: 3px;
    line-height: 1.5;
  }
  .rp-divider {
    border: none;
    border-top: 2px solid #000;
    margin: 5mm 0 4mm;
  }
  .rp-divider-thin {
    border: none;
    border-top: 1px solid #555;
    margin: 3mm 0;
  }
  .rp-title-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4mm;
  }
  .rp-title {
    font-size: 13pt;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 2px;
    text-decoration: underline;
  }
  .rp-receipt-no {
    font-size: 10pt;
    text-align: right;
  }
  .rp-receipt-no strong { font-size: 11pt; }
  .rp-info-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10pt;
    margin-bottom: 4mm;
  }
  .rp-info-table td {
    padding: 3px 0;
    vertical-align: top;
  }
  .rp-info-table .lbl {
    width: 38mm;
    font-weight: bold;
    white-space: nowrap;
  }
  .rp-info-table .sep { width: 5mm; text-align: center; }
  .rp-info-table .val { }
  .rp-fee-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10pt;
    margin-bottom: 3mm;
  }
  .rp-fee-table th {
    background: #000;
    color: #fff;
    padding: 6px 8px;
    text-align: left;
    font-weight: bold;
  }
  .rp-fee-table th:last-child { text-align: right; }
  .rp-fee-table td {
    padding: 6px 8px;
    border-bottom: 1px solid #ddd;
  }
  .rp-fee-table td:last-child { text-align: right; }
  .rp-fee-table tr:nth-child(even) td { background: #f7f7f7; }
  .rp-fee-table .rp-total-row td {
    border-top: 2px solid #000;
    border-bottom: none;
    font-weight: bold;
    font-size: 11pt;
    background: #e8e8e8;
    padding: 6px 8px;
  }
  .rp-words {
    font-size: 9.5pt;
    margin: 2mm 0 4mm;
    padding: 5px 8px;
    border: 1px dashed #777;
    border-radius: 3px;
    background: #fafafa;
  }
  .rp-words span { font-weight: bold; }
  .rp-pay-row {
    display: flex;
    justify-content: space-between;
    font-size: 10pt;
    margin-bottom: 3mm;
  }
  .rp-pay-badge {
    background: #000;
    color: #fff;
    padding: 2px 10px;
    border-radius: 3px;
    font-size: 9pt;
    font-weight: bold;
  }
  .rp-footer {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-top: 12mm;
  }
  .rp-footer-left { font-size: 9pt; color: #555; line-height: 1.6; }
  .rp-footer-right { text-align: center; }
  .rp-sig-line {
    border-top: 1px solid #000;
    width: 55mm;
    padding-top: 3px;
    font-size: 9pt;
    font-weight: bold;
  }
  .rp-sig-desig { font-size: 8.5pt; color: #333; }
  .rp-stamp {
    width: 26mm;
    height: 26mm;
    border: 1px dashed #aaa;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 8pt;
    color: #aaa;
    margin-bottom: 4mm;
    margin-left: auto;
    margin-right: auto;
  }
  .rp-watermark {
    position: relative;
  }
  .rp-watermark::after {
    content: 'OFFICIAL RECEIPT';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-25deg);
    font-size: 40pt;
    font-weight: bold;
    color: rgba(0,0,0,0.03);
    pointer-events: none;
    white-space: nowrap;
  }
  @page { size: A4; margin: 10mm; }
</style>
</head>
<body>
  ${printRef.current.innerHTML}
</body>
</html>`);
    doc.close();

    iframe.onload = () => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => document.body.removeChild(iframe), 800);
    };
  };

  // Filter receipts
  const filtered = receipts.filter(r => {
    const q = query.toLowerCase().trim();
    const matchesQuery = !q ||
      r.receipt_number.toLowerCase().includes(q) ||
      (r.students?.student_name ?? "").toLowerCase().includes(q) ||
      (r.students?.admission_number ?? "").toLowerCase().includes(q);

    let matchesDate = true;
    if (r.receipt_date) {
      const rDate = new Date(r.receipt_date);
      if (startDate) {
        const s = new Date(startDate);
        s.setHours(0,0,0,0);
        if (rDate < s) matchesDate = false;
      }
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23,59,59,999);
        if (rDate > e) matchesDate = false;
      }
    } else if (startDate || endDate) {
      matchesDate = false;
    }

    return matchesQuery && matchesDate;
  });

  const fmt = (n) => `₹${n.toLocaleString("en-IN")}`;
  const fmtDate = (iso) => new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", width: "100%" }}>
      {/* Search and Date Filter Row */}
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: "4px 12px", flex: "1 1 300px", gap: "8px" }}>
          <Search size={16} color="var(--text-secondary)" />
          <input
            type="text"
            placeholder="Search by receipt no, student name or admission no..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ background: "transparent", border: "none", outline: "none", color: "var(--text-primary)", fontSize: "14px", width: "100%" }}
          />
          {query && <X size={14} color="var(--text-secondary)" onClick={() => setQuery("")} style={{ cursor: "pointer" }} />}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--bg-card)", border: "1px solid var(--border-color)", padding: "4px 12px", borderRadius: "var(--radius-md)", flexShrink: 0 }}>
          <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)" }}>From:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ border: "none", outline: "none", fontSize: "13px", background: "transparent", color: "var(--text-primary)" }}
          />
          <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginLeft: "4px" }}>To:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ border: "none", outline: "none", fontSize: "13px", background: "transparent", color: "var(--text-primary)" }}
          />
          {(startDate || endDate) && (
            <X size={16} color="var(--danger)" onClick={() => { setStartDate(""); setEndDate(""); }} style={{ cursor: "pointer" }} />
          )}
        </div>
      </div>

      {/* Two Pane Split View */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: selected ? "1fr 420px" : "1fr",
        gap: "20px",
        alignItems: "start",
        transition: "all 0.3s ease"
      }}>
        {/* Left pane: Receipts list */}
        <div className="table-card">
          {loading ? (
            <div style={{ padding: "40px", textAlign: "center" }}><div className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
              No receipts found.
            </div>
          ) : (
            <div className="custom-table-wrapper">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Receipt No</th>
                    <th>Receipt Date</th>
                    <th>Student Name</th>
                    <th>Class & Sec</th>
                    <th>Payment Mode</th>
                    <th style={{ textAlign: "right" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr
                      key={r.id}
                      onClick={() => handleSelect(r)}
                      style={{ 
                        cursor: "pointer",
                        background: selected?.id === r.id ? "rgba(99, 102, 241, 0.08)" : ""
                      }}
                    >
                      <td style={{ fontWeight: 700, color: "var(--primary)" }}>{r.receipt_number}</td>
                      <td>{fmtDate(r.receipt_date)}</td>
                      <td style={{ fontWeight: 600 }}>{r.students?.student_name}</td>
                      <td>{r.students?.class_name} - {r.students?.section_name}</td>
                      <td>
                        <span className="badge badge-primary">{r.payment_mode}</span>
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 700, color: "var(--success)" }}>{fmt(r.total_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right pane: Selected Receipt details & print preview */}
        {selected && (
          <div style={{ 
            background: "var(--bg-card)", 
            border: "1px solid var(--border-color)", 
            borderRadius: "var(--radius-lg)", 
            padding: "24px",
            display: "flex", 
            flexDirection: "column", 
            gap: "20px",
            animation: "slideIn 0.2s ease"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>Receipt Ledger Details</h3>
              <div style={{ display: "flex", gap: "8px" }}>
                <button className="btn btn-primary btn-sm" onClick={handlePrint}>
                  <Printer size={14} /> Print
                </button>
                <button style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }} onClick={() => setSelected(null)}>
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Quick summary grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", background: "var(--bg-main)", padding: "16px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", fontSize: "13px" }}>
              <div>
                <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>RECEIPT NUMBER</span>
                <div style={{ fontWeight: 700, color: "var(--primary)" }}>{selected.receipt_number}</div>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>DATE</span>
                <div style={{ fontWeight: 600 }}>{fmtDate(selected.receipt_date)}</div>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>STUDENT</span>
                <div style={{ fontWeight: 600 }}>{selected.students?.student_name}</div>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>ADMISSION NUMBER</span>
                <div style={{ fontWeight: 600, fontFamily: "monospace" }}>{selected.students?.admission_number}</div>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>CLASS / SECTION</span>
                <div style={{ fontWeight: 600 }}>{selected.students?.class_name} - {selected.students?.section_name}</div>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>PAYMENT MODE</span>
                <div style={{ fontWeight: 600 }}>{selected.payment_mode}</div>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>COLLECTED BY</span>
                <div style={{ fontWeight: 600 }}>{selected.users?.full_name}</div>
              </div>
              {selected.transaction_reference && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>TRANSACTION REFERENCE</span>
                  <div style={{ fontWeight: 600, fontFamily: "monospace" }}>{selected.transaction_reference}</div>
                </div>
              )}
              {selected.remarks && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>REMARKS</span>
                  <div style={{ fontWeight: 500, fontSize: "12px", color: "var(--text-secondary)" }}>{selected.remarks}</div>
                </div>
              )}
            </div>

            {/* Breakdown lines */}
            <div>
              <h4 style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "10px", borderBottom: "1px solid var(--border-color)", paddingBottom: "4px" }}>
                Fee Breakdown
              </h4>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "1.5px solid var(--border-color)", color: "var(--text-secondary)", fontWeight: 600 }}>
                    <th style={{ padding: "6px 0", textAlign: "left" }}>Fee Category</th>
                    <th style={{ padding: "6px 0", textAlign: "right" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {txLines.map((line, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid var(--border-color)" }}>
                      <td style={{ padding: "8px 0" }}>{line.fee_types?.fee_name}</td>
                      <td style={{ padding: "8px 0", textAlign: "right", fontWeight: 600 }}>{fmt(line.amount)}</td>
                    </tr>
                  ))}
                  <tr style={{ fontWeight: 700, fontSize: "14px" }}>
                    <td style={{ padding: "10px 0" }}>Total Credited</td>
                    <td style={{ padding: "10px 0", textAlign: "right", color: "var(--success)" }}>{fmt(selected.total_amount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Hidden print receipt template (consumed programmatically by iframe) */}
      {selected && (
        <div style={{ display: "none" }}>
          <div ref={printRef}>
            <div className="rp rp-watermark">
              <div className="rp-border">
                {/* School logo/name config header */}
                <div className="rp-college-name">
                  {config?.school_name}
                </div>
                <div className="rp-college-sub">
                  <div>{config?.school_address}</div>
                  <div>Phone: {config?.school_phone} | Email: {config?.school_email}</div>
                </div>
                
                <hr className="rp-divider" />

                <div className="rp-title-row">
                  <div className="rp-title">Fee Receipt Invoice</div>
                  <div className="rp-receipt-no">
                    <div>Receipt No: <strong>{selected.receipt_number}</strong></div>
                    <div>Receipt Date: <strong>{fmtDate(selected.receipt_date)}</strong></div>
                  </div>
                </div>

                <hr className="rp-divider-thin" />

                {/* Info table */}
                <table className="rp-info-table">
                  <tbody>
                    <tr>
                      <td className="lbl">Student Name</td>
                      <td className="sep">:</td>
                      <td className="val"><strong>{selected.students?.student_name}</strong></td>
                      
                      <td className="lbl" style={{ paddingLeft: "10mm" }}>Admission No</td>
                      <td className="sep">:</td>
                      <td className="val"><strong>{selected.students?.admission_number}</strong></td>
                    </tr>
                    <tr>
                      <td className="lbl">Class / Section</td>
                      <td className="sep">:</td>
                      <td className="val">{selected.students?.class_name} - {selected.students?.section_name}</td>

                      <td className="lbl" style={{ paddingLeft: "10mm" }}>Roll Number</td>
                      <td className="sep">:</td>
                      <td className="val">{selected.students?.roll_number}</td>
                    </tr>
                    <tr>
                      <td className="lbl">Parent / Guardian</td>
                      <td className="sep">:</td>
                      <td className="val">{selected.students?.parent_name}</td>
                      
                      <td className="lbl" style={{ paddingLeft: "10mm" }}>Collector</td>
                      <td className="sep">:</td>
                      <td className="val">{selected.users?.full_name}</td>
                    </tr>
                  </tbody>
                </table>

                <hr className="rp-divider-thin" />

                {/* Items */}
                <table className="rp-fee-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Fee Category Account Description</th>
                      <th style={{ textAlign: "right" }}>Allocated Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txLines.map((line, idx) => (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td>{line.fee_types?.fee_name || "School Fee Item"}</td>
                        <td style={{ textAlign: "right" }}>{fmt(line.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="rp-total-row">
                      <td colSpan={2}>Grand Total Paid</td>
                      <td style={{ textAlign: "right" }}>{fmt(selected.total_amount)}</td>
                    </tr>
                  </tfoot>
                </table>

                {/* Words */}
                <div className="rp-words">
                  Amount in words: <strong>{convertNumberToWords(selected.total_amount)}</strong>
                </div>

                {/* Mode details */}
                <div className="rp-pay-row">
                  <div>
                    Payment Mode: <span className="rp-pay-badge">{selected.payment_mode}</span>
                    {selected.transaction_reference && (
                      <span style={{ marginLeft: "6px" }}>Ref No: <strong>{selected.transaction_reference}</strong></span>
                    )}
                  </div>
                </div>

                {selected.remarks && (
                  <div style={{ fontSize: "9pt", color: "#555", marginTop: "3mm" }}>
                    Remarks: {selected.remarks}
                  </div>
                )}

                {/* Bottom signatures */}
                <div className="rp-footer">
                  <div className="rp-footer-left">
                    <div>Generated: {new Date().toLocaleString("en-IN")}</div>
                    <div style={{ color: "#777", marginTop: "4px" }}>This is an official computer-generated billing statement.</div>
                  </div>
                  <div className="rp-footer-right">
                    <div className="rp-stamp">Office Seal</div>
                    <div className="rp-sig-line">{config?.authorized_signatory_name}</div>
                    <div className="rp-sig-desig">{config?.authorized_signatory_designation}</div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
