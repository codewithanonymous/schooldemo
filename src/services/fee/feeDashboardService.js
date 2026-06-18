// Dashboard Service utilizing Mock Data Layer
import { getMockStudents } from "../../mock/fee/feeStudents";
import { getMockReceipts } from "../../mock/fee/feeReceipts";

export const feeDashboardService = {
  getDashboardStats: async () => {
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 300));

    const today = new Date().toISOString().split('T')[0];
    const receipts = getMockReceipts();
    const students = getMockStudents();

    // Map the 3 most recent receipts to "today" to show realistic dashboard stats
    if (receipts.length > 0 && !receipts.some(r => r.receipt_date === today)) {
      const sorted = [...receipts].sort((a, b) => b.id - a.id);
      sorted.slice(0, 3).forEach(r => {
        r.receipt_date = today;
      });
    }

    const todayReceipts = receipts.filter(r => r.receipt_date === today);
    
    const cash = todayReceipts.filter(r => r.payment_mode === 'Cash').reduce((sum, r) => sum + r.total_amount, 0);
    const upi = todayReceipts.filter(r => r.payment_mode === 'UPI').reduce((sum, r) => sum + r.total_amount, 0);
    const bank = todayReceipts.filter(r => r.payment_mode === 'Bank Transfer' || r.payment_mode === 'Card').reduce((sum, r) => sum + r.total_amount, 0);
    const total = cash + upi + bank;

    const pendingCount = students.filter(s => s.fee_status === "Unpaid" || s.fee_status === "Partially Paid").length;

    return {
      totalCollectionToday: total,
      cashCollection: cash,
      upiCollection: upi,
      bankTransferCollection: bank,
      receiptsGenerated: todayReceipts.length,
      pendingFeeCount: pendingCount
    };
  },

  getRecentTransactions: async () => {
    await new Promise(resolve => setTimeout(resolve, 350));

    const receipts = getMockReceipts();
    const students = getMockStudents();

    // Sort by id descending (most recent first) and take top 10
    const sortedReceipts = [...receipts]
      .sort((a, b) => b.id - a.id)
      .slice(0, 10);

    return sortedReceipts.map(r => {
      const student = students.find(s => s.id === r.student_id);
      return {
        id: r.id,
        receipt_number: r.receipt_number,
        student_name: student ? student.student_name : 'Unknown Student',
        roll_number: student ? student.roll_number : '—',
        admission_number: student ? student.admission_number : '—',
        class_name: student ? student.class_name : '',
        section_name: student ? student.section_name : '',
        amount: r.total_amount,
        payment_mode: r.payment_mode,
        receipt_date: r.receipt_date
      };
    });
  }
};
