export interface AcademicYear {
  id: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface AcademicClass {
  id: string;
  name: string;
  code: string;
  academic_year_id: string;
  description: string;
  status: 'ACTIVE' | 'ARCHIVED';
}

export interface AcademicSection {
  id: string;
  class_id: string;
  name: string;
  code: string;
  supervisor_id: string | null;
  capacity: number;
}

export interface TeacherAssignment {
  id: string;
  teacher_id: string;
  class_id: string;
  section_id: string;
  subject_id: string;
}

export interface FeeItem {
  id: string;
  name: string;
  amount: number;
  class_id: string;
}

export interface StudentFeeLedger {
  studentId: string;
  totalFee: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  payments: {
    receiptNumber: string;
    date: string;
    amount: number;
    paymentMethod: string;
    transactionId: string;
    status: 'PAID' | 'PENDING' | 'FAILED';
  }[];
}
