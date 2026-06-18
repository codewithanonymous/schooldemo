// Fee Receipt Service utilizing Mock Data Layer
import { getMockReceipts, getMockTransactions } from "../../mock/fee/feeReceipts";
import { getMockStudents } from "../../mock/fee/feeStudents";
import { MOCK_FEE_TYPES } from "../../mock/fee/feeStructures";

let receiptConfig = {
  id: 1,
  school_name: "Greenwoods International School",
  school_address: "Sector 4, Gachibowli, Hyderabad, Telangana - 500032",
  school_phone: "+91 40 2345 6789",
  school_email: "finance@greenwoods.edu.in",
  authorized_signatory_name: "Fin. Officer / Principal",
  authorized_signatory_designation: "Accounts Department"
};

export const feeReceiptService = {
  getReceipts: async (filters = {}) => {
    await new Promise(resolve => setTimeout(resolve, 250));

    const receipts = getMockReceipts();
    const students = getMockStudents();

    return receipts.map(r => {
      const student = students.find(s => s.id === r.student_id);
      const collectorName = r.collected_by === 2 ? "Principal Office" : "Accounts Department";
      
      return {
        id: r.id,
        receipt_number: r.receipt_number,
        receipt_date: r.receipt_date,
        total_amount: r.total_amount,
        payment_mode: r.payment_mode,
        transaction_reference: r.transaction_reference,
        remarks: r.remarks,
        students: student ? {
          roll_number: student.roll_number,
          admission_number: student.admission_number,
          student_name: student.student_name,
          class_name: student.class_name,
          section_name: student.section_name,
          parent_name: student.parent_name
        } : null,
        users: { full_name: collectorName }
      };
    });
  },

  getReceiptDetails: async (receiptId) => {
    await new Promise(resolve => setTimeout(resolve, 200));

    const transactions = getMockTransactions();
    const studentReceiptTransactions = transactions.filter(t => t.receipt_id === receiptId);

    return studentReceiptTransactions.map(t => {
      const feeType = MOCK_FEE_TYPES.find(f => f.id === t.fee_type_id);
      return {
        id: t.id,
        amount: t.amount,
        fee_types: feeType ? { fee_name: feeType.fee_name } : null
      };
    });
  },

  getReceiptConfig: async () => {
    return receiptConfig;
  },

  updateReceiptConfig: async (newConfig) => {
    receiptConfig = { ...receiptConfig, ...newConfig };
    return receiptConfig;
  }
};
