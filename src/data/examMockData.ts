import { STUDENTS } from './academicMockData';

export interface Exam {
  id: string;
  academicYearId: string;
  name: string;
  examType: 'Unit Test' | 'Monthly Test' | 'Quarterly Exam' | 'Half Yearly Exam' | 'Pre-Final Exam' | 'Annual Exam';
  classId: string;
  sectionId: string;
  subjectId: string;
  examDate: string; // YYYY-MM-DD
  maxMarks: number;
  passingMarks: number;
  description: string;
  status: 'Draft' | 'Published' | 'Completed' | 'Archived';
}

export interface StudentExamMark {
  studentId: string;
  obtainedMarks: number;
  percentage: number;
  grade: string;
  passed: boolean;
  remarks?: string;
}

export interface ExamMarksRecord {
  examId: string;
  marks: Record<string, StudentExamMark>; // studentId -> mark details
  isDraft: boolean; // true = Saved Draft, false = Submitted/Finalized
  submittedBy: string; // teacherId/adminId
  submittedAt: string;
}

// Default Seed Exams
const defaultExams: Exam[] = [
  {
    id: 'ex-001',
    academicYearId: 'ay-2026',
    name: 'Quarterly Mathematics Exam',
    examType: 'Quarterly Exam',
    classId: 'c-4',
    sectionId: 'sec-4a',
    subjectId: 's1',
    examDate: '2026-06-10',
    maxMarks: 100,
    passingMarks: 35,
    description: 'Term 1 main mathematics assessment covering Algebra, Geometry and Trigonometry.',
    status: 'Completed'
  },
  {
    id: 'ex-002',
    academicYearId: 'ay-2026',
    name: 'Unit Test 1 - English Literature',
    examType: 'Unit Test',
    classId: 'c-4',
    sectionId: 'sec-4a',
    subjectId: 's2',
    examDate: '2026-06-12',
    maxMarks: 50,
    passingMarks: 18,
    description: 'Unit assessment on Shakespeare plays and modern grammar concepts.',
    status: 'Completed'
  },
  {
    id: 'ex-003',
    academicYearId: 'ay-2026',
    name: 'Half Yearly Physics Lab & Theory',
    examType: 'Half Yearly Exam',
    classId: 'c-4',
    sectionId: 'sec-4a',
    subjectId: 's3',
    examDate: '2026-06-15',
    maxMarks: 100,
    passingMarks: 35,
    description: 'Comprehensive evaluation covering Optics, Electromagnetism and Kinematics.',
    status: 'Published'
  },
  {
    id: 'ex-004',
    academicYearId: 'ay-2026',
    name: 'Monthly Test - Computer Science Fundamentals',
    examType: 'Monthly Test',
    classId: 'c-4',
    sectionId: 'sec-4a',
    subjectId: 's7',
    examDate: '2026-06-25',
    maxMarks: 25,
    passingMarks: 9,
    description: 'Class review on algorithms and loop structures.',
    status: 'Draft'
  },
  {
    id: 'ex-005',
    academicYearId: 'ay-2026',
    name: 'Pre-Final Chemistry Board Prep',
    examType: 'Pre-Final Exam',
    classId: 'c-5',
    sectionId: 'sec-5a',
    subjectId: 's4',
    examDate: '2026-06-16',
    maxMarks: 100,
    passingMarks: 40,
    description: 'Final preparatory mock exam for Chemistry board papers.',
    status: 'Published'
  }
];

// Helper to determine Grade from percentage
export const calculateGrade = (percentage: number): string => {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 40) return 'D';
  return 'F';
};

// Seed Marks Records
const defaultExamMarks: Record<string, ExamMarksRecord> = {};

// 1. Seed marks for ex-001 (Quarterly Mathematics Exam - Class 4A)
const mathMarks: Record<string, StudentExamMark> = {};
const mathScores: Record<string, number> = {
  'usr-student-001': 88, // Demo Student
  'std-002': 94,         // Ashwini Joshi
  'std-003': 72,         // Varun Patel
  'std-004': 68,         // Divya Nair (if in 3a, wait, let's assign marks for all 4a students)
  'std-005': 81,         // Rahul Desai
  'std-006': 30,         // Sneha Sharma (under passing mark 35 - fails)
  'std-007': 58,
  'std-008': 77,
  'std-009': 85,
  'std-010': 91
};

