// ─── No import from mockData.js (avoids circular dependency) ─────────────────
import { AcademicYear, AcademicClass, AcademicSection, TeacherAssignment, FeeItem, StudentFeeLedger } from '../types/academic';
import { Student } from '../types/student';

// ─── Raw Student Seed Data (inline — do NOT import from mockData.js) ───────────
// Source of truth for initial student population. Matches mockData.js STUDENTS array.
const rawStudents = [
  { id: 'usr-student-001', username: 'student',  name: 'Demo',    surname: 'Student',    email: 'student@example.com',    phone: null, address: '14 Green Park, HYD',    blood_type: 'O-',  sex: 'FEMALE', birthday: '2012-05-20', class_id: 'cls-4a', parent_id: 'usr-parent-001' },
  { id: 'std-002',         username: 'ashwini',  name: 'Ashwini', surname: 'Joshi',      email: 'ashwini@school.com',      phone: null, address: '32 Banjara Hills, HYD',  blood_type: 'A+',  sex: 'FEMALE', birthday: '2012-03-14', class_id: 'cls-4a', parent_id: 'par-002' },
  { id: 'std-003',         username: 'varun',    name: 'Varun',   surname: 'Patel',      email: 'varun@school.com',        phone: null, address: '9 Jubilee Hills, HYD',   blood_type: 'B+',  sex: 'MALE',   birthday: '2012-09-08', class_id: 'cls-4a', parent_id: 'par-003' },
  { id: 'std-004',         username: 'divya',    name: 'Divya',   surname: 'Nair',       email: 'divya@school.com',        phone: null, address: '77 Madhapur, HYD',      blood_type: 'AB+', sex: 'FEMALE', birthday: '2013-01-25', class_id: 'cls-3a', parent_id: 'par-004' },
  { id: 'std-005',         username: 'rahul',    name: 'Rahul',   surname: 'Desai',      email: 'rahul@school.com',        phone: null, address: '4 Gachibowli, HYD',     blood_type: 'O+',  sex: 'MALE',   birthday: '2013-07-12', class_id: 'cls-3a', parent_id: 'par-005' },
  { id: 'std-006',         username: 'sneha',    name: 'Sneha',   surname: 'Sharma',     email: 'sneha@school.com',        phone: null, address: '21 Secunderabad, HYD',  blood_type: 'A-',  sex: 'FEMALE', birthday: '2014-04-03', class_id: 'cls-2a', parent_id: 'par-006' },
  { id: 'std-007',         username: 'arjun',    name: 'Arjun',   surname: 'Srivastava', email: 'arjun@school.com',        phone: null, address: '56 KPHB, HYD',          blood_type: 'B-',  sex: 'MALE',   birthday: '2014-11-19', class_id: 'cls-2b', parent_id: 'par-007' },
  { id: 'std-008',         username: 'pooja',    name: 'Pooja',   surname: 'Menon',      email: 'pooja@school.com',        phone: null, address: '38 Ameerpet, HYD',      blood_type: 'AB-', sex: 'FEMALE', birthday: '2015-02-28', class_id: 'cls-1a', parent_id: 'par-008' },
  { id: 'std-009',         username: 'kiran',    name: 'Kiran',   surname: 'Kumar',      email: 'kiran@school.com',        phone: null, address: '12 MG Road, HYD',       blood_type: 'O+',  sex: 'MALE',   birthday: '2011-08-15', class_id: 'cls-5a', parent_id: 'par-002' },
  { id: 'std-010',         username: 'meera',    name: 'Meera',   surname: 'Singh',      email: 'meera@school.com',        phone: null, address: '45 Banjara Hills, HYD', blood_type: 'A+',  sex: 'FEMALE', birthday: '2011-12-01', class_id: 'cls-5a', parent_id: 'par-003' },
];

// ─── Subject Types ─────────────────────────────────────────────────────────
export interface Subject {
  id: string;
  name: string;
  code: string;
  description: string;
  department: string;
  maxMarks: number;
  passMarks: number;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
}

export interface SubjectClassMapping {
  id: string;
  subject_id: string;
  class_id: string;
  section_id: string; // empty string = all sections in class
}

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

// --- Default Seed Data ---

const defaultSubjects: Subject[] = [
  { id: 's1', name: 'Mathematics',        code: 'MATH',  department: 'Mathematics & Computer Science',  description: 'Number theory, algebra, geometry and calculus',        maxMarks: 100, passMarks: 35, status: 'ACTIVE', created_at: '2024-06-01' },
  { id: 's2', name: 'English Literature', code: 'ENG',   department: 'Languages & Humanities',           description: 'Grammar, comprehension, prose and poetry',               maxMarks: 100, passMarks: 35, status: 'ACTIVE', created_at: '2024-06-01' },
  { id: 's3', name: 'Physics',            code: 'PHY',   department: 'Sciences',                         description: 'Mechanics, electricity, optics and modern physics',        maxMarks: 100, passMarks: 35, status: 'ACTIVE', created_at: '2024-06-01' },
  { id: 's4', name: 'Chemistry',          code: 'CHEM',  department: 'Sciences',                         description: 'Organic, inorganic and physical chemistry',              maxMarks: 100, passMarks: 35, status: 'ACTIVE', created_at: '2024-06-01' },
  { id: 's5', name: 'Biology',            code: 'BIO',   department: 'Sciences',                         description: 'Cell biology, genetics, ecology and physiology',          maxMarks: 100, passMarks: 35, status: 'ACTIVE', created_at: '2024-06-01' },
  { id: 's6', name: 'History',            code: 'HIST',  department: 'Languages & Humanities',           description: 'Indian history, world history and civics',               maxMarks: 100, passMarks: 35, status: 'ACTIVE', created_at: '2024-06-01' },
  { id: 's7', name: 'Computer Science',   code: 'CS',    department: 'Mathematics & Computer Science',  description: 'Programming, algorithms, data structures and networking', maxMarks: 100, passMarks: 35, status: 'ACTIVE', created_at: '2024-06-01' },
  { id: 's8', name: 'Physical Education', code: 'PE',    department: 'Physical Education',               description: 'Sports, fitness and health education',                  maxMarks: 50,  passMarks: 20, status: 'ACTIVE', created_at: '2024-06-01' },
];

