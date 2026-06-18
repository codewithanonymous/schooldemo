/**
 * credentialsMockData.ts — Credentials_Store
 *
 * Single source of truth for all UserCredential records.
 * Seeded from STUDENTS (academicMockData), PARENTS (mockData) and STAFF (staffDetailsMockData).
 * Persisted to localStorage under the key 'erp_credentials'.
 *
 * Requirements covered: 10.1–10.6, 12.1–12.3, 12.5–12.6, 7.4, 7.8
 */

import { STUDENTS } from './academicMockData';
import { PARENTS as rawParents } from './mockData';
import { defaultStaffList } from './staffDetailsMockData';
import { CLASSES, SECTIONS } from './academicMockData';
import type {
  UserCredential,
  EnrichedCredentialRow,
  CredentialSummary,
  AutoGenerationResult,
} from '../types/credentials';
import type { Student, Parent } from '../types/student';
import type { StaffMember } from '../types/staff';

// ---------------------------------------------------------------------------
// Re-export source arrays for consumers (e.g. useCredentials, tests)
// ---------------------------------------------------------------------------
export { STUDENTS, rawParents as PARENTS, defaultStaffList as STAFF };

// ---------------------------------------------------------------------------
// loadAllParents — returns the full parent list seeded by academicMockData.
//
// academicMockData writes 'erp_parents' (all 290+ parents) during runERPSeed.
// Fallback to the 8-record rawParents from mockData.js if localStorage missing.
// ---------------------------------------------------------------------------
function loadAllParents(): Parent[] {
  try {
    const stored = localStorage.getItem('erp_parents');
    if (stored) {
      const parsed = JSON.parse(stored) as Parent[];
      if (Array.isArray(parsed) && parsed.length > 8) {
        return parsed;
      }
    }
  } catch (_) { /* ignore */ }
  return rawParents as Parent[];
}

// Exported live reference — re-read on every getParentCredentials call
export function getAllParents(): Parent[] {
  return loadAllParents();
}

// Keep PARENTS export pointing at base 8 for backward-compat (other pages use it)
// credentialService uses getAllParents() for credential generation

// ---------------------------------------------------------------------------
// Helper: today as YYYY-MM-DD
// ---------------------------------------------------------------------------
function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

// ---------------------------------------------------------------------------
// generateCredential — derive username & password from entity fields.
//
// Returns null if any required source field is absent (Req 10.6).
// ---------------------------------------------------------------------------

export function generateCredential(
  entity: Student | Parent | StaffMember,
  role: 'student' | 'parent' | 'teacher' | 'staff' | 'admin',
): UserCredential | null {
  const now = todayISO();
  const baseCredential = {
    id: crypto.randomUUID(),
    role,
    linkedEntityId: entity.id,
    status: 'active' as const,
    lastLogin: null,
    createdDate: now,
  };

  if (role === 'student') {
    const student = entity as Student;
    // Req 10.1: username = admission_number; password = name + DDMMYYYY from birthday
    const admissionNumber = student.admission_number;
    const birthday = student.birthday; // YYYY-MM-DD
    const firstName = student.name;

    if (!admissionNumber || !birthday || !firstName) return null;

    const day   = birthday.slice(8, 10);  // DD
    const month = birthday.slice(5, 7);   // MM
    const year  = birthday.slice(0, 4);   // YYYY

    return {
      ...baseCredential,
      username: admissionNumber,
      password: `${firstName}${day}${month}${year}`,
    };
  }

  if (role === 'parent') {
    const parent = entity as Parent;
    // Spec: username = phone digits only
    //       password = firstName + last 4 digits of phone
    // Example: phone=9876543210, name=Ravi → username=9876543210, password=Ravi3210
    const phone = parent.phone;
    const firstName = parent.name ? parent.name.split(' ')[0] : '';

    if (!phone || !firstName) return null;

    const usernameDigits = phone.replace(/\D/g, '');
    if (!usernameDigits) return null;

    const last4 = usernameDigits.slice(-4);

    return {
      ...baseCredential,
      username: usernameDigits,
      password: `${firstName}${last4}`,
    };
  }

  // role is 'teacher' | 'staff' | 'admin'
  const staff = entity as StaffMember;
  // Spec: username = employee_id
  //       password = firstName + joining year
  // Example: employee_id=EMP001, joining_date=2024-06-01 → password=Ramesh2024
  const employeeId = (staff as StaffMember & { employee_id?: string }).employee_id;
  const firstName = staff.name ? staff.name.split(' ')[0] : '';

  if (!employeeId || !firstName) return null;

  const joiningYear = staff.joining_date
    ? staff.joining_date.slice(0, 4)
    : new Date().getFullYear().toString();

  return {
    ...baseCredential,
    username: employeeId,
    password: `${firstName}${joiningYear}`,
  };
}

