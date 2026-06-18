export interface StaffMember {
  id: string;
  username: string;
  password?: string;
  employee_id?: string;
  name: string;
  surname: string;
  email: string | null;
  phone: string | null;
  address: string;
  blood_type: string;
  sex: 'MALE' | 'FEMALE';
  birthday: string;
  designation: string;
  department: string;
  role: string;
  joining_date: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';
  teacher_subjects: { subject_id: string }[];
  monthlySalary: number;
}

export interface StaffAttendanceRecord {
  id: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'LEAVE';
  remarks: string;
}

export interface LeaveSummary {
  totalBalance: number;
  used: number;
  remaining: number;
}

export interface LeaveRecord {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  approvedBy: string;
}

export interface PerformanceRecord {
  assignedClasses: string[];
  assignedSubjects: string[];
  totalStudents: number;
  notes: string;
}

export interface StaffFullDetails {
  staffId: string;
  attendance: StaffAttendanceRecord[];
  leaveSummary: LeaveSummary;
  leaveHistory: LeaveRecord[];
  performance: PerformanceRecord;
}
