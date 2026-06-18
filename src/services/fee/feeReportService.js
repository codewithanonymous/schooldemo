// Fee Report Service utilizing Mock Data Layer
import { getMockReceipts, getMockTransactions } from "../../mock/fee/feeReceipts";
import { getMockStudents } from "../../mock/fee/feeStudents";
import { MOCK_FEE_STRUCTURES } from "../../mock/fee/feeStructures";

export const feeReportService = {
  getReportData: async (startDate = "", endDate = "") => {
    await new Promise(resolve => setTimeout(resolve, 400));

    const receipts = getMockReceipts();
    const students = getMockStudents();
    const transactions = getMockTransactions();

    // Filter receipts by date range
    const filteredReceipts = receipts.filter(r => {
      if (!r.receipt_date) return false;
      const rDate = new Date(r.receipt_date);
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0,0,0,0);
        if (rDate < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23,59,59,999);
        if (rDate > end) return false;
      }
      return true;
    });

    // Filter transactions by date range (via receipt date)
    const filteredTransactions = transactions.filter(t => {
      const receipt = receipts.find(r => r.id === t.receipt_id);
      if (!receipt || !receipt.receipt_date) return false;
      const rDate = new Date(receipt.receipt_date);
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0,0,0,0);
        if (rDate < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23,59,59,999);
        if (rDate > end) return false;
      }
      return true;
    });

    // ── 1. Financial Summary KPIs ───────────────────────────────────────────
    const totalCollected = filteredReceipts.reduce((sum, r) => sum + r.total_amount, 0);
    const totalOutstanding = students.reduce((sum, s) => sum + s.due_amount, 0);
    const totalFeeExpected = students.reduce((sum, s) => sum + s.total_fee_amount, 0);
    const collectionRate = totalFeeExpected > 0 ? (students.reduce((sum, s) => sum + s.amount_paid, 0) / totalFeeExpected) * 100 : 0;
    
    const pendingStudents = students.filter(s => s.fee_status === "Unpaid" || s.fee_status === "Partially Paid").length;
    const paidStudents = students.filter(s => s.fee_status === "Paid").length;
    const notAssignedStudents = students.filter(s => s.fee_status === "Not Assigned").length;

    // ── 2. Revenue by Class (replaces Department) ───────────────────────────
    const classMap = new Map();
    // Pre-populate classes
    for (let c = 1; c <= 10; c++) {
      classMap.set(`Class ${c}`, 0);
    }
    
    filteredTransactions.forEach(tx => {
      const student = students.find(s => s.id === tx.student_id);
      if (student) {
        const key = student.class_name;
        classMap.set(key, (classMap.get(key) || 0) + tx.amount);
      }
    });

    const byClass = Array.from(classMap.entries())
      .map(([className, revenue]) => ({
        class_name: className,
        revenue
      }))
      .sort((a, b) => {
        // Sort numerically Class 1 to 10
        const getNum = str => parseInt(str.replace(/\D/g, '')) || 0;
        return getNum(a.class_name) - getNum(b.class_name);
      });

    // ── 3. Revenue by Section (replaces Academic Year) ──────────────────────
    const sectionMap = new Map([["A", 0], ["B", 0], ["C", 0]]);
    filteredTransactions.forEach(tx => {
      const student = students.find(s => s.id === tx.student_id);
      if (student && student.section_name) {
        const key = student.section_name;
        sectionMap.set(key, (sectionMap.get(key) || 0) + tx.amount);
      }
    });

    const bySection = Array.from(sectionMap.entries()).map(([sectionName, revenue]) => ({
      section_name: `Section ${sectionName}`,
      revenue
    }));

    // ── 4. Monthly Collections ──────────────────────────────────────────────
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyMap = new Map();

    filteredReceipts.forEach(r => {
      const date = new Date(r.receipt_date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const label = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
      
      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, { month: label, collected: 0, receipts: 0, key });
      }
      const entry = monthlyMap.get(key);
      entry.collected += r.total_amount;
      entry.receipts += 1;
    });

    const monthly = Array.from(monthlyMap.values()).sort((a, b) => a.key.localeCompare(b.key));

    // ── 5. Payment Mode Breakdown ───────────────────────────────────────────
    const modeMap = new Map([
      ["Cash", { amount: 0, count: 0 }],
      ["UPI", { amount: 0, count: 0 }],
      ["Bank Transfer", { amount: 0, count: 0 }],
      ["Card", { amount: 0, count: 0 }],
      ["Cheque", { amount: 0, count: 0 }]
    ]);

    filteredReceipts.forEach(r => {
      const mode = r.payment_mode === "DD" ? "Cheque" : r.payment_mode; // normalize
      const entry = modeMap.get(mode) || { amount: 0, count: 0 };
      entry.amount += r.total_amount;
      entry.count += 1;
      modeMap.set(mode, entry);
    });

    const byPaymentMode = Array.from(modeMap.entries())
      .map(([mode, data]) => ({
        mode,
        amount: data.amount,
        count: data.count
      }))
      .filter(p => p.count > 0);

    return {
      summary: {
        totalCollected,
        totalOutstanding,
        totalFeeAmount: totalFeeExpected,
        collectionRate,
        paidStudents,
        pendingStudents,
        notAssignedStudents,
        totalStudents: students.length,
        totalReceipts: filteredReceipts.length
      },
      byClass,
      bySection,
      monthly,
      byPaymentMode,
      generatedAt: new Date().toLocaleString("en-IN"),
      filters: { startDate, endDate }
    };
  }
};