// Default class-subject mappings (which subjects are taught in which class/section)
const defaultSubjectMappings: SubjectClassMapping[] = [
  // Class 1 (1A, 1B) - core subjects
  { id: 'sm-1', subject_id: 's1', class_id: 'c-1', section_id: '' },
  { id: 'sm-2', subject_id: 's2', class_id: 'c-1', section_id: '' },
  { id: 'sm-3', subject_id: 's6', class_id: 'c-1', section_id: '' },
  { id: 'sm-4', subject_id: 's8', class_id: 'c-1', section_id: '' },
  // Class 2
  { id: 'sm-5', subject_id: 's1', class_id: 'c-2', section_id: '' },
  { id: 'sm-6', subject_id: 's2', class_id: 'c-2', section_id: '' },
  { id: 'sm-7', subject_id: 's6', class_id: 'c-2', section_id: '' },
  { id: 'sm-8', subject_id: 's8', class_id: 'c-2', section_id: '' },
  // Class 3
  { id: 'sm-9',  subject_id: 's1', class_id: 'c-3', section_id: '' },
  { id: 'sm-10', subject_id: 's2', class_id: 'c-3', section_id: '' },
  { id: 'sm-11', subject_id: 's5', class_id: 'c-3', section_id: '' },
  { id: 'sm-12', subject_id: 's6', class_id: 'c-3', section_id: '' },
  { id: 'sm-13', subject_id: 's8', class_id: 'c-3', section_id: '' },
  // Class 4 - full science subjects
  { id: 'sm-14', subject_id: 's1', class_id: 'c-4', section_id: '' },
  { id: 'sm-15', subject_id: 's2', class_id: 'c-4', section_id: '' },
  { id: 'sm-16', subject_id: 's3', class_id: 'c-4', section_id: '' },
  { id: 'sm-17', subject_id: 's4', class_id: 'c-4', section_id: '' },
  { id: 'sm-18', subject_id: 's5', class_id: 'c-4', section_id: '' },
  { id: 'sm-19', subject_id: 's7', class_id: 'c-4', section_id: '' },
  { id: 'sm-20', subject_id: 's8', class_id: 'c-4', section_id: '' },
  // Class 5 - advanced
  { id: 'sm-21', subject_id: 's1', class_id: 'c-5', section_id: '' },
  { id: 'sm-22', subject_id: 's2', class_id: 'c-5', section_id: '' },
  { id: 'sm-23', subject_id: 's3', class_id: 'c-5', section_id: '' },
  { id: 'sm-24', subject_id: 's4', class_id: 'c-5', section_id: '' },
  { id: 'sm-25', subject_id: 's5', class_id: 'c-5', section_id: '' },
  { id: 'sm-26', subject_id: 's6', class_id: 'c-5', section_id: '' },
  { id: 'sm-27', subject_id: 's7', class_id: 'c-5', section_id: '' },
  { id: 'sm-28', subject_id: 's8', class_id: 'c-5', section_id: '' },
];

const defaultYears: AcademicYear[] = [
  { id: 'ay-2026', name: '2026-27', status: 'ACTIVE' },
  { id: 'ay-2025', name: '2025-26', status: 'INACTIVE' }
];

const defaultClasses: AcademicClass[] = [
  { id: 'c-1', name: 'Class 1', code: 'C1', academic_year_id: 'ay-2026', description: 'Primary Grade 1', status: 'ACTIVE' },
  { id: 'c-2', name: 'Class 2', code: 'C2', academic_year_id: 'ay-2026', description: 'Primary Grade 2', status: 'ACTIVE' },
  { id: 'c-3', name: 'Class 3', code: 'C3', academic_year_id: 'ay-2026', description: 'Primary Grade 3', status: 'ACTIVE' },
  { id: 'c-4', name: 'Class 4', code: 'C4', academic_year_id: 'ay-2026', description: 'Primary Grade 4', status: 'ACTIVE' },
  { id: 'c-5', name: 'Class 5', code: 'C5', academic_year_id: 'ay-2026', description: 'Primary Grade 5', status: 'ACTIVE' }
];

const defaultSections: AcademicSection[] = [
  { id: 'sec-1a', class_id: 'c-1', name: 'A', code: '1A', supervisor_id: 'tch-002', capacity: 35 },
  { id: 'sec-1b', class_id: 'c-1', name: 'B', code: '1B', supervisor_id: 'tch-003', capacity: 35 },
  { id: 'sec-2a', class_id: 'c-2', name: 'A', code: '2A', supervisor_id: 'tch-004', capacity: 32 },
  { id: 'sec-2b', class_id: 'c-2', name: 'B', code: '2B', supervisor_id: 'tch-005', capacity: 32 },
  { id: 'sec-3a', class_id: 'c-3', name: 'A', code: '3A', supervisor_id: 'tch-006', capacity: 30 },
  { id: 'sec-4a', class_id: 'c-4', name: 'A', code: '4A', supervisor_id: 'usr-teacher-001', capacity: 30 },
  { id: 'sec-5a', class_id: 'c-5', name: 'A', code: '5A', supervisor_id: 'tch-007', capacity: 28 }
];

const defaultAssignments: TeacherAssignment[] = [
  // Ravi Kumar teaches Math & CS to 4A
  { id: 'asg-1', teacher_id: 'usr-teacher-001', class_id: 'c-4', section_id: 'sec-4a', subject_id: 's1' },
  { id: 'asg-2', teacher_id: 'usr-teacher-001', class_id: 'c-4', section_id: 'sec-4a', subject_id: 's7' },
  // Priya Singh teaches English to 1A and 4A
  { id: 'asg-3', teacher_id: 'tch-002', class_id: 'c-1', section_id: 'sec-1a', subject_id: 's2' },
  { id: 'asg-4', teacher_id: 'tch-002', class_id: 'c-4', section_id: 'sec-4a', subject_id: 's2' },
  // Anand Rao teaches Physics to 4A
  { id: 'asg-5', teacher_id: 'tch-003', class_id: 'c-4', section_id: 'sec-4a', subject_id: 's3' },
  // Neha Reddy teaches Biology to 4A
  { id: 'asg-6', teacher_id: 'tch-004', class_id: 'c-4', section_id: 'sec-4a', subject_id: 's5' }
];

