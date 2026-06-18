import { STUDENTS as academicStudents, STUDENT_LEDGER } from './academicMockData';
import { PARENTS as rawParents } from './mockData';
import { Student, Parent, StudentFullDetails, AttendanceRecord, MarkRecord, PaymentRecord } from '../types/student';

// Keep parents enriched from mockData
export const PARENTS: Parent[] = rawParents.map((p, idx) => {
  return {
    ...p,
    father_name: p.name === 'Demo' ? 'Mr. Rajesh Kumar' : `Mr. ${p.name} ${p.surname}`,
    mother_name: p.name === 'Demo' ? 'Mrs. Anita Kumar' : `Mrs. Sunita ${p.surname}`,
    guardian_name: p.name === 'Demo' ? 'Mr. Ramesh Prasad' : `Mr. ${p.name} ${p.surname}`,
    secondary_phone: `9898${String(100000 + idx).slice(1)}`
  };
});

// Expose active students list from academicMockData
export const STUDENTS: Student[] = academicStudents;

const BASELINE_SUBJECTS = [
  'Mathematics',
  'English Literature',
  'Physics',
  'Chemistry',
  'Biology',
  'History',
  'Computer Science',
  'Physical Education'
];

// Helper to generate baseline attendance records
const generateBaselineAttendance = (studentId: string): AttendanceRecord[] => {
  const records: AttendanceRecord[] = [];
  const baseDate = new Date('2026-06-01');
  
  // Generate 12 school days of attendance
  for (let i = 0; i < 12; i++) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + i);
    // Skip weekends
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    
    const dateStr = d.toISOString().split('T')[0];
    
    // Deterministic hash based on studentId and day offset
    const hash = (studentId.charCodeAt(studentId.length - 1) + i) % 15;
    let status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' = 'PRESENT';
    let remarks = 'Attended all sessions';
    
    if (hash === 3) {
      status = 'ABSENT';
      remarks = 'Sick leave - Parent submitted application';
    } else if (hash === 7) {
      status = 'LATE';
      remarks = 'Late school bus arrival';
    } else if (hash === 11) {
      status = 'HALF_DAY';
      remarks = 'Doctor appointment';
    }
    
    records.push({
      id: `att-${studentId}-${i}`,
      date: dateStr,
      status,
      remarks
    });
  }
  
  return records.sort((a, b) => b.date.localeCompare(a.date));
};

// Helper to generate baseline academic marks
const generateBaselineMarks = (studentId: string): MarkRecord[] => {
  const marks: MarkRecord[] = [];
  const exams = ['Midterm Exam', 'Quarterly Assessment', 'Final Exam'];
  
  BASELINE_SUBJECTS.forEach((subject, subIdx) => {
    exams.forEach((exam, examIdx) => {
      const seed = (studentId.charCodeAt(studentId.length - 1) + subIdx * 5 + examIdx * 7) % 35;
      const maxMarks = 100;
      const marksObtained = 65 + seed;
      const percentage = (marksObtained / maxMarks) * 100;
      
      let grade = 'B';
      if (percentage >= 95) grade = 'O';
      else if (percentage >= 90) grade = 'A+';
      else if (percentage >= 80) grade = 'A';
      else if (percentage >= 70) grade = 'B+';
      else if (percentage >= 60) grade = 'B';
      else if (percentage >= 50) grade = 'C';
      else grade = 'D';

      marks.push({
        id: `mrk-${studentId}-${subIdx}-${examIdx}`,
        subject,
        exam,
        marksObtained,
        maxMarks,
        percentage,
        grade
      });
    });
  });
  
  return marks;
};