// ---------------------------------------------------------------------------
// generateResetPassword — 8–16 chars, ≥1 uppercase, ≥1 digit, ≥1 special char.
// (Req 7.4)
// ---------------------------------------------------------------------------
const SPECIAL_CHARS = '!@#$%^&*';
const UPPER_CHARS   = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWER_CHARS   = 'abcdefghijklmnopqrstuvwxyz';
const DIGIT_CHARS   = '0123456789';
const ALL_CHARS     = UPPER_CHARS + LOWER_CHARS + DIGIT_CHARS + SPECIAL_CHARS;

export function generateResetPassword(): string {
  // Guarantee at least one of each required class
  const pick = (chars: string) => chars[Math.floor(Math.random() * chars.length)];

  // Length between 8 and 16
  const length = 8 + Math.floor(Math.random() * 9); // 8..16

  const required = [
    pick(UPPER_CHARS),
    pick(DIGIT_CHARS),
    pick(SPECIAL_CHARS),
  ];

  const remaining: string[] = [];
  for (let i = required.length; i < length; i++) {
    remaining.push(pick(ALL_CHARS));
  }

  // Shuffle all characters together (Fisher-Yates)
  const all = [...required, ...remaining];
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }

  return all.join('');
}

// ---------------------------------------------------------------------------
// enrichCredential — merge credential with entity display fields.
// Returns EnrichedCredentialRow used by UI components (never stored).
// ---------------------------------------------------------------------------
export function enrichCredential(
  credential: UserCredential,
  students: Student[],
  parents: Parent[],
  staff: StaffMember[],
): EnrichedCredentialRow {
  if (credential.role === 'student') {
    const student = students.find(s => s.id === credential.linkedEntityId);
    if (!student) return { credential };

    // Resolve class name from academicMockData CLASSES by class_id
    const classObj  = CLASSES.find(c => c.id === student.class_id);
    // Resolve section name from SECTIONS by grade_id (which stores section id per academicMockData)
    const sectionObj = SECTIONS.find(s => s.id === student.grade_id);

    return {
      credential,
      fullName: `${student.name} ${student.surname}`,
      admissionNumber: student.admission_number,
      className: classObj?.name ?? student.class_id,
      sectionName: sectionObj?.name ?? student.grade_id ?? '',
    };
  }

  if (credential.role === 'parent') {
    const parent = parents.find(p => p.id === credential.linkedEntityId);
    if (!parent) return { credential };

    // Find linked child student
    const linkedStudent = students.find(s => s.parent_id === parent.id);
    const classObj = linkedStudent ? CLASSES.find(c => c.id === linkedStudent.class_id) : undefined;
    const sectionObj = linkedStudent && linkedStudent.grade_id
      ? SECTIONS.find(s => s.id === linkedStudent.grade_id)
      : undefined;

    return {
      credential,
      parentName: `${parent.name} ${parent.surname}`,
      linkedStudentName: linkedStudent ? `${linkedStudent.name} ${linkedStudent.surname}` : undefined,
      linkedAdmissionNumber: linkedStudent?.admission_number,
      phone: parent.phone,
      // Also expose class/section for filtering if needed
      className: classObj?.name,
      sectionName: sectionObj?.name,
    };
  }

  // teacher / staff / admin
  const member = staff.find(s => s.id === credential.linkedEntityId);
  if (!member) return { credential };

  return {
    credential,
    fullName: `${member.name} ${member.surname}`,
    employeeId: (member as StaffMember & { employee_id?: string }).employee_id,
    designation: member.designation,
    department: member.department,
  };
}

// ---------------------------------------------------------------------------
// computeSummary — derive counts from live credential array.
// Teachers (role='teacher') are counted separately from non-teaching staff.
// ---------------------------------------------------------------------------
export function computeSummary(credentials: UserCredential[]): CredentialSummary {
  return {
    totalStudents:    credentials.filter(c => c.role === 'student').length,
    totalParents:     credentials.filter(c => c.role === 'parent').length,
    totalStaff:       credentials.filter(c => c.role === 'teacher' || c.role === 'staff' || c.role === 'admin').length,
    activeAccounts:   credentials.filter(c => c.status === 'active').length,
    inactiveAccounts: credentials.filter(c => c.status === 'inactive').length,
  };
}

