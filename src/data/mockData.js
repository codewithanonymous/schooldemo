/**
 * mockData.js — Single source of truth for all dummy data.
 * No network requests. Everything is in-memory.
 */

// ─── Demo Users (for login) ────────────────────────────────────────────────
export const DEMO_USERS = [
  { id: 'usr-admin-001',   email: 'admin@example.com',   password: '12345678', role: 'admin',   name: 'Admin User',     created_at: '2024-01-15T09:00:00Z' },
  { id: 'usr-teacher-001', email: 'teacher@example.com', password: '12345678', role: 'teacher', name: 'Demo Teacher',    created_at: '2024-02-01T09:00:00Z' },
  { id: 'usr-student-001', email: 'student@example.com', password: '12345678', role: 'student', name: 'Demo Student',    created_at: '2024-03-10T09:00:00Z' },
  { id: 'usr-parent-001',  email: 'parent@example.com',  password: '12345678', role: 'parent',  name: 'Demo Parent',    created_at: '2024-03-10T09:00:00Z' },
]

// ─── Subjects ──────────────────────────────────────────────────────────────
export let SUBJECTS = [
  { id: 's1', name: 'Mathematics' },
  { id: 's2', name: 'English Literature' },
  { id: 's3', name: 'Physics' },
  { id: 's4', name: 'Chemistry' },
  { id: 's5', name: 'Biology' },
  { id: 's6', name: 'History' },
  { id: 's7', name: 'Computer Science' },
  { id: 's8', name: 'Physical Education' },
]

// ─── Grades ────────────────────────────────────────────────────────────────
export const GRADES = [
  { id: 'g1', level: 1, label: 'Grade 1' },
  { id: 'g2', level: 2, label: 'Grade 2' },
  { id: 'g3', level: 3, label: 'Grade 3' },
  { id: 'g4', level: 4, label: 'Grade 4' },
  { id: 'g5', level: 5, label: 'Grade 5' },
]

// ─── Teachers ─────────────────────────────────────────────────────────────
export let TEACHERS = [
  { id: 'usr-teacher-001', username: 'teacher',    name: 'Ravi',    surname: 'Kumar',    email: 'teacher@example.com',  phone: '9876543210', address: '12 MG Road, Hyderabad',   blood_type: 'B+',  sex: 'MALE',   birthday: '1985-04-12', teacher_subjects: [{ subject_id: 's1' }, { subject_id: 's7' }] },
  { id: 'tch-002',         username: 'psingh',     name: 'Priya',   surname: 'Singh',    email: 'p.singh@school.com',   phone: '9876543211', address: '45 Banjara Hills, HYD',   blood_type: 'A+',  sex: 'FEMALE', birthday: '1990-07-22', teacher_subjects: [{ subject_id: 's2' }] },
  { id: 'tch-003',         username: 'arao',       name: 'Anand',   surname: 'Rao',      email: 'a.rao@school.com',     phone: '9876543212', address: '78 Jubilee Hills, HYD',   blood_type: 'O+',  sex: 'MALE',   birthday: '1982-11-03', teacher_subjects: [{ subject_id: 's3' }, { subject_id: 's4' }] },
  { id: 'tch-004',         username: 'nreddy',     name: 'Neha',    surname: 'Reddy',    email: 'n.reddy@school.com',   phone: '9876543213', address: '22 Madhapur, HYD',        blood_type: 'AB-', sex: 'FEMALE', birthday: '1988-03-18', teacher_subjects: [{ subject_id: 's5' }] },
  { id: 'tch-005',         username: 'sgupta',     name: 'Suresh',  surname: 'Gupta',    email: 's.gupta@school.com',   phone: '9876543214', address: '9 Gachibowli, HYD',       blood_type: 'B-',  sex: 'MALE',   birthday: '1979-09-05', teacher_subjects: [{ subject_id: 's6' }] },
  { id: 'tch-006',         username: 'kvarma',     name: 'Kavitha', surname: 'Varma',    email: 'k.varma@school.com',   phone: '9876543215', address: '33 Kukatpally, HYD',      blood_type: 'A-',  sex: 'FEMALE', birthday: '1993-01-29', teacher_subjects: [{ subject_id: 's8' }] },
  { id: 'tch-007',         username: 'mpillai',    name: 'Mohan',   surname: 'Pillai',   email: 'm.pillai@school.com',  phone: '9876543216', address: '55 Secunderabad, HYD',    blood_type: 'O-',  sex: 'MALE',   birthday: '1986-06-14', teacher_subjects: [{ subject_id: 's1' }, { subject_id: 's3' }] },
  { id: 'tch-008',         username: 'slakshmi',   name: 'Sunita',  surname: 'Lakshmi',  email: 's.lakshmi@school.com', phone: '9876543217', address: '18 KPHB, HYD',            blood_type: 'A+',  sex: 'FEMALE', birthday: '1991-12-07', teacher_subjects: [{ subject_id: 's2' }, { subject_id: 's6' }] },
  { id: 'tch-009',         username: 'vchandra',   name: 'Vikram',  surname: 'Chandra',  email: 'v.chandra@school.com', phone: '9876543218', address: '7 Begumpet, HYD',         blood_type: 'B+',  sex: 'MALE',   birthday: '1984-08-25', teacher_subjects: [{ subject_id: 's4' }, { subject_id: 's5' }] },
  { id: 'tch-010',         username: 'amehta',     name: 'Anjali',  surname: 'Mehta',    email: 'a.mehta@school.com',   phone: '9876543219', address: '62 Ameerpet, HYD',        blood_type: 'AB+', sex: 'FEMALE', birthday: '1989-02-11', teacher_subjects: [{ subject_id: 's7' }, { subject_id: 's8' }] },
]

