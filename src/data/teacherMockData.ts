import { STUDENTS, TEACHER_ASSIGNMENTS, SUBJECTS, CLASSES, SECTIONS } from './academicMockData';
import { TEACHERS } from './mockData';
import { TimetableEvent, TeacherAttendanceLog, TeacherExamMarksLedger } from '../types/teacher';

// --- Local Storage Hooks ---
const loadJSON = <T>(key: string, def: T): T => {
  const d = localStorage.getItem(key);
  if (!d) return def;
  try { return JSON.parse(d) as T; } catch { return def; }
};

const saveJSON = (key: string, val: any) => {
  localStorage.setItem(key, JSON.stringify(val));
};

// Teacher Profile Context: Ravi Kumar (ID: usr-teacher-001)
export let CURRENT_TEACHER_ID = 'usr-teacher-001';

export const syncCurrentTeacherId = () => {
  try {
    const stored = localStorage.getItem('school_portal_user');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.role === 'teacher') {
        CURRENT_TEACHER_ID = parsed.id;
        return;
      }
    }
  } catch {}
  CURRENT_TEACHER_ID = 'usr-teacher-001';
};

// Immediately invoke on import
syncCurrentTeacherId();

export const getTeacherProfile = () => {
  syncCurrentTeacherId();
  return TEACHERS.find(t => t.id === CURRENT_TEACHER_ID) || {
    id: CURRENT_TEACHER_ID,
    name: 'Ravi',
    surname: 'Kumar',
    email: 'teacher@example.com',
    phone: '9876543210'
  };
};

// --- Timetable Mappings ---
export const getWeeklyTimetable = (): TimetableEvent[] => {
  syncCurrentTeacherId();
  const base = new Date();
  // Set to Monday of the current week
  const day = base.getDay();
  const diff = base.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(base);
  monday.setDate(diff);
  monday.setHours(8, 30, 0, 0);

  const myAssignments = TEACHER_ASSIGNMENTS.filter(a => a.teacher_id === CURRENT_TEACHER_ID);

  // Unique subject+class+section combos
  const uniqueSlots = Array.from(
    new Map(
      myAssignments.map(a => [`${a.class_id}::${a.section_id}::${a.subject_id}`, a])
    ).values()
  );

  const events: TimetableEvent[] = [];
  const days = [0, 1, 2, 3, 4]; // Mon–Fri

  // Assign each unique slot to a time slot in the week (round-robin across days)
  uniqueSlots.forEach((asg, slotIdx) => {
    const subjectName = SUBJECTS.find(s => s.id === asg.subject_id)?.name ?? 'Lesson';
    const className = CLASSES.find(c => c.id === asg.class_id)?.name ?? asg.class_id;
    const sectionCode = SECTIONS.find(s => s.id === asg.section_id)?.code ?? asg.section_id;

    // Spread across all 5 days for subjects with multiple weekly periods
    const scheduledDays = slotIdx < 5 ? [days[slotIdx % 5]] : [days[slotIdx % 5], days[(slotIdx + 2) % 5]];

    scheduledDays.forEach((dOffset, periodIdx) => {
      const startHour = 8 + (slotIdx % 5) + periodIdx; // Stagger hour per subject
      const start = new Date(monday);
      start.setDate(monday.getDate() + dOffset);
      start.setHours(startHour + 1, 0, 0, 0);
      const end = new Date(start);
      end.setHours(start.getHours() + 1);

      events.push({
        id: `tt-${asg.subject_id}-${dOffset}-${periodIdx}`,
        title: `${subjectName} (${className} / ${sectionCode})`,
        classId: asg.class_id,
        sectionId: asg.section_id,
        subjectId: asg.subject_id,
        start,
        end
      });
    });
  });

  // Sort by start time
  return events.sort((a, b) => a.start.getTime() - b.start.getTime());
};


// --- Attendance State Management ---
export const getAttendanceLogs = (): TeacherAttendanceLog[] => {
  return loadJSON<TeacherAttendanceLog[]>('erp_teacher_attendance_logs', []);
};