// ---------------------------------------------------------------------------
// applyAutoGeneration — upsert credentials for a list of entities.
//
// For each entity: if a record with the same linkedEntityId already exists it
// is overwritten (username + password + role updated), otherwise a new record
// is appended.  (Req 10.5)
//
// Returns AutoGenerationResult with generated[] and skipped[] arrays.
// ---------------------------------------------------------------------------
export function applyAutoGeneration(
  existing: UserCredential[],
  entities: (Student | Parent | StaffMember)[],
  role: 'student' | 'parent' | 'teacher' | 'staff' | 'admin',
): AutoGenerationResult {
  const result: AutoGenerationResult = { generated: [...existing], skipped: [] };

  for (const entity of entities) {
    const cred = generateCredential(entity, role);
    if (!cred) {
      // Missing required fields — skip and record entity name (Req 10.6)
      const name = (entity as Student | StaffMember).name ?? entity.id;
      result.skipped.push(name);
      continue;
    }

    const existingIdx = result.generated.findIndex(
      c => c.linkedEntityId === entity.id,
    );

    if (existingIdx >= 0) {
      // Overwrite existing record, preserve id / lastLogin / createdDate (Req 10.5)
      result.generated[existingIdx] = {
        ...result.generated[existingIdx],
        role: cred.role,
        username: cred.username,
        password: cred.password,
      };
    } else {
      result.generated.push(cred);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// saveCredentials — persist the full credentials array to localStorage.
//
// Wraps localStorage.setItem in try/catch per Req 7.8.
// Returns true on success, false on failure.
// ---------------------------------------------------------------------------
export function saveCredentials(credentials: UserCredential[]): boolean {
  try {
    localStorage.setItem('erp_credentials', JSON.stringify(credentials));
    return true;
  } catch (err) {
    console.error('[Credentials_Store] localStorage write failed:', err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Seed CREDENTIALS array (Req 12.1–12.3)
//
// If 'erp_credentials' key exists in localStorage → load from there.
// Otherwise → auto-generate for all entities and write to localStorage.
// ---------------------------------------------------------------------------

function buildSeedCredentials(): UserCredential[] {
  let seed: UserCredential[] = [];

  // ── Students ────────────────────────────────────────────────────────────
  const studentResult = applyAutoGeneration(seed, STUDENTS, 'student');
  seed = studentResult.generated;
  if (studentResult.skipped.length > 0) {
    console.warn('[Credentials_Store] Skipped students during seed:', studentResult.skipped);
  }

  // ── Parents ─────────────────────────────────────────────────────────────
  // Use ALL seeded parents from erp_parents (290+ records), not just the
  // 8 base parents from mockData.js.  academicMockData.runERPSeed() writes
  // erp_parents before calling initCredentials(), so loadAllParents() returns
  // the full set here.
  const allParents = loadAllParents();
  const parentResult = applyAutoGeneration(seed, allParents, 'parent');
  seed = parentResult.generated;
  if (parentResult.skipped.length > 0) {
    console.warn('[Credentials_Store] Skipped parents during seed:', parentResult.skipped);
  }

  // ── Staff ────────────────────────────────────────────────────────────────
  // Req 12.6: derive fallback employee_id for staff members that lack it.
  // We need a stable index per staff member — use their position in defaultStaffList.
  const staffWithFallback = defaultStaffList.map((member, idx) => {
    const hasEmployeeId = !!(member as StaffMember & { employee_id?: string }).employee_id;
    if (hasEmployeeId) return member;
    // EMP{zero-padded 3-digit index}, e.g. EMP001
    const fallbackId = `EMP${String(idx + 1).padStart(3, '0')}`;
    return { ...member, employee_id: fallbackId };
  });

  // Determine role per staff member
  for (const member of staffWithFallback) {
    const role: 'teacher' | 'staff' | 'admin' =
      member.role === 'Advisory Staff' || member.role === 'Academic Staff'
        ? 'teacher'
        : 'staff';
    const singleResult = applyAutoGeneration(seed, [member], role);
    seed = singleResult.generated;
    if (singleResult.skipped.length > 0) {
      console.warn('[Credentials_Store] Skipped staff member during seed:', singleResult.skipped);
    }
  }

  return seed;
}

function initCredentials(): UserCredential[] {
  const stored = localStorage.getItem('erp_credentials');
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as UserCredential[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (err) {
      console.error('[Credentials_Store] Failed to parse stored credentials, re-seeding.', err);
    }
  }

  // Build seed data and write to localStorage
  const seeded = buildSeedCredentials();
  saveCredentials(seeded);
  return seeded;
}

export let CREDENTIALS: UserCredential[] = initCredentials();