const defaultFees: FeeItem[] = [
  // Class 1
  { id: 'fee-1-adm', name: 'Admission Fee', amount: 10000, class_id: 'c-1' },
  { id: 'fee-1-tut', name: 'Tuition Fee', amount: 20000, class_id: 'c-1' },
  { id: 'fee-1-act', name: 'Activity Fee', amount: 5000, class_id: 'c-1' },
  // Class 2
  { id: 'fee-2-adm', name: 'Admission Fee', amount: 10000, class_id: 'c-2' },
  { id: 'fee-2-tut', name: 'Tuition Fee', amount: 22000, class_id: 'c-2' },
  { id: 'fee-2-act', name: 'Activity Fee', amount: 5000, class_id: 'c-2' },
  // Class 3
  { id: 'fee-3-adm', name: 'Admission Fee', amount: 10000, class_id: 'c-3' },
  { id: 'fee-3-tut', name: 'Tuition Fee', amount: 24000, class_id: 'c-3' },
  { id: 'fee-3-act', name: 'Activity Fee', amount: 5000, class_id: 'c-3' },
  // Class 4
  { id: 'fee-4-adm', name: 'Admission Fee', amount: 10000, class_id: 'c-4' },
  { id: 'fee-4-tut', name: 'Tuition Fee', amount: 25000, class_id: 'c-4' },
  { id: 'fee-4-lab', name: 'Science Lab Fee', amount: 3000, class_id: 'c-4' },
  { id: 'fee-4-act', name: 'Activity Fee', amount: 5000, class_id: 'c-4' },
  // Class 5
  { id: 'fee-5-adm', name: 'Admission Fee', amount: 12000, class_id: 'c-5' },
  { id: 'fee-5-tut', name: 'Tuition Fee', amount: 30000, class_id: 'c-5' },
  { id: 'fee-5-lab', name: 'Science Lab Fee', amount: 4000, class_id: 'c-5' },
  { id: 'fee-5-exm', name: 'Exam Board Fee', amount: 2000, class_id: 'c-5' },
  { id: 'fee-5-act', name: 'Activity Fee', amount: 6000, class_id: 'c-5' }
];

// Map rawStudents (which have class_id like 'cls-4a') to the new relational class_id ('c-4') and section_id ('sec-4a')
const defaultStudents: Student[] = rawStudents.map((s, idx) => {
  const rollSuffix = 101 + idx;
  const admSuffix = 2001 + idx;
  const statusVal: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' = 
    idx === 4 ? 'INACTIVE' : idx === 7 ? 'SUSPENDED' : 'ACTIVE';

  // Map old class_id like 'cls-4a' to parent class 'c-4' and section 'sec-4a'
  let classId = 'c-4';
  let sectionId = 'sec-4a';

  if (s.class_id === 'cls-1a') { classId = 'c-1'; sectionId = 'sec-1a'; }
  else if (s.class_id === 'cls-1b') { classId = 'c-1'; sectionId = 'sec-1b'; }
  else if (s.class_id === 'cls-2a') { classId = 'c-2'; sectionId = 'sec-2a'; }
  else if (s.class_id === 'cls-2b') { classId = 'c-2'; sectionId = 'sec-2b'; }
  else if (s.class_id === 'cls-3a') { classId = 'c-3'; sectionId = 'sec-3a'; }
  else if (s.class_id === 'cls-4a') { classId = 'c-4'; sectionId = 'sec-4a'; }
  else if (s.class_id === 'cls-5a') { classId = 'c-5'; sectionId = 'sec-5a'; }

  return {
    ...s,
    sex: s.sex as 'MALE' | 'FEMALE',
    roll_number: `R-${rollSuffix}`,
    admission_number: `ADM-2024-${admSuffix}`,
    admission_date: `2024-06-10`,
    status: statusVal,
    class_id: classId,
    grade_id: sectionId // Reuse grade_id field as section_id field in code if necessary, or keep both
  };
});

// --- State Variables ---

export let ACADEMIC_YEARS: AcademicYear[] = loadFromStorage('erp_academic_years', defaultYears);
export let CLASSES: AcademicClass[] = loadFromStorage('erp_classes', defaultClasses);
export let SECTIONS: AcademicSection[] = loadFromStorage('erp_sections', defaultSections);
export let TEACHER_ASSIGNMENTS: TeacherAssignment[] = loadFromStorage('erp_teacher_assignments', defaultAssignments);
export let STUDENTS: Student[] = loadFromStorage('erp_students', defaultStudents);
export let FEE_STRUCTURES: FeeItem[] = loadFromStorage('erp_fee_structures', defaultFees);
export let STUDENT_LEDGER: Record<string, StudentFeeLedger> = loadFromStorage('erp_student_ledger', {});
export let SUBJECTS: Subject[] = loadFromStorage('erp_subjects', defaultSubjects);
export let SUBJECT_CLASS_MAPPINGS: SubjectClassMapping[] = loadFromStorage('erp_subject_mappings', defaultSubjectMappings);

// --- Helper Functions to Sync State ---

export const saveAcademicState = () => {
  saveToStorage('erp_academic_years', ACADEMIC_YEARS);
  saveToStorage('erp_classes', CLASSES);
  saveToStorage('erp_sections', SECTIONS);
  saveToStorage('erp_teacher_assignments', TEACHER_ASSIGNMENTS);
  saveToStorage('erp_students', STUDENTS);
  saveToStorage('erp_fee_structures', FEE_STRUCTURES);
  saveToStorage('erp_student_ledger', STUDENT_LEDGER);
  saveToStorage('erp_subjects', SUBJECTS);
  saveToStorage('erp_subject_mappings', SUBJECT_CLASS_MAPPINGS);
};

