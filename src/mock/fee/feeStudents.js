// Unified mock student fee database layer linked to academic mock data
import { STUDENTS, STUDENT_LEDGER, CLASSES, SECTIONS, FEE_STRUCTURES, saveAcademicState } from "../../data/academicMockData";
import { STUDENT_DETAILS_MAP, PARENTS } from "../../data/studentDetailsMockData";

// Dynamically map main ERP students list to the format expected by the Fee Management module
export const getMockStudents = () => {
  return STUDENTS.map(s => {
    const classObj = CLASSES.find(c => c.id === s.class_id);
    const secObj = SECTIONS.find(sec => sec.id === s.grade_id);
    const ledger = STUDENT_LEDGER[s.id] || { totalFee: 0, paidAmount: 0, pendingAmount: 0 };
    
    // Resolve parent details
    const parent = PARENTS.find(p => p.id === s.parent_id);
    const parentName = parent ? (parent.father_name || `${parent.name} ${parent.surname}`) : 'Parent Name';
    const parentPhone = parent ? (parent.phone || parent.secondary_phone || '9848010000') : '9848010000';
    
    // Parse class level to number (c-4 -> 4)
    const classNum = classObj ? parseInt(classObj.id.replace('c-', '')) || 1 : 1;

    return {
      id: s.id, // String ID matches the unified system
      student_name: `${s.name} ${s.surname}`,
      admission_number: s.admission_number,
      roll_number: s.roll_number,
      class_id: classNum,
      class_name: classObj ? classObj.name : 'Class 1',
      section_name: secObj ? secObj.name : 'A',
      parent_name: parentName,
      parent_phone: parentPhone,
      total_fee_amount: ledger.totalFee,
      amount_paid: ledger.paidAmount,
      due_amount: ledger.pendingAmount,
      fee_status: ledger.totalFee === 0 
        ? "Not Assigned" 
        : ledger.pendingAmount === 0 
          ? "Paid" 
          : ledger.paidAmount > 0 
            ? "Partially Paid" 
            : "Unpaid",
      academic_year: "2025-2026",
      created_at: s.admission_date || new Date().toISOString()
    };
  });
};

// Update student fees when payment is collected
export const updateMockStudentFees = (studentId, amountPayingNow) => {
  const ledger = STUDENT_LEDGER[studentId];
  if (ledger) {
    ledger.paidAmount = (ledger.paidAmount || 0) + Number(amountPayingNow);
    ledger.pendingAmount = Math.max(0, ledger.totalFee - ledger.paidAmount);
    ledger.overdueAmount = ledger.pendingAmount > 0 ? Math.round(ledger.pendingAmount * 0.2) : 0;
    
    // Add the payment transaction log
    if (!ledger.payments) ledger.payments = [];
    ledger.payments.push({
      receiptNumber: `REC-2026-${String(Date.now()).slice(-6)}`,
      date: new Date().toISOString().split('T')[0],
      amount: Number(amountPayingNow),
      paymentMethod: 'UPI (GPay)',
      transactionId: `TXN${987654321 + Math.floor(Math.random() * 10000)}`,
      status: 'PAID',
      upiProofUrl: null
    });
    
    // Synchronize with STUDENT_DETAILS_MAP for student/parent view
    const details = STUDENT_DETAILS_MAP[studentId];
    if (details) {
      details.feeSummary = {
        totalFee: ledger.totalFee,
        paidAmount: ledger.paidAmount,
        pendingAmount: ledger.pendingAmount,
        overdueAmount: ledger.overdueAmount
      };
      if (!details.payments) details.payments = [];
      details.payments.push({
        receiptNumber: `REC-2026-${String(Date.now()).slice(-6)}`,
        date: new Date().toISOString().split('T')[0],
        amount: Number(amountPayingNow),
        paymentMethod: 'UPI (GPay)',
        transactionId: `TXN${987654321 + Math.floor(Math.random() * 10000)}`,
        status: 'PAID',
        upiProofUrl: null
      });
    }

    saveAcademicState();
  }
  
  return getMockStudents().find(s => String(s.id) === String(studentId));
};

// Assign custom total fee to a student
export const assignMockStudentFees = (studentId, totalFeeAmount, className, sectionName, academicYear) => {
  const ledger = STUDENT_LEDGER[studentId];
  if (ledger) {
    ledger.totalFee = Number(totalFeeAmount);
    ledger.pendingAmount = Math.max(0, ledger.totalFee - (ledger.paidAmount || 0));
    ledger.overdueAmount = ledger.pendingAmount > 0 ? Math.round(ledger.pendingAmount * 0.2) : 0;

    // Synchronize with details map
    const details = STUDENT_DETAILS_MAP[studentId];
    if (details) {
      details.feeSummary.totalFee = ledger.totalFee;
      details.feeSummary.pendingAmount = ledger.pendingAmount;
      details.feeSummary.overdueAmount = ledger.overdueAmount;
    }

    saveAcademicState();
  }
  return getMockStudents().find(s => String(s.id) === String(studentId));
};

// Add a student from the fee module page
export const addMockStudent = (studentData) => {
  const nextIndex = STUDENTS.length + 1;
  const admNum = "ADM2026" + String(nextIndex).padStart(3, "0");
  const birthday = "2015-06-01"; 
  const password = studentData.student_name.split(' ')[0] + "01062015";
  
  const nameParts = studentData.student_name.trim().split(/\s+/);
  const name = nameParts[0] || 'Student';
  const surname = nameParts.slice(1).join(' ') || 'Name';

  const classNum = studentData.class_name ? parseInt(studentData.class_name.replace(/[^0-9]/g, '')) || 1 : 1;
  const classId = `c-${classNum}`;
  const sectionId = `sec-${classNum}${studentData.section_name ? studentData.section_name.toLowerCase() : 'a'}`;

  const newStudent = {
    id: `std-${2000 + nextIndex}`,
    username: admNum,
    password: password,
    name: name,
    surname: surname,
    email: `${name.toLowerCase()}.${surname.toLowerCase()}@school.com`,
    phone: null,
    address: "School Campus, Hyderabad",
    blood_type: "O+",
    sex: "MALE",
    birthday: birthday,
    class_id: classId,
    parent_id: "usr-parent-001", // Demo Parent
    roll_number: studentData.roll_number || String(nextIndex).padStart(2, "0"),
    admission_number: admNum,
    admission_date: new Date().toISOString().split('T')[0],
    status: 'ACTIVE',
    grade_id: sectionId
  };

  STUDENTS.push(newStudent);

  // Initialize ledger
  const classFees = FEE_STRUCTURES.filter(f => f.class_id === classId);
  const totalFee = classFees.reduce((sum, f) => sum + f.amount, 0);

  STUDENT_LEDGER[newStudent.id] = {
    studentId: newStudent.id,
    totalFee,
    paidAmount: 0,
    pendingAmount: totalFee,
    overdueAmount: 0,
    payments: []
  };

  // Initialize details map
  STUDENT_DETAILS_MAP[newStudent.id] = {
    studentId: newStudent.id,
    attendance: [],
    marks: [],
    feeSummary: { totalFee, paidAmount: 0, pendingAmount: totalFee, overdueAmount: 0 },
    payments: []
  };

  saveAcademicState();

  return getMockStudents().find(s => s.id === newStudent.id);
};