// ─── Parents ───────────────────────────────────────────────────────────────
export let PARENTS = [
  { id: 'usr-parent-001', username: 'parent',    name: 'Demo',    surname: 'Parent',   email: 'parent@example.com',    phone: '9100000001', address: '14 Green Park, HYD' },
  { id: 'par-002',        username: 'rjoshi',    name: 'Ramesh',  surname: 'Joshi',    email: 'r.joshi@email.com',      phone: '9100000002', address: '32 Banjara Hills, HYD' },
  { id: 'par-003',        username: 'spatel',    name: 'Sunita',  surname: 'Patel',    email: 's.patel@email.com',      phone: '9100000003', address: '9 Jubilee Hills, HYD' },
  { id: 'par-004',        username: 'knair',     name: 'Krishnan', surname: 'Nair',    email: 'k.nair@email.com',       phone: '9100000004', address: '77 Madhapur, HYD' },
  { id: 'par-005',        username: 'adesai',    name: 'Amita',   surname: 'Desai',    email: 'a.desai@email.com',      phone: '9100000005', address: '4 Gachibowli, HYD' },
  { id: 'par-006',        username: 'bsharma',   name: 'Bharat',  surname: 'Sharma',   email: 'b.sharma@email.com',     phone: '9100000006', address: '21 Secunderabad, HYD' },
  { id: 'par-007',        username: 'lsrivastava', name: 'Lalita', surname: 'Srivastava', email: 'l.sri@email.com',    phone: '9100000007', address: '56 KPHB, HYD' },
  { id: 'par-008',        username: 'gmenon',    name: 'Govind',  surname: 'Menon',    email: 'g.menon@email.com',      phone: '9100000008', address: '38 Ameerpet, HYD' },
]

