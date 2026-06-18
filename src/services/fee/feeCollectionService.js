// Fee Collection Service using Mock Data Layer
import { getMockStudents, updateMockStudentFees, addMockStudent, assignMockStudentFees } from "../../mock/fee/feeStudents";
import { addMockPayment, generateReceiptNumber } from "../../mock/fee/feeReceipts";
import { MOCK_FEE_TYPES } from "../../mock/fee/feeStructures";

const MOCK_COLLECTORS = [
  { id: 2, username: "admin", full_name: "Principal Office", role: "admin", is_active: true },
  { id: 3, username: "accountant", full_name: "Accounts Department", role: "staff", is_active: true }
];

export const feeCollectionService = {
  getStudents: async () => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return getMockStudents();
  },

  getFeeTypes: async () => {
    return MOCK_FEE_TYPES;
  },

  getCollectors: async () => {
    return MOCK_COLLECTORS;
  },

  recordPayment: async (paymentDetails) => {
    await new Promise(resolve => setTimeout(resolve, 600));

    // Validate inputs
    const { student_id, total_amount, payment_mode, breakdown, collected_by } = paymentDetails;
    if (!student_id || !total_amount || total_amount <= 0) {
      throw new Error("Invalid student id or payment amount.");
    }
    if (!breakdown || breakdown.length === 0) {
      throw new Error("Payment breakdown is required.");
    }

    // 1. Record the receipt and transactions in the mock payment database
    const newReceipt = addMockPayment(paymentDetails);

    // 2. Update the student's fees profile (amount paid, due balance, and status)
    const updatedStudent = updateMockStudentFees(student_id, Number(total_amount));

    return {
      success: true,
      receipt_number: newReceipt.receipt_number,
      receipt: newReceipt,
      student: updatedStudent
    };
  },

  assignFees: async (studentId, feeDetails) => {
    await new Promise(resolve => setTimeout(resolve, 400));
    const { total_fee_amount, class_name, section_name, academic_year } = feeDetails;
    const updatedStudent = assignMockStudentFees(
      studentId,
      Number(total_fee_amount),
      class_name,
      section_name,
      academic_year
    );
    return updatedStudent;
  },

  addStudent: async (studentData) => {
    await new Promise(resolve => setTimeout(resolve, 400));
    const newStudent = addMockStudent(studentData);
    return newStudent;
  }
};
