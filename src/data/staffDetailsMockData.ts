import { TEACHERS as rawTeachers, SUBJECTS, CLASSES, STUDENTS } from './mockData';
import { StaffMember, StaffFullDetails, StaffAttendanceRecord, LeaveRecord, LeaveSummary, PerformanceRecord } from '../types/staff';

// Helper to resolve salary by designation
const getMonthlySalaryByDesignation = (designation: string): number => {
  if (designation === 'Head of Department (HOD)') return 75000;
  if (designation === 'Senior Secondary Teacher' || designation === 'Senior Language Specialist') return 60000;
  if (designation === 'Secondary Grade Teacher' || designation === 'Physical Education Trainer') return 50000;
  if (designation === 'Assistant Teacher') return 35000;
  if (designation === 'Chief Accountant') return 65000;
  if (designation === 'Senior Librarian') return 48000;
  if (designation === 'IT Systems Administrator') return 55000;
  if (designation === 'Registrar') return 52000;
  return 45000;
};

// 1. Programmatically Enrich Teachers into Academic Staff Members
const TEACHING_STAFF: StaffMember[] = rawTeachers.map((t, idx) => {
  // Determine department based on subject_ids
  const subIds = (t.teacher_subjects ?? []).map(ts => ts.subject_id);
  let department = 'General Education';
  if (subIds.includes('s1') || subIds.includes('s7')) {
    department = 'Mathematics & Computer Science';
  } else if (subIds.includes('s3') || subIds.includes('s4') || subIds.includes('s5')) {
    department = 'Sciences';
  } else if (subIds.includes('s2') || subIds.includes('s6')) {
    department = 'Languages & Humanities';
  } else if (subIds.includes('s8')) {
    department = 'Physical Education';
  }

  // Determine designation
  let designation = 'Secondary Grade Teacher';
  if (idx === 0) {
    designation = 'Head of Department (HOD)';
  } else if (idx === 1 || idx === 2) {
    designation = 'Senior Secondary Teacher';
  } else if (idx === 9) {
    designation = 'Senior Language Specialist';
  } else if (idx === 5) {
    designation = 'Physical Education Trainer';
  } else if (idx === 6 || idx === 7) {
    designation = 'Assistant Teacher';
  }

  // Determine Status
  let status: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' = 'ACTIVE';
  if (idx === 4) {
    status = 'ON_LEAVE';
  } else if (idx === 6) {
    status = 'INACTIVE';
  }

  // Join date between 2020 and 2024
  const joinYear = 2020 + (idx % 5);
  const joinMonth = String(1 + (idx % 12)).padStart(2, '0');
  const joinDay = String(5 + (idx % 20)).padStart(2, '0');

  return {
    ...t,
    sex: t.sex as 'MALE' | 'FEMALE',
    designation,
    department,
    role: idx === 0 ? 'Advisory Staff' : 'Academic Staff',
    joining_date: `${joinYear}-${joinMonth}-${joinDay}`,
    status,
    teacher_subjects: t.teacher_subjects ?? [],
    monthlySalary: getMonthlySalaryByDesignation(designation)
  };
});

// 2. Define Non-Teaching Staff members
const NON_TEACHING_STAFF: StaffMember[] = [
  {
    id: 'stf-nt-001',
    username: 'rkumar_fin',
    name: 'Ramesh',
    surname: 'Prasad',
    email: 'r.prasad@school.com',
    phone: '9876540001',
    address: '42 Gachibowli, Hyderabad',
    blood_type: 'O+',
    sex: 'MALE',
    birthday: '1980-05-15',
    designation: 'Chief Accountant',
    department: 'Finance & Accounts',
    role: 'Administrative Staff',
    joining_date: '2019-03-10',
    status: 'ACTIVE',
    teacher_subjects: [],
    monthlySalary: 65000
  },
  {
    id: 'stf-nt-002',
    username: 'ssharma_lib',
    name: 'Sunita',
    surname: 'Sharma',
    email: 's.sharma@school.com',
    phone: '9876540002',
    address: '18 Jubilee Hills, Hyderabad',
    blood_type: 'A+',
    sex: 'FEMALE',
    birthday: '1987-11-20',
    designation: 'Senior Librarian',
    department: 'Library Services',
    role: 'Support Staff',
    joining_date: '2021-08-01',
    status: 'ACTIVE',
    teacher_subjects: [],
    monthlySalary: 48000
  },
  {
    id: 'stf-nt-003',
    username: 'vsingh_it',
    name: 'Vijay',
    surname: 'Singh',
    email: 'v.singh@school.com',
    phone: '9876540003',
    address: '7 Begumpet, Hyderabad',
    blood_type: 'B+',
    sex: 'MALE',
    birthday: '1992-04-25',
    designation: 'IT Systems Administrator',
    department: 'Information Technology',
    role: 'Support Staff',
    joining_date: '2023-01-15',
    status: 'ACTIVE',
    teacher_subjects: [],
    monthlySalary: 55000
  },
  {
    id: 'stf-nt-004',
    username: 'dpatel_reg',
    name: 'Deepa',
    surname: 'Patel',
    email: 'd.patel@school.com',
    phone: '9876540004',
    address: '62 Ameerpet, Hyderabad',
    blood_type: 'AB-',
    sex: 'FEMALE',
    birthday: '1984-09-05',
    designation: 'Registrar',
    department: 'Admissions & Registry',
    role: 'Administrative Staff',
    joining_date: '2020-07-22',
    status: 'ACTIVE',
    teacher_subjects: [],
    monthlySalary: 52000
  }
];