// ─── Classes ───────────────────────────────────────────────────────────────
export let CLASSES = [
  { id: 'cls-1a', name: '1A', capacity: 35, supervisor_id: 'tch-002', grade_id: 'g1' },
  { id: 'cls-1b', name: '1B', capacity: 35, supervisor_id: 'tch-003', grade_id: 'g1' },
  { id: 'cls-2a', name: '2A', capacity: 32, supervisor_id: 'tch-004', grade_id: 'g2' },
  { id: 'cls-2b', name: '2B', capacity: 32, supervisor_id: 'tch-005', grade_id: 'g2' },
  { id: 'cls-3a', name: '3A', capacity: 30, supervisor_id: 'tch-006', grade_id: 'g3' },
  { id: 'cls-4a', name: '4A', capacity: 30, supervisor_id: 'usr-teacher-001', grade_id: 'g4' },
  { id: 'cls-5a', name: '5A', capacity: 28, supervisor_id: 'tch-007', grade_id: 'g5' },
]

// ─── Students ─────────────────────────────────────────────────────────────
export let STUDENTS = [
  { id: 'usr-student-001', username: 'student',  name: 'Demo',    surname: 'Student',  email: 'student@example.com',   phone: null,         address: '14 Green Park, HYD',   blood_type: 'O-',  sex: 'FEMALE', birthday: '2012-05-20', class_id: 'cls-4a', parent_id: 'usr-parent-001' },
  { id: 'std-002',         username: 'ashwini',  name: 'Ashwini', surname: 'Joshi',    email: 'ashwini@school.com',     phone: null,         address: '32 Banjara Hills, HYD', blood_type: 'A+',  sex: 'FEMALE', birthday: '2012-03-14', class_id: 'cls-4a', parent_id: 'par-002' },
  { id: 'std-003',         username: 'varun',    name: 'Varun',   surname: 'Patel',    email: 'varun@school.com',       phone: null,         address: '9 Jubilee Hills, HYD',  blood_type: 'B+',  sex: 'MALE',   birthday: '2012-09-08', class_id: 'cls-4a', parent_id: 'par-003' },
  { id: 'std-004',         username: 'divya',    name: 'Divya',   surname: 'Nair',     email: 'divya@school.com',       phone: null,         address: '77 Madhapur, HYD',     blood_type: 'AB+', sex: 'FEMALE', birthday: '2013-01-25', class_id: 'cls-3a', parent_id: 'par-004' },
  { id: 'std-005',         username: 'rahul',    name: 'Rahul',   surname: 'Desai',    email: 'rahul@school.com',       phone: null,         address: '4 Gachibowli, HYD',    blood_type: 'O+',  sex: 'MALE',   birthday: '2013-07-12', class_id: 'cls-3a', parent_id: 'par-005' },
  { id: 'std-006',         username: 'sneha',    name: 'Sneha',   surname: 'Sharma',   email: 'sneha@school.com',       phone: null,         address: '21 Secunderabad, HYD', blood_type: 'A-',  sex: 'FEMALE', birthday: '2014-04-03', class_id: 'cls-2a', parent_id: 'par-006' },
  { id: 'std-007',         username: 'arjun',    name: 'Arjun',   surname: 'Srivastava', email: 'arjun@school.com',    phone: null,         address: '56 KPHB, HYD',         blood_type: 'B-',  sex: 'MALE',   birthday: '2014-11-19', class_id: 'cls-2b', parent_id: 'par-007' },
  { id: 'std-008',         username: 'pooja',    name: 'Pooja',   surname: 'Menon',    email: 'pooja@school.com',       phone: null,         address: '38 Ameerpet, HYD',     blood_type: 'AB-', sex: 'FEMALE', birthday: '2015-02-28', class_id: 'cls-1a', parent_id: 'par-008' },
  { id: 'std-009',         username: 'kiran',    name: 'Kiran',   surname: 'Kumar',    email: 'kiran@school.com',       phone: null,         address: '12 MG Road, HYD',      blood_type: 'O+',  sex: 'MALE',   birthday: '2011-08-15', class_id: 'cls-5a', parent_id: 'par-002' },
  { id: 'std-010',         username: 'meera',    name: 'Meera',   surname: 'Singh',    email: 'meera@school.com',       phone: null,         address: '45 Banjara Hills, HYD', blood_type: 'A+',  sex: 'FEMALE', birthday: '2011-12-01', class_id: 'cls-5a', parent_id: 'par-003' },
]