STUDENTS.forEach(student => {
  if (student.class_id === 'c-4' && student.grade_id === 'sec-4a') {
    const obtained = mathScores[student.id] || (70 + (student.id.charCodeAt(student.id.length - 1) % 25));
    const pct = Math.round((obtained / 100) * 100);
    const passed = obtained >= 35;
    mathMarks[student.id] = {
      studentId: student.id,
      obtainedMarks: obtained,
      percentage: pct,
      grade: calculateGrade(pct),
      passed,
      remarks: passed ? 'Good performance' : 'Needs counseling and remedial classes'
    };
  }
});

defaultExamMarks['ex-001'] = {
  examId: 'ex-001',
  marks: mathMarks,
  isDraft: false,
  submittedBy: 'usr-teacher-001',
  submittedAt: '2026-06-11T14:30:00Z'
};

// 2. Seed marks for ex-002 (Unit Test 1 - English - Class 4A)
const englishMarks: Record<string, StudentExamMark> = {};
const englishScores: Record<string, number> = {
  'usr-student-001': 42, // Demo Student (out of 50)
  'std-002': 47,
  'std-003': 35,
  'std-005': 39,
  'std-006': 16, // Under passing mark 18
  'std-007': 28
};

STUDENTS.forEach(student => {
  if (student.class_id === 'c-4' && student.grade_id === 'sec-4a') {
    const obtained = englishScores[student.id] || (30 + (student.id.charCodeAt(student.id.length - 1) % 15));
    const pct = Math.round((obtained / 50) * 100);
    const passed = obtained >= 18;
    englishMarks[student.id] = {
      studentId: student.id,
      obtainedMarks: obtained,
      percentage: pct,
      grade: calculateGrade(pct),
      passed,
      remarks: passed ? 'Satisfactory vocabulary' : 'Requires reading reinforcement'
    };
  }
});

defaultExamMarks['ex-002'] = {
  examId: 'ex-002',
  marks: englishMarks,
  isDraft: false,
  submittedBy: 'tch-002', // Priya Singh
  submittedAt: '2026-06-13T10:15:00Z'
};

// 3. Seed some draft marks for ex-003 (Physics Half Yearly - Draft/In Progress)
const physicsMarks: Record<string, StudentExamMark> = {};
STUDENTS.forEach(student => {
  if (student.class_id === 'c-4' && student.grade_id === 'sec-4a') {
    // Only entry for Demo Student and Ashwini in draft
    if (student.id === 'usr-student-001' || student.id === 'std-002') {
      const obtained = student.id === 'usr-student-001' ? 78 : 91;
      const pct = Math.round((obtained / 100) * 100);
      physicsMarks[student.id] = {
        studentId: student.id,
        obtainedMarks: obtained,
        percentage: pct,
        grade: calculateGrade(pct),
        passed: obtained >= 35,
        remarks: 'Draft entry'
      };
    }
  }
});

defaultExamMarks['ex-003'] = {
  examId: 'ex-003',
  marks: physicsMarks,
  isDraft: true,
  submittedBy: 'tch-003', // Anand Rao
  submittedAt: '2026-06-15T16:00:00Z'
};

// --- Local Storage Helpers ---
const loadFromStorage = <T>(key: string, defaultValue: T): T => {
  const data = localStorage.getItem(key);
  if (data) {
    try {
      return JSON.parse(data) as T;
    } catch (e) {
      console.error(`Error parsing localStorage key: ${key}`, e);
    }
  }
  return defaultValue;
};

const saveToStorage = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
};

export let EXAMS: Exam[] = loadFromStorage('erp_exams', defaultExams);
export let EXAM_MARKS: Record<string, ExamMarksRecord> = loadFromStorage('erp_exam_marks', defaultExamMarks);

export const saveExamsState = () => {
  saveToStorage('erp_exams', EXAMS);
  saveToStorage('erp_exam_marks', EXAM_MARKS);
};

// --- CRUD Helpers ---
export const createExam = (exam: Omit<Exam, 'id'>) => {
  const newExam: Exam = { ...exam, id: `ex-${Date.now().toString().slice(-6)}` };
  EXAMS.unshift(newExam);
  saveExamsState();
  return newExam;
};

export const updateExam = (id: string, updates: Partial<Exam>) => {
  EXAMS = EXAMS.map(e => e.id === id ? { ...e, ...updates } : e);
  saveExamsState();
};

export const deleteExam = (id: string) => {
  EXAMS = EXAMS.filter(e => e.id !== id);
  delete EXAM_MARKS[id];
  saveExamsState();
};

export const saveMarksRecord = (examId: string, record: Omit<ExamMarksRecord, 'examId'>) => {
  EXAM_MARKS[examId] = {
    ...record,
    examId
  };
  saveExamsState();
};
