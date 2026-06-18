// Mock Receipts and Transactions database
import { getMockStudents } from "./feeStudents";
import { MOCK_FEE_STRUCTURES } from "./feeStructures";

let mockReceipts = [];
let mockTransactions = [];

let receiptCounter = 1000;
let transactionIdCounter = 1;

// Programmatically generate receipts and transaction breakdown logs for initial student list
const initializePaymentsData = () => {
  const students = getMockStudents();
  
  students.forEach(student => {
    if (student.amount_paid > 0) {
      const classStructure = MOCK_FEE_STRUCTURES.find(f => f.class_id === student.class_id);
      const receiptId = ++receiptCounter;
      const receiptNumber = `REC2026${receiptId}`;
      const receiptDate = new Date(student.created_at).toISOString().split('T')[0];
      
      // Compute numeric hash from student id string for safe modulus math
      const idHash = typeof student.id === 'string' 
        ? student.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) 
        : student.id;
      
      const paymentMode = idHash % 3 === 0 ? "UPI" : idHash % 4 === 0 ? "Bank Transfer" : "Cash";
      const reference = paymentMode === "Cash" ? null : `TXN${9876543 + idHash}`;

      // Create Receipt
      mockReceipts.push({
        id: receiptId,
        receipt_number: receiptNumber,
        student_id: student.id,
        receipt_date: receiptDate,
        total_amount: student.amount_paid,
        payment_mode: paymentMode,
        transaction_reference: reference,
        remarks: "Initial term fee collection",
        collected_by: idHash % 2 === 0 ? 2 : 3 // admin or user
      });

      // Create Transaction Breakdowns
      if (student.fee_status === "Paid" && classStructure) {
        // Fully paid student: has all breakdown entries
        classStructure.fees.forEach(fee => {
          mockTransactions.push({
            id: transactionIdCounter++,
            receipt_id: receiptId,
            student_id: student.id,
            fee_type_id: fee.fee_type_id,
            amount: fee.amount,
            academic_year_id: 2, // 2026-2027
            transaction_date: receiptDate
          });
        });
      } else if (student.fee_status === "Partially Paid" && classStructure) {
        // Partially paid student: has paid tuition fee + maybe some part of it
        const tuitionFee = classStructure.fees.find(f => f.fee_type_id === 1);
        const paidTuitionAmount = Math.min(student.amount_paid, tuitionFee.amount);
        
        mockTransactions.push({
          id: transactionIdCounter++,
          receipt_id: receiptId,
          student_id: student.id,
          fee_type_id: 1, // Tuition Fee
          amount: paidTuitionAmount,
          academic_year_id: 2,
          transaction_date: receiptDate
        });

        // If amount paid exceeds tuition, allocate remaining to transport
        const remaining = student.amount_paid - paidTuitionAmount;
        if (remaining > 0) {
          mockTransactions.push({
            id: transactionIdCounter++,
            receipt_id: receiptId,
            student_id: student.id,
            fee_type_id: 2, // Transport Fee
            amount: remaining,
            academic_year_id: 2,
            transaction_date: receiptDate
          });
        }
      }
    }
  });
};

// Initialize
initializePaymentsData();

export const getMockReceipts = () => mockReceipts;
export const getMockTransactions = () => mockTransactions;

export const generateReceiptNumber = () => {
  const nextNumber = mockReceipts.length + 1001;
  return `REC2026${nextNumber}`;
};

export const addMockPayment = (paymentData) => {
  const receiptId = mockReceipts.length + 1001;
  const receiptNumber = generateReceiptNumber();
  const receiptDate = paymentData.collection_date || new Date().toISOString().split('T')[0];

  const newReceipt = {
    id: receiptId,
    receipt_number: receiptNumber,
    student_id: paymentData.student_id,
    receipt_date: receiptDate,
    total_amount: paymentData.total_amount,
    payment_mode: paymentData.payment_mode,
    transaction_reference: paymentData.transaction_reference || null,
    remarks: paymentData.remarks || null,
    collected_by: Number(paymentData.collected_by)
  };

  mockReceipts.push(newReceipt);

  // Add individual transactions for breakdown
  paymentData.breakdown.forEach(item => {
    mockTransactions.push({
      id: transactionIdCounter++,
      receipt_id: receiptId,
      student_id: paymentData.student_id,
      fee_type_id: item.fee_type_id,
      amount: item.amount,
      academic_year_id: 2, // 2026-2027
      transaction_date: receiptDate
    });
  });

  return newReceipt;
};