const runERPSeed = () => {
  console.log("Seeding realistic 300 students environment...");
  
  ACADEMIC_YEARS = [
    { id: 'ay-2026', name: '2026-27', status: 'ACTIVE' },
    { id: 'ay-2025', name: '2025-26', status: 'INACTIVE' }
  ];

  CLASSES = Array.from({ length: 10 }, (_, i) => {
    const num = i + 1;
    return {
      id: `c-${num}`,
      name: `Class ${num}`,
      code: `C${num}`,
      academic_year_id: 'ay-2026',
      description: `Grade ${num}`,
      status: 'ACTIVE'
    };
  });

  SECTIONS = [];
  const supervisors = ['tch-002', 'tch-003', 'tch-004', 'tch-005', 'tch-006', 'usr-teacher-001', 'tch-007', 'tch-008', 'tch-009', 'tch-010'];
  for (let c = 1; c <= 10; c++) {
    ['A', 'B', 'C'].forEach((secName, sIdx) => {
      const supervisorId = supervisors[(c + sIdx) % supervisors.length];
      SECTIONS.push({
        id: `sec-${c}${secName.toLowerCase()}`,
        class_id: `c-${c}`,
        name: secName,
        code: `${c}${secName}`,
        supervisor_id: supervisorId,
        capacity: 35
      });
    });
  }

  FEE_STRUCTURES = [];
  for (let c = 1; c <= 10; c++) {
    FEE_STRUCTURES.push(
      { id: `fee-${c}-adm`, name: 'Admission Fee', amount: 10000, class_id: `c-${c}` },
      { id: `fee-${c}-tut`, name: 'Tuition Fee', amount: 15000 + (c - 1) * 3000, class_id: `c-${c}` },
      { id: `fee-${c}-act`, name: 'Activity Fee', amount: 5000, class_id: `c-${c}` }
    );
  }

  TEACHER_ASSIGNMENTS = [];
  const subjects = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'];
  const teacherIds = ['usr-teacher-001', 'tch-002', 'tch-003', 'tch-004', 'tch-005', 'tch-006', 'tch-007', 'tch-008', 'tch-009', 'tch-010'];
  let asgCounter = 1;
  for (let c = 1; c <= 10; c++) {
    ['A', 'B', 'C'].forEach((secName) => {
      const secId = `sec-${c}${secName.toLowerCase()}`;
      subjects.forEach((subId, subIdx) => {
        const teacherId = teacherIds[(c * 5 + subIdx + secName.charCodeAt(0)) % teacherIds.length];
        TEACHER_ASSIGNMENTS.push({
          id: `asg-${asgCounter++}`,
          teacher_id: teacherId,
          class_id: `c-${c}`,
          section_id: secId,
          subject_id: subId
        });
      });
    });
  }

  SUBJECT_CLASS_MAPPINGS = [];
  let mapCounter = 1;
  for (let c = 1; c <= 10; c++) {
    subjects.forEach((subId) => {
      SUBJECT_CLASS_MAPPINGS.push({
        id: `sm-${mapCounter++}`,
        subject_id: subId,
        class_id: `c-${c}`,
        section_id: ''
      });
    });
  }

  const FIRST_NAMES_BOY = [
    "Aarav", "Vihaan", "Aditya", "Arjun", "Krishna", "Ishaan", "Reyansh", "Pranav", "Aryan", "Rahul",
    "Karan", "Vijay", "Anil", "Suresh", "Ramesh", "Ganesh", "Vikram", "Siddharth", "Vivek", "Sandeep",
    "Rajesh", "Sunil", "Amit", "Sanjay", "Deepak", "Manoj", "Pradeep", "Harish", "Naresh", "Satish",
    "Rohan", "Varun", "Abhishek", "Akhil", "Nikhil", "Dev", "Kabir", "Rudra", "Rishi", "Samar"
  ];
  const FIRST_NAMES_GIRL = [
    "Ananya", "Diya", "Priya", "Ishita", "Aanya", "Kavya", "Saanvi", "Riya", "Sneha", "Neha",
    "Divya", "Meera", "Kavitha", "Sunita", "Anjali", "Shreya", "Tanya", "Pooja", "Aaradhya", "Myra",
    "Ira", "Kiara", "Avani", "Riddhi", "Siddhi", "Navya", "Ishani", "Siya", "Prisha", "Tanvi",
    "Kriti", "Aisha", "Aditi", "Meenal", "Suhana", "Rhea", "Nisha", "Gita", "Lata", "Seema"
  ];
  const SURNAMES = [
    "Sharma", "Verma", "Gupta", "Reddy", "Patel", "Singh", "Kumar", "Joshi", "Mehra", "Nair", 
    "Rao", "Choudhury", "Das", "Bhatt", "Kapoor", "Mishra", "Pandey", "Deshmukh", "Kulkarni", 
    "Patil", "Yadav", "Prasad", "Naidu", "Chowdary", "Sastry", "Pillai", "Rathod", "Mehta", "Desai"
  ];
  const PARENT_FIRST_NAMES_MALE = [
    "Ramesh", "Suresh", "Venkat", "Ramana", "Satya", "Narayana", "Mohan", "Rajesh", "Srinivas",
    "Madhusudan", "Chandra", "Sekhar", "Anil", "Bhaskar", "Gopal", "Anand", "Devendra", "Lalit",
    "Sanjay", "Vijay", "Prakash", "Mahesh", "Dinesh", "Ganesh", "Naresh", "Ravi", "Sunil", "Arun",
    "Vinod", "Santosh", "Rakesh", "Mukesh", "Ashok", "Dilip", "Pradeep", "Harish", "Girish", "Umesh"
  ];
  const PARENT_FIRST_NAMES_FEMALE = [
    "Lakshmi", "Saritha", "Padmavathi", "Sunita", "Savitri", "Radha", "Sushma", "Rekha", "Meena",
    "Usha", "Anitha", "Kavitha", "Sudha", "Deepa", "Hema", "Nirmala", "Vanitha", "Swapna", "Priya",
    "Revathi", "Kamala", "Shanthi", "Geeta", "Leela", "Parvathi", "Durga", "Manjula", "Vijaya"
  ];

  const formatDOB = (dobStr: string) => {
    const parts = dobStr.split('-');
    if (parts.length === 3) {
      return parts[2] + parts[1] + parts[0];
    }
    return dobStr.replace(/[^0-9]/g, '');
  };

  const newStudentsList: Student[] = [];
  // newParentsList collects all generated parents — keyed by parent_id for dedup
  const newParentsMap: Record<string, import('../types/student').Parent> = {};

  // ── Retain original 8 parents from mockData baseline ────────────────────
  // Import them inline to avoid circular deps — they already exist in localStorage
  const BASE_PARENTS: import('../types/student').Parent[] = [
    { id: 'usr-parent-001', username: 'parent',      name: 'Demo',     surname: 'Parent',      email: 'parent@example.com',   phone: '9100000001', address: '14 Green Park, HYD',      father_name: 'Demo Father',   mother_name: 'Demo Mother',   guardian_name: 'Demo Parent',   secondary_phone: '' },
    { id: 'par-002',        username: 'rjoshi',      name: 'Ramesh',   surname: 'Joshi',       email: 'r.joshi@email.com',    phone: '9100000002', address: '32 Banjara Hills, HYD',    father_name: 'Rajesh Joshi',  mother_name: 'Lata Joshi',    guardian_name: 'Ramesh Joshi',  secondary_phone: '' },
    { id: 'par-003',        username: 'spatel',      name: 'Sunita',   surname: 'Patel',       email: 's.patel@email.com',    phone: '9100000003', address: '9 Jubilee Hills, HYD',     father_name: 'Suresh Patel',  mother_name: 'Meena Patel',   guardian_name: 'Sunita Patel',  secondary_phone: '' },
    { id: 'par-004',        username: 'knair',       name: 'Krishnan', surname: 'Nair',        email: 'k.nair@email.com',     phone: '9100000004', address: '77 Madhapur, HYD',         father_name: 'Kiran Nair',    mother_name: 'Kamala Nair',   guardian_name: 'Krishnan Nair', secondary_phone: '' },
    { id: 'par-005',        username: 'adesai',      name: 'Amita',    surname: 'Desai',       email: 'a.desai@email.com',    phone: '9100000005', address: '4 Gachibowli, HYD',        father_name: 'Arvind Desai',  mother_name: 'Amita Desai',   guardian_name: 'Amita Desai',   secondary_phone: '' },
    { id: 'par-006',        username: 'bsharma',     name: 'Bharat',   surname: 'Sharma',      email: 'b.sharma@email.com',   phone: '9100000006', address: '21 Secunderabad, HYD',     father_name: 'Babu Sharma',   mother_name: 'Bimla Sharma',  guardian_name: 'Bharat Sharma', secondary_phone: '' },
    { id: 'par-007',        username: 'lsrivastava', name: 'Lalita',   surname: 'Srivastava',  email: 'l.sri@email.com',      phone: '9100000007', address: '56 KPHB, HYD',             father_name: 'Laxman Sri',    mother_name: 'Leela Sri',     guardian_name: 'Lalita Sri',    secondary_phone: '' },
    { id: 'par-008',        username: 'gmenon',      name: 'Govind',   surname: 'Menon',       email: 'g.menon@email.com',    phone: '9100000008', address: '38 Ameerpet, HYD',         father_name: 'Ganga Menon',   mother_name: 'Gita Menon',    guardian_name: 'Govind Menon',  secondary_phone: '' },
  ];
  BASE_PARENTS.forEach(p => { newParentsMap[p.id] = p; });
  
  const originalMapped = defaultStudents.map((s, idx) => {
    const admNum = `ADM2026${String(idx + 1).padStart(3, '0')}`;
    const password = s.name + formatDOB(s.birthday);
    
    let cId = 'c-4';
    let sId = 'sec-4a';
    if (s.class_id === 'cls-1a' || s.class_id === 'c-1') { cId = 'c-1'; sId = 'sec-1a'; }
    else if (s.class_id === 'cls-1b' || s.class_id === 'c-1') { cId = 'c-1'; sId = 'sec-1b'; }
    else if (s.class_id === 'cls-2a' || s.class_id === 'c-2') { cId = 'c-2'; sId = 'sec-2a'; }
    else if (s.class_id === 'cls-2b' || s.class_id === 'c-2') { cId = 'c-2'; sId = 'sec-2b'; }
    else if (s.class_id === 'cls-3a' || s.class_id === 'c-3') { cId = 'c-3'; sId = 'sec-3a'; }
    else if (s.class_id === 'cls-4a' || s.class_id === 'c-4') { cId = 'c-4'; sId = 'sec-4a'; }
    else if (s.class_id === 'cls-5a' || s.class_id === 'c-5') { cId = 'c-5'; sId = 'sec-5a'; }

    // Ensure base parents exist in map (original students use the 8 base parents)
    // parent_id already set from rawStudents; newParentsMap was pre-seeded above

    return {
      ...s,
      admission_number: admNum,
      username: admNum,
      password: password,
      class_id: cId,
      grade_id: sId,
      roll_number: String(idx + 1).padStart(2, '0'),
      status: s.status || 'ACTIVE'
    };
  });

  const originalMap: Record<string, Student[]> = {};
  originalMapped.forEach(s => {
    const key = `${s.class_id}::${s.grade_id}`;
    if (!originalMap[key]) originalMap[key] = [];
    originalMap[key].push(s);
  });

  let globalStudentNum = 11;
  
  for (let c = 1; c <= 10; c++) {
    for (const secName of ['A', 'B', 'C']) {
      const secId = `sec-${c}${secName.toLowerCase()}`;
      const classId = `c-${c}`;
      
      const originals = originalMap[`${classId}::${secId}`] || [];
      newStudentsList.push(...originals);

      const newNeededCount = 10 - originals.length;
      for (let sNum = 0; sNum < newNeededCount; sNum++) {
        const isBoy = (globalStudentNum % 2 === 0);
        const fName = isBoy
          ? FIRST_NAMES_BOY[globalStudentNum % FIRST_NAMES_BOY.length]
          : FIRST_NAMES_GIRL[globalStudentNum % FIRST_NAMES_GIRL.length];
        const lName = SURNAMES[globalStudentNum % SURNAMES.length];

        const admNum = `ADM2026${String(globalStudentNum).padStart(3, '0')}`;

        const birthYear = 2021 - c;
        const birthMonth = String(1 + (globalStudentNum % 12)).padStart(2, '0');
        const birthDay = String(1 + (globalStudentNum % 28)).padStart(2, '0');
        const birthday = `${birthYear}-${birthMonth}-${birthDay}`;
        const password = fName + formatDOB(birthday);

        // ── Generate a unique parent for every new student ──────────────────
        // Each student gets their own dedicated parent record with a real phone number.
        // Phone: 91000 + zero-padded globalStudentNum (unique per student)
        const parentId = `par-seed-${globalStudentNum}`;
        const isMomFamily = globalStudentNum % 3 === 0; // 1/3 single-mother households
        const parentFName = isMomFamily
          ? PARENT_FIRST_NAMES_FEMALE[globalStudentNum % PARENT_FIRST_NAMES_FEMALE.length]
          : PARENT_FIRST_NAMES_MALE[globalStudentNum % PARENT_FIRST_NAMES_MALE.length];
        const parentPhone = `9${String(10000000 + globalStudentNum).padStart(9, '0')}`;

        if (!newParentsMap[parentId]) {
          newParentsMap[parentId] = {
            id: parentId,
            username: parentPhone,
            name: parentFName,
            surname: lName,
            email: `${parentFName.toLowerCase()}.${lName.toLowerCase()}@email.com`,
            phone: parentPhone,
            address: `${10 + (globalStudentNum % 90)} Road, Hyderabad`,
            father_name: isMomFamily ? '' : `${parentFName} ${lName}`,
            mother_name: isMomFamily ? `${parentFName} ${lName}` : '',
            guardian_name: `${parentFName} ${lName}`,
            secondary_phone: '',
          };
        }

        newStudentsList.push({
          id: `std-${2000 + globalStudentNum}`,
          username: admNum,
          password: password,
          name: fName,
          surname: lName,
          email: `${fName.toLowerCase()}.${lName.toLowerCase()}@school.com`,
          phone: null,
          address: `${10 + (globalStudentNum % 90)} Road, Hyderabad`,
          blood_type: ['A+', 'B+', 'O+', 'AB+'][globalStudentNum % 4],
          sex: isBoy ? 'MALE' : 'FEMALE',
          birthday: birthday,
          class_id: classId,
          parent_id: parentId,
          roll_number: String(originals.length + sNum + 1).padStart(2, '0'),
          admission_number: admNum,
          admission_date: `2026-06-01`,
          status: 'ACTIVE',
          grade_id: secId,
        });

        globalStudentNum++;
      }
    }
  }

  STUDENTS = newStudentsList;

  // ── Persist generated parents ────────────────────────────────────────────
  // Collect all unique parents (base 8 + newly seeded) and save to localStorage
  const allParents = Object.values(newParentsMap);
  localStorage.setItem('erp_parents', JSON.stringify(allParents));

  // ── Clear stale credentials so they rebuild from the new student/parent data
  localStorage.removeItem('erp_credentials');

  STUDENT_LEDGER = {};
  STUDENTS.forEach(student => {
    const classFees = FEE_STRUCTURES.filter(f => f.class_id === student.class_id);
    const totalFee = classFees.reduce((sum, f) => sum + f.amount, 0);

    const hash = student.username.charCodeAt(student.username.length - 1) % 4;
    let paidAmount = 0;
    if (student.id === 'usr-student-001') {
      paidAmount = totalFee - 5000;
    } else if (hash === 0) {
      paidAmount = totalFee;
    } else if (hash === 1) {
      paidAmount = Math.round(totalFee * 0.7);
    } else {
      paidAmount = 0;
    }

    const pendingAmount = Math.max(0, totalFee - paidAmount);

    STUDENT_LEDGER[student.id] = {
      studentId: student.id,
      totalFee,
      paidAmount,
      pendingAmount,
      overdueAmount: pendingAmount > 0 ? Math.round(pendingAmount * 0.2) : 0,
      payments: paidAmount > 0 ? [
        {
          receiptNumber: `REC-2026-${student.id.replace('std-', '')}`,
          date: '2026-06-10',
          amount: paidAmount,
          paymentMethod: 'UPI (GPay)',
          transactionId: `TXN${987654321 + (student.id.charCodeAt(student.id.length - 1) * 100)}`,
          status: 'PAID',
          upiProofUrl: null
        }
      ] : []
    };
  });

  saveAcademicState();
  localStorage.setItem('erp_seeded_v2', 'true');
  console.log(`[ERP Seed] Completed. Students: ${STUDENTS.length}, Parents: ${Object.keys(newParentsMap).length}`);
};