// ─── Announcements ────────────────────────────────────────────────────────
export let ANNOUNCEMENTS = [
  { id: 'ann-001', title: 'Annual Sports Day', description: 'Annual sports day will be held on 20th June. All students must participate. Parents are welcome to attend.', date: '2026-06-15', class_id: null },
  { id: 'ann-002', title: 'Parent-Teacher Meeting', description: 'PTM scheduled for 25th June from 10am to 1pm. Please collect your ward\'s progress report.', date: '2026-06-14', class_id: null },
  { id: 'ann-003', title: 'Exam Schedule Released', description: 'Mid-term exam schedule is now available on the notice board and school portal. Prepare accordingly.', date: '2026-06-12', class_id: null },
  { id: 'ann-004', title: 'Library Week', description: 'Library week will be celebrated from June 18–22. Book review competitions and reading contests will be held.', date: '2026-06-10', class_id: 'cls-4a' },
  { id: 'ann-005', title: 'Holiday Notice — Bakrid', description: 'School will remain closed on June 17th on account of Bakrid. Classes resume on June 18th.', date: '2026-06-08', class_id: null },
  { id: 'ann-006', title: 'Science Exhibition', description: '4A class will host a science exhibition on June 28th. All students must submit their projects by June 24th.', date: '2026-06-07', class_id: 'cls-4a' },
]

// ─── Events ───────────────────────────────────────────────────────────────
export const EVENTS = [
  { id: 'evt-001', title: 'Sports Day', description: 'Annual inter-house sports competition. Track and field events.', start_time: new Date(Date.now() + 4 * 24 * 3600 * 1000).toISOString(), end_time: new Date(Date.now() + 4 * 24 * 3600 * 1000 + 6 * 3600 * 1000).toISOString(), class_id: null },
  { id: 'evt-002', title: 'Parent-Teacher Meeting', description: 'Monthly PTM session for all classes.', start_time: new Date(Date.now() + 9 * 24 * 3600 * 1000).toISOString(), end_time: new Date(Date.now() + 9 * 24 * 3600 * 1000 + 3 * 3600 * 1000).toISOString(), class_id: null },
  { id: 'evt-003', title: 'Science Exhibition', description: 'Students showcase science projects. Open to parents.', start_time: new Date(Date.now() + 12 * 24 * 3600 * 1000).toISOString(), end_time: new Date(Date.now() + 12 * 24 * 3600 * 1000 + 4 * 3600 * 1000).toISOString(), class_id: 'cls-4a' },
  { id: 'evt-004', title: 'Mid-Term Exams Begin', description: 'Mid-term examination schedule commences for all grades.', start_time: new Date(Date.now() + 21 * 24 * 3600 * 1000).toISOString(), end_time: new Date(Date.now() + 26 * 24 * 3600 * 1000).toISOString(), class_id: null },
  { id: 'evt-005', title: 'Republic Day Celebration', description: 'Flag hoisting ceremony and cultural performances by students.', start_time: new Date(Date.now() + 35 * 24 * 3600 * 1000).toISOString(), end_time: new Date(Date.now() + 35 * 24 * 3600 * 1000 + 2 * 3600 * 1000).toISOString(), class_id: null },
]