// Live resolver compiling baseline + localStorage modifications
export const getStudentFullDetails = (studentId: string): StudentFullDetails => {
  const attendance = generateBaselineAttendance(studentId);
  const marks = generateBaselineMarks(studentId);

  // 1. Fetch live teacher attendance logs
  const rawAttendanceLogs = localStorage.getItem('erp_teacher_attendance_logs');
  if (rawAttendanceLogs) {
    try {
      const logs = JSON.parse(rawAttendanceLogs);
      if (Array.isArray(logs)) {
        logs.forEach((log: any) => {
          const studentRecord = log.records?.find((r: any) => r.studentId === studentId);
          if (studentRecord) {
            const dateStr = log.date;
            const existingIdx = attendance.findIndex(a => a.date === dateStr);
            
            const statusMap: Record<string, 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY'> = {
              'PRESENT': 'PRESENT',
              'ABSENT': 'ABSENT',
              'LATE': 'LATE',
              'HALF_DAY': 'HALF_DAY',
              'LEAVE': 'ABSENT'
            };
            
            const newRecord: AttendanceRecord = {
              id: `att-log-${log.id}-${studentId}`,
              date: dateStr,
              status: statusMap[studentRecord.status] || 'PRESENT',
              remarks: studentRecord.remarks || `Attendance captured by Teacher`
            };

            if (existingIdx >= 0) {
              attendance[existingIdx] = newRecord;
            } else {
              attendance.push(newRecord);
            }
          }
        });
      }
    } catch (e) {
      console.error('Error parsing erp_teacher_attendance_logs', e);
    }
  }

  // Sort attendance descending (latest first)
  attendance.sort((a, b) => b.date.localeCompare(a.date));

  // 2. Fetch live teacher exam marks (only published/non-draft marks)
  const rawMarksLedgers = localStorage.getItem('erp_teacher_exam_marks_ledgers');
  if (rawMarksLedgers) {
    try {
      const ledgers = JSON.parse(rawMarksLedgers);
      if (Array.isArray(ledgers)) {
        ledgers.forEach((ledger: any) => {
          if (ledger.isDraft) return; // Ignore unpublished marks drafts

          const studentRecord = ledger.records?.find((r: any) => r.studentId === studentId);
          if (studentRecord) {
            // Resolve subject name
            const rawSubjects = localStorage.getItem('erp_subjects');
            let subjectName = ledger.subjectId;
            if (rawSubjects) {
              try {
                const subs = JSON.parse(rawSubjects);
                const subObj = subs.find((s: any) => s.id === ledger.subjectId);
                if (subObj) subjectName = subObj.name;
              } catch {}
            }

            const examNames: Record<string, string> = {
              'mid': 'Midterm Exam',
              'final': 'Final Exam',
              'ct-1': 'Class Test 1',
              'ct-2': 'Class Test 2'
            };
            const resolvedExamName = examNames[ledger.examType] || ledger.examType;

            const newMark: MarkRecord = {
              id: `mrk-ledger-${ledger.id}-${studentId}`,
              subject: subjectName,
              exam: resolvedExamName,
              marksObtained: studentRecord.obtainedMarks,
              maxMarks: ledger.maxMarks,
              percentage: studentRecord.percentage,
              grade: studentRecord.grade
            };

            // Remove baseline placeholder for this subject + exam combo to ensure consistency
            const existingIdx = marks.findIndex(m => m.subject === subjectName && m.exam === resolvedExamName);
            if (existingIdx >= 0) {
              marks[existingIdx] = newMark;
            } else {
              marks.push(newMark);
            }
          }
        });
      }
    } catch (e) {
      console.error('Error parsing erp_teacher_exam_marks_ledgers', e);
    }
  }

  // Sort marks by subject and exam
  marks.sort((a, b) => a.subject.localeCompare(b.subject) || a.exam.localeCompare(b.exam));

  // 3. Fetch live fee summary and payments from academic state
  const ledgerObj = STUDENT_LEDGER[studentId] || {
    totalFee: 48000,
    paidAmount: 0,
    pendingAmount: 48000,
    overdueAmount: 0,
    payments: []
  };

  const feeSummary = {
    totalFee: ledgerObj.totalFee,
    paidAmount: ledgerObj.paidAmount,
    pendingAmount: ledgerObj.pendingAmount,
    overdueAmount: ledgerObj.overdueAmount
  };

  const payments: PaymentRecord[] = (ledgerObj.payments || []).map((p: any) => ({
    receiptNumber: p.receiptNumber || 'REC-TEMP',
    date: p.date || new Date().toISOString().split('T')[0],
    amount: p.amount,
    paymentMethod: p.paymentMethod || 'Cash',
    transactionId: p.transactionId || 'TXN-TEMP',
    status: p.status || 'PAID',
    upiProofUrl: p.upiProofUrl || null
  }));

  return {
    studentId,
    attendance,
    marks,
    feeSummary,
    payments
  };
};

// Expose a dynamic Proxy that intercepts accesses by studentId
export const STUDENT_DETAILS_MAP = new Proxy({} as Record<string, StudentFullDetails>, {
  get(target, studentId) {
    if (typeof studentId !== 'string') {
      return Reflect.get(target, studentId);
    }
    return getStudentFullDetails(studentId);
  },
  set(target, studentId, value) {
    if (typeof studentId === 'string') {
      target[studentId] = value;
    }
    return true;
  }
});