// Re-seed if: first visit, OR old seed flag (no parent data), OR student count wrong
if (!localStorage.getItem('erp_seeded_v2') || STUDENTS.length < 300 || !localStorage.getItem('erp_parents')) {
  runERPSeed();
}

// ─── Subject CRUD ─────────────────────────────────────────────────────────
export const createSubject = (s: Omit<Subject, 'id' | 'created_at'>): Subject => {
  const newSubject: Subject = { ...s, id: `sub-${Date.now().toString().slice(-8)}`, created_at: new Date().toISOString().split('T')[0] };
  SUBJECTS.push(newSubject);
  saveAcademicState();
  return newSubject;
};

export const updateSubject = (id: string, updates: Partial<Subject>) => {
  SUBJECTS = SUBJECTS.map(s => s.id === id ? { ...s, ...updates } : s);
  saveAcademicState();
};

export const deleteSubject = (id: string) => {
  SUBJECTS = SUBJECTS.filter(s => s.id !== id);
  // Cascade: remove class mappings for this subject
  SUBJECT_CLASS_MAPPINGS = SUBJECT_CLASS_MAPPINGS.filter(m => m.subject_id !== id);
  // Cascade: remove teacher assignments for this subject
  TEACHER_ASSIGNMENTS = TEACHER_ASSIGNMENTS.filter(a => a.subject_id !== id);
  saveAcademicState();
};

