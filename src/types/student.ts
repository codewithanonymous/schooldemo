export interface Student {
  id: string;
  username: string;
  name: string;
  surname: string;
  email: string | null;
  phone: string | null;
  address: string;
  blood_type: string;
  sex: 'MALE' | 'FEMALE';
  birthday: string;
  class_id: string;
  parent_id: string;
  roll_number: string;
  admission_number: string;
  admission_date: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  grade_id?: string;
}

export interface Parent {
  id: string;
  username: string;
  name: string;
  surname: string;
  email: string | null;
  phone: string;
  address: string;
  father_name: string;
  mother_name: string;
  guardian_name: string;
  secondary_phone: string;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY';
  remarks: string;
}

export interface MarkRecord {
  id: string;
  subject: string;
  exam: string;
  marksObtained: number;
  maxMarks: number;
  percentage: number;
  grade: string;
}

export interface FeeSummary {
  totalFee: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
}

export interface PaymentRecord {
  receiptNumber: string;
  date: string;
  amount: number;
  paymentMethod: string;
  transactionId: string;
  status: 'PAID' | 'PENDING' | 'FAILED';
  upiProofUrl?: string | null;
}

export interface StudentFullDetails {
  studentId: string;
  attendance: AttendanceRecord[];
  marks: MarkRecord[];
  feeSummary: FeeSummary;
  payments: PaymentRecord[];
}
