export interface TimetableEvent {
  id: string;
  title: string;
  classId: string;
  sectionId: string;
  subjectId: string;
  start: Date;
  end: Date;
}

export interface AttendanceRecordInput {
  studentId: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'LEAVE';
  remarks?: string;
}

export interface TeacherAttendanceLog {
  id: string;
  date: string; // YYYY-MM-DD
  classId: string;
  sectionId: string;
  records: AttendanceRecordInput[];
  submittedBy: string; // teacher_id
}

export interface StudentMarksInput {
  studentId: string;
  obtainedMarks: number;
  grade: string;
  percentage: number;
  passed: boolean;
}

export interface TeacherExamMarksLedger {
  id: string;
  classId: string;
  sectionId: string;
  subjectId: string;
  examType: string; // 'Midterm', 'Final', etc.
  maxMarks: number;
  records: StudentMarksInput[];
  isDraft: boolean;
  lastUpdated: string;
}