// ─── Subject-Class Mapping CRUD ───────────────────────────────────────────
export const addSubjectMapping = (m: Omit<SubjectClassMapping, 'id'>): SubjectClassMapping => {
  const newMap: SubjectClassMapping = { ...m, id: `sm-${Date.now().toString().slice(-8)}` };
  SUBJECT_CLASS_MAPPINGS.push(newMap);
  saveAcademicState();
  return newMap;
};

export const removeSubjectMapping = (id: string) => {
  SUBJECT_CLASS_MAPPINGS = SUBJECT_CLASS_MAPPINGS.filter(m => m.id !== id);
  saveAcademicState();
};

// Helper: get subjects assigned to a given class (and optionally section)
export const getSubjectsForClass = (classId: string, sectionId?: string): Subject[] => {
  const mappings = SUBJECT_CLASS_MAPPINGS.filter(m =>
    m.class_id === classId &&
    (m.section_id === '' || !sectionId || m.section_id === sectionId)
  );
  const subjectIds = new Set(mappings.map(m => m.subject_id));
  return SUBJECTS.filter(s => subjectIds.has(s.id) && s.status === 'ACTIVE');
};

// Helper: get subjects a teacher can teach (based on teacher assignments)
export const getSubjectsForTeacher = (teacherId: string, classId?: string, sectionId?: string): Subject[] => {
  const filtered = TEACHER_ASSIGNMENTS.filter(a =>
    a.teacher_id === teacherId &&
    (!classId || a.class_id === classId) &&
    (!sectionId || a.section_id === sectionId)
  );
  const subjectIds = new Set(filtered.map(a => a.subject_id));
  return SUBJECTS.filter(s => subjectIds.has(s.id));
};