// Unified Staff Array
export const defaultStaffList: StaffMember[] = [...TEACHING_STAFF, ...NON_TEACHING_STAFF];

// Helper to generate attendance punches for April, May, and June 2026
const generateStaffAttendance = (staffId: string): StaffAttendanceRecord[] => {
  const records: StaffAttendanceRecord[] = [];
  const startDay = new Date('2026-04-01');
  const endDay = new Date('2026-06-16'); // Current local date in mock timeline

  // Loop through dates
  for (let d = new Date(startDay); d <= endDay; d.setDate(d.getDate() + 1)) {
    if (d.getDay() === 0 || d.getDay() === 6) continue; // Skip weekends

    const dateStr = d.toISOString().split('T')[0];
    const monthIndex = d.getMonth(); // 3 = April, 4 = May, 5 = June
    const dayOfMonth = d.getDate();

    // Generate seed for deterministic variation based on staffId and day
    const seed = (staffId.charCodeAt(staffId.length - 1) + dayOfMonth + monthIndex) % 30;
    
    let status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'LEAVE' = 'PRESENT';
    let checkIn: string | null = '08:15';
    let checkOut: string | null = '15:45';
    let remarks = 'Punctual entry & exit';

    // Staff member index 4 (Suresh Gupta) is ON_LEAVE in June
    const isSuresh = staffId === 'tch-005';
    if (isSuresh && monthIndex === 5) {
      status = 'LEAVE';
      checkIn = null;
      checkOut = null;
      remarks = 'On approved medical leave';
    } else if (seed === 7) {
      status = 'LATE';
      checkIn = '08:45';
      checkOut = '15:45';
      remarks = 'Late arrival due to traffic congestion';
    } else if (seed === 13) {
      status = 'HALF_DAY';
      checkIn = '08:15';
      checkOut = '12:30';
      remarks = 'Half-day - Left early for dentist appointment';
    } else if (seed === 22) {
      status = 'ABSENT';
      checkIn = null;
      checkOut = null;
      remarks = 'Absent without prior notice';
    } else if (seed === 27) {
      status = 'LEAVE';
      checkIn = null;
      checkOut = null;
      remarks = 'Casual leave approved';
    }

    records.push({
      id: `att-stf-${staffId}-${dateStr}`,
      date: dateStr,
      checkIn,
      checkOut,
      status,
      remarks
    });
  }

  // Sort descending: latest date first
  return records.sort((a, b) => b.date.localeCompare(a.date));
};

// Helper to generate Leave Records
const generateLeaveHistory = (staffId: string): LeaveRecord[] => {
  const seed = staffId.charCodeAt(staffId.length - 1) % 5;
  const leaves: LeaveRecord[] = [
    {
      id: `lv-${staffId}-1`,
      leaveType: 'Casual Leave',
      startDate: '2026-04-12',
      endDate: '2026-04-13',
      days: 2,
      status: 'APPROVED',
      approvedBy: 'Admin User'
    },
    {
      id: `lv-${staffId}-2`,
      leaveType: 'Sick Leave',
      startDate: '2026-05-18',
      endDate: '2026-05-19',
      days: 2,
      status: 'APPROVED',
      approvedBy: 'Admin User'
    }
  ];

  if (seed % 2 === 0) {
    leaves.push({
      id: `lv-${staffId}-3`,
      leaveType: 'Privilege Leave',
      startDate: '2026-06-25',
      endDate: '2026-06-28',
      days: 3,
      status: 'PENDING',
      approvedBy: 'Pending Approval'
    });
  }

  if (staffId === 'tch-005') { // Suresh Gupta (ON_LEAVE)
    leaves.push({
      id: `lv-${staffId}-med`,
      leaveType: 'Medical Leave',
      startDate: '2026-06-01',
      endDate: '2026-06-30',
      days: 30,
      status: 'APPROVED',
      approvedBy: 'Super Admin'
    });
  }
  return leaves;
};

