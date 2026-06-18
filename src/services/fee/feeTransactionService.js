// Fee Transaction Service utilizing Mock Data Layer
import { getMockTransactions } from "../../mock/fee/feeTransactions";
import { getMockStudents } from "../../mock/fee/feeStudents";
import { getMockReceipts } from "../../mock/fee/feeReceipts";
import { MOCK_FEE_TYPES } from "../../mock/fee/feeStructures";

export const feeTransactionService = {
  getTransactions: async (filters = {}) => {
    await new Promise(resolve => setTimeout(resolve, 300));

    const transactions = getMockTransactions();
    const students = getMockStudents();
    const receipts = getMockReceipts();

    // Map and join tables
    const joinedTransactions = transactions.map(tx => {
      const student = students.find(s => s.id === tx.student_id);
      const receipt = receipts.find(r => r.id === tx.receipt_id);
      const feeType = MOCK_FEE_TYPES.find(f => f.id === tx.fee_type_id);
      
      const collectorName = receipt?.collected_by === 2 ? "Principal Office" : "Accounts Department";

      return {
        id: tx.id,
        amount: tx.amount,
        transaction_date: tx.transaction_date,
        receipts: receipt ? {
          receipt_number: receipt.receipt_number,
          payment_mode: receipt.payment_mode,
          total_amount: receipt.total_amount,
          collected_by: receipt.collected_by,
          users: { full_name: collectorName }
        } : null,
        students: student ? {
          roll_number: student.roll_number,
          admission_number: student.admission_number,
          student_name: student.student_name,
          class_name: student.class_name,
          section_name: student.section_name
        } : null,
        fee_types: feeType ? { fee_name: feeType.fee_name } : null,
        academic_years: { year_name: "2026-2027" }
      };
    });

    // Apply date range filters if present
    const { startDate, endDate } = filters;
    return joinedTransactions.filter(tx => {
      if (!tx.transaction_date) return false;
      const txDate = new Date(tx.transaction_date);
      
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0,0,0,0);
        if (txDate < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23,59,59,999);
        if (txDate > end) return false;
      }
      return true;
    });
  }
};