// Recomputes the entire fee balance ledger for a single student based on their class fee structures
export const recalculateStudentLedger = (studentId: string) => {
  const student = STUDENTS.find(s => s.id === studentId);
  if (!student) return;

  const classFees = FEE_STRUCTURES.filter(f => f.class_id === student.class_id);
  const totalFee = classFees.reduce((sum, f) => sum + f.amount, 0);

  // Retrieve existing ledger info or build default
  const existing = STUDENT_LEDGER[studentId] || {
    studentId,
    totalFee: 0,
    paidAmount: 0,
    pendingAmount: 0,
    overdueAmount: 0,
    payments: []
  };

  const paidAmount = existing.payments
    .filter(p => p.status === 'PAID')
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingAmount = Math.max(0, totalFee - paidAmount);
  // Simulat overdue if pending is > 0 and student is not newly created
  const overdueAmount = pendingAmount > 0 && studentId !== 'new' ? Math.round(pendingAmount * 0.4) : 0;

  STUDENT_LEDGER[studentId] = {
    ...existing,
    totalFee,
    paidAmount,
    pendingAmount,
    overdueAmount
  };
  saveAcademicState();
};

// Trigger full initialization for ledgers if empty
if (Object.keys(STUDENT_LEDGER).length === 0) {
  STUDENTS.forEach(student => {
    // Check if they had default paidAmount from old studentDetailsMockData
    let paidAmount = 20000;
    if (student.id === 'usr-student-001') paidAmount = 43000;
    else if (student.id === 'std-002') paidAmount = 32000;

    const classFees = FEE_STRUCTURES.filter(f => f.class_id === student.class_id);
    const totalFee = classFees.reduce((sum, f) => sum + f.amount, 0);
    const pendingAmount = Math.max(0, totalFee - paidAmount);

    STUDENT_LEDGER[student.id] = {
      studentId: student.id,
      totalFee,
      paidAmount,
      pendingAmount,
      overdueAmount: pendingAmount > 0 ? Math.round(pendingAmount * 0.2) : 0,
      payments: paidAmount > 0 ? [
        {
          receiptNumber: `REC-2026-FEE`,
          date: '2026-04-10',
          amount: paidAmount,
          paymentMethod: 'UPI (GPay)',
          transactionId: `TXN${987654123}`,
          status: 'PAID'
        }
      ] : []
    };
  });
  saveAcademicState();
}

// --- Dynamic CRUD Setters ---

export const createClass = (c: Omit<AcademicClass, 'id'>) => {
  const newClass: AcademicClass = { ...c, id: `c-${Date.now().toString().slice(-6)}` };
  CLASSES.push(newClass);
  saveAcademicState();
  return newClass;
};

export const updateClass = (id: string, updates: Partial<AcademicClass>) => {
  CLASSES = CLASSES.map(c => c.id === id ? { ...c, ...updates } : c);
  saveAcademicState();
};

export const deleteClass = (id: string) => {
  CLASSES = CLASSES.filter(c => c.id !== id);
  // Cascade delete sections
  SECTIONS = SECTIONS.filter(s => s.class_id !== id);
  saveAcademicState();
};

export const createSection = (s: Omit<AcademicSection, 'id'>) => {
  const newSection: AcademicSection = { ...s, id: `sec-${Date.now().toString().slice(-6)}` };
  SECTIONS.push(newSection);
  saveAcademicState();
  return newSection;
};

export const updateSection = (id: string, updates: Partial<AcademicSection>) => {
  SECTIONS = SECTIONS.map(s => s.id === id ? { ...s, ...updates } : s);
  saveAcademicState();
};

export const deleteSection = (id: string) => {
  SECTIONS = SECTIONS.filter(s => s.id !== id);
  // Clear assigned students' section pointers
  STUDENTS = STUDENTS.map(s => s.grade_id === id ? { ...s, grade_id: '' } : s);
  saveAcademicState();
};