// Generate Details Map
export const defaultStaffDetailsMap: Record<string, StaffFullDetails> = {};

defaultStaffList.forEach(member => {
  const attendance = generateStaffAttendance(member.id);
  const leaveHistory = generateLeaveHistory(member.id);

  // Calculate leave summary
  const approvedLeavesCount = leaveHistory
    .filter(l => l.status === 'APPROVED')
    .reduce((sum, l) => sum + l.days, 0);

  const leaveSummary: LeaveSummary = {
    totalBalance: 24,
    used: approvedLeavesCount,
    remaining: Math.max(0, 24 - approvedLeavesCount)
  };

  // Performance (Mock based on Role)
  let assignedClasses: string[] = [];
  let assignedSubjects: string[] = [];
  let totalStudents = 0;
  let notes = '';

  if (member.role === 'Administrative Staff' || member.role === 'Support Staff' || member.role === 'Advisory Staff') {
    notes = 'Manages school audits seamlessly. High accuracy in financial reports and operations.';
    if (member.designation === 'Senior Librarian') {
      notes = 'Organized the digital catalog transition. Facilitates reading clubs. Enthusiastic support for students and teachers.';
    } else if (member.designation === 'IT Systems Administrator') {
      notes = 'Maintains 99.9% school intranet uptime. Quick resolution of software support tickets. Excellent security audits.';
    } else if (member.designation === 'Registrar') {
      notes = 'Accurately handles all student registry and parent enrollment documentations. Highly organized archive control.';
    }
  } else {
    // Academic mapping
    const supervisedClasses = CLASSES.filter(c => c.supervisor_id === member.id).map(c => c.name);
    const taughtClassesSet = new Set<string>(supervisedClasses);
    if (member.id === 'usr-teacher-001') taughtClassesSet.add('4A');
    else if (member.id === 'tch-002') taughtClassesSet.add('1A');
    else if (member.id === 'tch-003') taughtClassesSet.add('1B');
    else taughtClassesSet.add('2A');

    assignedClasses = Array.from(taughtClassesSet);
    assignedSubjects = (member.teacher_subjects ?? []).map(ts => {
      const sub = SUBJECTS.find(s => s.id === ts.subject_id);
      return sub ? sub.name : 'General';
    });

    assignedClasses.forEach(cName => {
      const matchingClass = CLASSES.find(c => c.name === cName);
      if (matchingClass) {
        totalStudents += STUDENTS.filter(s => s.class_id === matchingClass.id).length;
      }
    });

    if (totalStudents === 0) totalStudents = 28 + (member.id.charCodeAt(member.id.length - 1) % 10);

    notes = 'Consistently meets academic deliverables. Shows positive rapport with parents. High student pass rate.';
    if (member.id === 'usr-teacher-001') {
      notes = 'Lead coordinator for mathematics Olympiad. Student rating: 4.8/5. Excellent lesson completion and curriculum pacing.';
    } else if (member.id === 'tch-005') {
      notes = 'Exhibits strong class control. Standard results are consistent, though currently on medical leave.';
    } else if (member.id === 'tch-006') {
      notes = 'Outstanding organization of sports training and inter-school sports league. Great physical education leadership.';
    }
  }

  const performance: PerformanceRecord = {
    assignedClasses,
    assignedSubjects,
    totalStudents,
    notes
  };

  defaultStaffDetailsMap[member.id] = {
    staffId: member.id,
    attendance,
    leaveSummary,
    leaveHistory,
    performance
  };
});

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

export let STAFF: StaffMember[] = loadFromStorage('erp_staff_list', defaultStaffList);
export let STAFF_DETAILS_MAP: Record<string, StaffFullDetails> = loadFromStorage('erp_staff_details_map', defaultStaffDetailsMap);

export const saveStaffState = () => {
  saveToStorage('erp_staff_list', STAFF);
  saveToStorage('erp_staff_details_map', STAFF_DETAILS_MAP);
};