export const saveAttendanceLog = (log: Omit<TeacherAttendanceLog, 'id'>) => {
  const logs = getAttendanceLogs();
  const existingIndex = logs.findIndex(l => 
    l.date === log.date && 
    l.classId === log.classId && 
    l.sectionId === log.sectionId
  );
  
  const savedLog: TeacherAttendanceLog = {
    ...log,
    id: existingIndex >= 0 ? logs[existingIndex].id : `att-log-${Date.now().toString().slice(-6)}`
  };
  
  if (existingIndex >= 0) {
    logs[existingIndex] = savedLog;
  } else {
    logs.push(savedLog);
  }
  
  saveJSON('erp_teacher_attendance_logs', logs);
  return savedLog;
};

// --- Marks State Management ---
export const getExamMarksLedgers = (): TeacherExamMarksLedger[] => {
  // Return stored ledgers or default seeded ones
  return loadJSON<TeacherExamMarksLedger[]>('erp_teacher_exam_marks_ledgers', []);
};

export const saveExamMarksLedger = (ledger: Omit<TeacherExamMarksLedger, 'id' | 'lastUpdated'>) => {
  const ledgers = getExamMarksLedgers();
  const existingIndex = ledgers.findIndex(l => 
    l.classId === ledger.classId && 
    l.sectionId === ledger.sectionId && 
    l.subjectId === ledger.subjectId && 
    l.examType === ledger.examType
  );
  
  const savedLedger: TeacherExamMarksLedger = {
    ...ledger,
    id: existingIndex >= 0 ? ledgers[existingIndex].id : `mrk-ledger-${Date.now().toString().slice(-6)}`,
    lastUpdated: new Date().toISOString()
  };
  
  if (existingIndex >= 0) {
    ledgers[existingIndex] = savedLedger;
  } else {
    ledgers.push(savedLedger);
  }
  
  saveJSON('erp_teacher_exam_marks_ledgers', ledgers);
  return savedLedger;
};

// Helper grade mapping
export const calculateGradeAndPass = (obtained: number, max: number) => {
  if (max <= 0) return { percentage: 0, grade: 'F', passed: false };
  const percentage = Math.round((obtained / max) * 100);
  let grade = 'F';
  let passed = true;
  
  if (percentage >= 90) grade = 'A+';
  else if (percentage >= 80) grade = 'A';
  else if (percentage >= 70) grade = 'B+';
  else if (percentage >= 60) grade = 'B';
  else if (percentage >= 50) grade = 'C';
  else if (percentage >= 40) grade = 'D';
  else {
    grade = 'F';
    passed = false;
  }
  
  return { percentage, grade, passed };
};

// --- Teacher Dashboard Stats Helper ---
export const getTeacherStats = () => {
  syncCurrentTeacherId();
  const myAssignments = TEACHER_ASSIGNMENTS.filter(a => a.teacher_id === CURRENT_TEACHER_ID);
  
  // Total students under this teacher
  const uniqueClassSectionKeys = Array.from(new Set(myAssignments.map(a => `${a.class_id}-${a.section_id}`)));
  const myStudents = STUDENTS.filter(s => 
    uniqueClassSectionKeys.includes(`${s.class_id}-${s.grade_id}`) && s.status === 'ACTIVE'
  );
  
  // Timetable events
  const timetable = getWeeklyTimetable();
  
  // Pending marks entries count (seeded exams for which marks aren't completely entered)
  const examLedgers = getExamMarksLedgers();
  const completedMarksCount = examLedgers.filter(l => !l.isDraft).length;
  // Let's assume we have 3 scheduled exam types (Class Test 1, Midterm, Finals) for each assignment
  const totalExpectedMarksLedgers = myAssignments.length * 3;
  const pendingMarksCount = Math.max(0, totalExpectedMarksLedgers - completedMarksCount);
  
  // Today's attendance percentage logged
  const logs = getAttendanceLogs();
  const todayStr = new Date().toISOString().split('T')[0];
  const todayLogs = logs.filter(l => l.date === todayStr);
  const loggedAttendanceCount = todayLogs.reduce((sum, l) => sum + l.records.length, 0);
  const presentCount = todayLogs.reduce((sum, l) => 
    sum + l.records.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length, 0
  );
  const todayAttendanceRate = loggedAttendanceCount > 0 
    ? Math.round((presentCount / loggedAttendanceCount) * 100) 
    : 94; // fallback seed default
    
  return {
    assignedClassesCount: uniqueClassSectionKeys.length,
    studentsCount: myStudents.length,
    timetableCount: timetable.length,
    pendingMarksCount,
    todayAttendanceRate
  };
};