export const assignStudentToSection = (studentId: string, classId: string, sectionId: string) => {
  STUDENTS = STUDENTS.map(s => s.id === studentId ? { ...s, class_id: classId, grade_id: sectionId } : s);
  saveAcademicState();
  recalculateStudentLedger(studentId);
};

export const removeStudentFromSection = (studentId: string) => {
  STUDENTS = STUDENTS.map(s => s.id === studentId ? { ...s, class_id: '', grade_id: '' } : s);
  saveAcademicState();
  recalculateStudentLedger(studentId);
};

export const assignTeacher = (tId: string, cId: string, sId: string, subId: string) => {
  const newAssignment: TeacherAssignment = {
    id: `asg-${Date.now().toString().slice(-6)}`,
    teacher_id: tId,
    class_id: cId,
    section_id: sId,
    subject_id: subId
  };
  TEACHER_ASSIGNMENTS.push(newAssignment);
  saveAcademicState();
  return newAssignment;
};

export const removeTeacherAssignment = (id: string) => {
  TEACHER_ASSIGNMENTS = TEACHER_ASSIGNMENTS.filter(a => a.id !== id);
  saveAcademicState();
};

export const createFeeStructure = (fee: Omit<FeeItem, 'id'>) => {
  const newFee: FeeItem = { ...fee, id: `fee-${Date.now().toString().slice(-6)}` };
  FEE_STRUCTURES.push(newFee);
  saveAcademicState();
  
  // Recalculate ledger for all students in that class
  STUDENTS.forEach(student => {
    if (student.class_id === fee.class_id) {
      recalculateStudentLedger(student.id);
    }
  });
  return newFee;
};

export const removeFeeStructure = (id: string) => {
  const fee = FEE_STRUCTURES.find(f => f.id === id);
  FEE_STRUCTURES = FEE_STRUCTURES.filter(f => f.id !== id);
  saveAcademicState();

  if (fee) {
    STUDENTS.forEach(student => {
      if (student.class_id === fee.class_id) {
        recalculateStudentLedger(student.id);
      }
    });
  }
};

// ─── Phase 1: Teacher Assignment Service Layer ─────────────────────────────
// Single source of truth: TEACHER_ASSIGNMENTS drives all teacher-class-section-subject relations.

export interface AssignmentRow {
  class_id: string;
  section_id: string;
  subject_ids: string[];
}

export interface ResolvedAssignment {
  id: string;
  class_id: string;
  className: string;
  section_id: string;
  sectionCode: string;
  subject_id: string;
  subjectName: string;
  subjectCode: string;
}

export interface TeacherAssignmentSummary {
  subjectNames: string[];
  classNames: string[];
  sectionCodes: string[];
  studentsCount: number;
  assignments: ResolvedAssignment[];
}

/** Returns all assignments for a teacher with human-readable resolved names */
export const getTeacherAssignments = (teacherId: string): ResolvedAssignment[] => {
  return TEACHER_ASSIGNMENTS
    .filter(a => a.teacher_id === teacherId)
    .map(a => {
      const cls = CLASSES.find(c => c.id === a.class_id);
      const sec = SECTIONS.find(s => s.id === a.section_id);
      const sub = SUBJECTS.find(s => s.id === a.subject_id);
      return {
        id: a.id,
        class_id: a.class_id,
        className: cls?.name ?? a.class_id,
        section_id: a.section_id,
        sectionCode: sec?.code ?? a.section_id,
        subject_id: a.subject_id,
        subjectName: sub?.name ?? a.subject_id,
        subjectCode: sub?.code ?? ''
      };
    });
};

/** Returns a compact summary for display in the teacher list table */
export const getTeacherAssignmentSummary = (teacherId: string): TeacherAssignmentSummary => {
  const resolved = getTeacherAssignments(teacherId);

  const subjectNames  = [...new Set(resolved.map(r => r.subjectName))];
  const classNames    = [...new Set(resolved.map(r => r.className))];
  const sectionCodes  = [...new Set(resolved.map(r => r.sectionCode))];

  // Count unique active students across all assigned class+section combos
  const classSectionKeys = [...new Set(resolved.map(r => `${r.class_id}::${r.section_id}`))];
  const studentsCount = STUDENTS.filter(s =>
    classSectionKeys.includes(`${s.class_id}::${s.grade_id}`) && s.status === 'ACTIVE'
  ).length;

  return { subjectNames, classNames, sectionCodes, studentsCount, assignments: resolved };
};

/** Remove all assignments for a teacher (used before replacing on edit) */
export const removeAllTeacherAssignments = (teacherId: string) => {
  TEACHER_ASSIGNMENTS = TEACHER_ASSIGNMENTS.filter(a => a.teacher_id !== teacherId);
  saveAcademicState();
};

/**
 * Atomically replaces all assignments for a teacher.
 * Accepts an array of AssignmentRow (class + section + subject_ids[]).
 * One TEACHER_ASSIGNMENT record is created per subject in each row.
 */
export const replaceTeacherAssignments = (teacherId: string, rows: AssignmentRow[]): TeacherAssignment[] => {
  // Remove old
  TEACHER_ASSIGNMENTS = TEACHER_ASSIGNMENTS.filter(a => a.teacher_id !== teacherId);

  // Create new
  const created: TeacherAssignment[] = [];
  const timestamp = Date.now();
  rows.forEach((row, rowIdx) => {
    row.subject_ids.forEach((subId, subIdx) => {
      if (!row.class_id || !row.section_id || !subId) return;
      const newAsg: TeacherAssignment = {
        id: `asg-${timestamp}-${rowIdx}-${subIdx}`,
        teacher_id: teacherId,
        class_id: row.class_id,
        section_id: row.section_id,
        subject_id: subId
      };
      TEACHER_ASSIGNMENTS.push(newAsg);
      created.push(newAsg);
    });
  });

  saveAcademicState();
  return created;
};

/** Derive subject_ids[] from current assignments — for backward compat with teacher_subjects[] field */
export const deriveTeacherSubjectIds = (teacherId: string): string[] => {
  return [...new Set(
    TEACHER_ASSIGNMENTS.filter(a => a.teacher_id === teacherId).map(a => a.subject_id)
  )];
};