// ─── Exams ────────────────────────────────────────────────────────────────
export let EXAMS = [
  { id: 'ex-001', title: 'Midterm Mathematics',     lesson_id: 'les-001', start_time: '2026-07-10T09:00:00Z', end_time: '2026-07-10T11:00:00Z' },
  { id: 'ex-002', title: 'Midterm English',         lesson_id: 'les-002', start_time: '2026-07-11T09:00:00Z', end_time: '2026-07-11T11:00:00Z' },
  { id: 'ex-003', title: 'Midterm Physics',         lesson_id: 'les-003', start_time: '2026-07-12T09:00:00Z', end_time: '2026-07-12T11:00:00Z' },
  { id: 'ex-004', title: 'Midterm Chemistry',       lesson_id: 'les-004', start_time: '2026-07-13T09:00:00Z', end_time: '2026-07-13T11:00:00Z' },
  { id: 'ex-005', title: 'Final Mathematics',       lesson_id: 'les-001', start_time: '2026-10-10T09:00:00Z', end_time: '2026-10-10T12:00:00Z' },
  { id: 'ex-006', title: 'Final Computer Science',  lesson_id: 'les-005', start_time: '2026-10-14T09:00:00Z', end_time: '2026-10-14T11:00:00Z' },
]

// ─── Lessons (for calendar views) ─────────────────────────────────────────
// Generates a week's worth of lessons from Monday of current week
const getWeekStart = () => {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(now.setDate(diff))
  monday.setHours(0, 0, 0, 0)
  return monday
}

const makeLesson = (id, name, teacher_id, class_id, dayOffset, startHour, durationH) => {
  const base = getWeekStart()
  const start = new Date(base)
  start.setDate(base.getDate() + dayOffset)
  start.setHours(startHour, 0, 0, 0)
  const end = new Date(start)
  end.setHours(startHour + durationH, 0, 0, 0)
  return { id, name, teacher_id, class_id, start_time: start.toISOString(), end_time: end.toISOString() }
}

export const LESSONS = [
  // Teacher lessons (tch-001 = usr-teacher-001)
  makeLesson('les-001', 'Mathematics - 4A', 'usr-teacher-001', 'cls-4a', 0, 8, 1),
  makeLesson('les-007', 'Mathematics - 4A', 'usr-teacher-001', 'cls-4a', 2, 8, 1),
  makeLesson('les-008', 'Mathematics - 4A', 'usr-teacher-001', 'cls-4a', 4, 8, 1),
  makeLesson('les-009', 'Comp. Science - 4A', 'usr-teacher-001', 'cls-4a', 1, 10, 1),
  makeLesson('les-010', 'Comp. Science - 4A', 'usr-teacher-001', 'cls-4a', 3, 10, 1),
  // Other teacher lessons
  makeLesson('les-002', 'English - 4A',    'tch-002', 'cls-4a', 0, 9, 1),
  makeLesson('les-003', 'Physics - 4A',    'tch-003', 'cls-4a', 1, 8, 1),
  makeLesson('les-004', 'Chemistry - 4A',  'tch-004', 'cls-4a', 2, 9, 1),
  makeLesson('les-005', 'Biology - 4A',    'tch-005', 'cls-4a', 3, 8, 1),
  makeLesson('les-006', 'History - 4A',    'tch-006', 'cls-4a', 4, 9, 1),
  // 5A class lessons (different teacher)
  makeLesson('les-011', 'Mathematics - 5A', 'tch-007', 'cls-5a', 0, 10, 1),
  makeLesson('les-012', 'English - 5A',     'tch-008', 'cls-5a', 1, 11, 1),
]

// ─── Stats for dashboard ──────────────────────────────────────────────────
export const STATS = {
  admins:   1,
  teachers: TEACHERS.length,
  students: STUDENTS.length,
  parents:  PARENTS.length,
}

// ─── Attendance (weekly data for chart) ───────────────────────────────────
export const ATTENDANCE_DATA = [
  { name: 'Mon', present: 142, absent: 8 },
  { name: 'Tue', present: 138, absent: 12 },
  { name: 'Wed', present: 145, absent: 5 },
  { name: 'Thu', present: 140, absent: 10 },
  { name: 'Fri', present: 148, absent: 2 },
]

// ─── Utility: generate a simple unique ID ─────────────────────────────────
export const genId = (prefix = 'item') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
