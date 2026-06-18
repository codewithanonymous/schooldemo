/**
 * credentialService.ts — Service Layer for Credential Management
 *
 * All UI components must access credential data through this service.
 * Never import from credentialsMockData.ts directly in components.
 *
 * Architecture: UI → credentialService → credentialsMockData → localStorage
 */

import {
  CREDENTIALS,
  STUDENTS,
  PARENTS,
  STAFF,
  getAllParents,
  computeSummary,
  applyAutoGeneration,
  generateResetPassword,
  saveCredentials,
  generateCredential,
} from '../data/credentialsMockData';
import { CLASSES, SECTIONS } from '../data/academicMockData';
import type { UserCredential, CredentialSummary, AutoGenerationResult } from '../types/credentials';
import type { Student, Parent } from '../types/student';
import type { StaffMember } from '../types/staff';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CredentialFilters {
  search?: string;
  classId?: string;
  sectionId?: string;
  status?: 'active' | 'inactive' | 'all';
  department?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CredentialRow {
  credential: UserCredential;
  // Student fields
  fullName?: string;
  admissionNumber?: string;
  className?: string;
  sectionName?: string;
  // Parent fields
  parentName?: string;
  linkedStudentName?: string;
  linkedAdmissionNumber?: string;
  phone?: string;
  // Staff fields
  employeeId?: string;
  designation?: string;
  department?: string;
  joiningYear?: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

let _credentials: UserCredential[] = [...CREDENTIALS];

function persist(updated: UserCredential[]): void {
  _credentials = updated;
  saveCredentials(updated);
}

function applyFilter(rows: CredentialRow[], filters: CredentialFilters): CredentialRow[] {
  const q = filters.search?.toLowerCase().trim() ?? '';
  return rows.filter((row) => {
    // Status filter
    if (filters.status && filters.status !== 'all') {
      if (row.credential.status !== filters.status) return false;
    }

    // Search filter — multi-field
    if (q) {
      const searchable = [
        row.fullName,
        row.parentName,
        row.admissionNumber,
        row.linkedStudentName,
        row.linkedAdmissionNumber,
        row.phone,
        row.employeeId,
        row.designation,
        row.credential.username,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (!searchable.includes(q)) return false;
    }

    // Class filter
    if (filters.classId && filters.classId !== 'all') {
      if (row.className !== filters.classId) return false;
    }

    // Section filter
    if (filters.sectionId && filters.sectionId !== 'all') {
      if (row.sectionName !== filters.sectionId) return false;
    }

    // Department filter
    if (filters.department && filters.department !== 'all') {
      if (row.department !== filters.department) return false;
    }

    return true;
  });
}

// ---------------------------------------------------------------------------
// Summary KPI
// ---------------------------------------------------------------------------

export function getSummary(): CredentialSummary & {
  totalTeachers: number;
  totalNonTeachingStaff: number;
} {
  const base = computeSummary(_credentials);

  // Split staff into teachers vs non-teaching
  const totalTeachers = _credentials.filter((c) => c.role === 'teacher').length;
  const totalNonTeachingStaff = _credentials.filter((c) => c.role === 'staff' || c.role === 'admin').length;

  return { ...base, totalTeachers, totalNonTeachingStaff };
}

// ---------------------------------------------------------------------------
// Get credential rows for each tab
// ---------------------------------------------------------------------------

export function getStudentRows(filters: CredentialFilters = {}): CredentialRow[] {
  const studentCreds = _credentials.filter((c) => c.role === 'student');

  const rows: CredentialRow[] = studentCreds.map((cred) => {
    const student = (STUDENTS as Student[]).find((s) => s.id === cred.linkedEntityId);
    if (!student) return { credential: cred };

    const classObj = CLASSES.find((c) => c.id === student.class_id);
    const sectionObj = SECTIONS.find((s) => s.id === student.grade_id);

    return {
      credential: cred,
      fullName: `${student.name} ${student.surname}`,
      admissionNumber: student.admission_number,
      className: classObj?.name ?? '',
      sectionName: sectionObj?.name ?? '',
    };
  });

  return applyFilter(rows, filters);
}

export function getParentRows(filters: CredentialFilters = {}): CredentialRow[] {
  const parentCreds = _credentials.filter((c) => c.role === 'parent');
  // Use getAllParents() to get the full 290+ parent set from erp_parents
  const allParents = getAllParents();

  const rows: CredentialRow[] = parentCreds.map((cred) => {
    const parent = allParents.find((p) => p.id === cred.linkedEntityId);
    if (!parent) return { credential: cred };

    const linkedStudent = (STUDENTS as Student[]).find((s) => s.parent_id === parent.id);

    return {
      credential: cred,
      parentName: `${parent.name} ${parent.surname ?? ''}`.trim(),
      phone: parent.phone,
      linkedStudentName: linkedStudent
        ? `${linkedStudent.name} ${linkedStudent.surname}`
        : undefined,
      linkedAdmissionNumber: linkedStudent?.admission_number,
    };
  });

  return applyFilter(rows, filters);
}

export function getTeacherRows(filters: CredentialFilters = {}): CredentialRow[] {
  const teacherCreds = _credentials.filter((c) => c.role === 'teacher');

  const rows: CredentialRow[] = teacherCreds.map((cred) => {
    const member = (STAFF as StaffMember[]).find((s) => s.id === cred.linkedEntityId);
    if (!member) return { credential: cred };

    const empId =
      (member as StaffMember & { employee_id?: string }).employee_id ??
      cred.username;

    return {
      credential: cred,
      fullName: `${member.name} ${member.surname}`,
      employeeId: empId,
      designation: member.designation,
      department: member.department,
      joiningYear: member.joining_date?.slice(0, 4) ?? '',
    };
  });

  return applyFilter(rows, filters);
}

export function getStaffRows(filters: CredentialFilters = {}): CredentialRow[] {
  const staffCreds = _credentials.filter(
    (c) => c.role === 'staff' || c.role === 'admin',
  );

  const rows: CredentialRow[] = staffCreds.map((cred) => {
    const member = (STAFF as StaffMember[]).find((s) => s.id === cred.linkedEntityId);
    if (!member) return { credential: cred };

    const empId =
      (member as StaffMember & { employee_id?: string }).employee_id ??
      cred.username;

    return {
      credential: cred,
      fullName: `${member.name} ${member.surname}`,
      employeeId: empId,
      designation: member.designation,
      department: member.department,
      joiningYear: member.joining_date?.slice(0, 4) ?? '',
    };
  });

  return applyFilter(rows, filters);
}

// ---------------------------------------------------------------------------
// Get detail row by credential id
// ---------------------------------------------------------------------------

export function getDetailRow(credentialId: string): CredentialRow | null {
  const cred = _credentials.find((c) => c.id === credentialId);
  if (!cred) return null;

  if (cred.role === 'student') {
    const found = getStudentRows().find((r) => r.credential.id === credentialId);
    return found ?? { credential: cred };
  }
  if (cred.role === 'parent') {
    const found = getParentRows().find((r) => r.credential.id === credentialId);
    return found ?? { credential: cred };
  }
  if (cred.role === 'teacher') {
    const found = getTeacherRows().find((r) => r.credential.id === credentialId);
    return found ?? { credential: cred };
  }
  const found = getStaffRows().find((r) => r.credential.id === credentialId);
  return found ?? { credential: cred };
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function resetPassword(credentialId: string, newPassword: string): boolean {
  const idx = _credentials.findIndex((c) => c.id === credentialId);
  if (idx < 0) return false;

  const updated = _credentials.map((c, i) =>
    i === idx ? { ...c, password: newPassword } : c,
  );
  persist(updated);
  return true;
}

export function setStatus(
  credentialId: string,
  status: 'active' | 'inactive',
): boolean {
  const idx = _credentials.findIndex((c) => c.id === credentialId);
  if (idx < 0) return false;

  const updated = _credentials.map((c, i) =>
    i === idx ? { ...c, status } : c,
  );
  persist(updated);
  return true;
}

export function generateNewResetPassword(): string {
  return generateResetPassword();
}

// ---------------------------------------------------------------------------
// Bulk actions
// ---------------------------------------------------------------------------

export function generateMissingCredentials(
  role: 'student' | 'parent' | 'teacher' | 'staff',
): AutoGenerationResult {
  const existingLinkedIds = new Set(
    _credentials.filter((c) => c.role === role).map((c) => c.linkedEntityId),
  );

  let entities: (Student | Parent | StaffMember)[] = [];

  if (role === 'student') {
    entities = (STUDENTS as Student[]).filter((s) => !existingLinkedIds.has(s.id));
  } else if (role === 'parent') {
    // Use getAllParents() to include the full seeded parent set
    entities = getAllParents().filter((p) => !existingLinkedIds.has(p.id));
  } else {
    entities = (STAFF as StaffMember[]).filter(
      (s) => !existingLinkedIds.has(s.id),
    );
  }

  const result = applyAutoGeneration(_credentials, entities, role);
  persist(result.generated);
  return result;
}

export function regenerateAllPasswords(
  role: 'student' | 'parent' | 'teacher' | 'staff',
): number {
  let count = 0;
  const updated = _credentials.map((c) => {
    if (c.role !== role) return c;

    // Re-derive password from source entity
    const sourceEntities: (Student | Parent | StaffMember)[] =
      role === 'student'
        ? (STUDENTS as Student[])
        : role === 'parent'
          ? (PARENTS as Parent[])
          : (STAFF as StaffMember[]);

    const entity = sourceEntities.find((e) => e.id === c.linkedEntityId);
    if (!entity) return c;

    const fresh = generateCredential(entity, role);
    if (!fresh) return c;

    count++;
    return { ...c, password: fresh.password };
  });

  persist(updated);
  return count;
}

export function exportCredentialsToCSV(
  rows: CredentialRow[],
  role: 'student' | 'parent' | 'teacher' | 'staff',
): string {
  if (role === 'student') {
    const headerRow = ['Name', 'Admission Number', 'Class', 'Section', 'Username', 'Password', 'Status', 'Created Date'];
    const dataRows = rows.map((r) => [
      r.fullName ?? '',
      r.admissionNumber ?? '',
      r.className ?? '',
      r.sectionName ?? '',
      r.credential.username,
      r.credential.password,
      r.credential.status,
      r.credential.createdDate,
    ]);
    return [headerRow, ...dataRows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
  }

  if (role === 'parent') {
    const headerRow = ['Parent Name', 'Phone', 'Student Name', 'Admission No', 'Username', 'Password', 'Status', 'Created Date'];
    const dataRows = rows.map((r) => [
      r.parentName ?? '',
      r.phone ?? '',
      r.linkedStudentName ?? '',
      r.linkedAdmissionNumber ?? '',
      r.credential.username,
      r.credential.password,
      r.credential.status,
      r.credential.createdDate,
    ]);
    return [headerRow, ...dataRows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
  }

  // teacher / staff
  const headerRow = ['Name', 'Employee ID', 'Designation', 'Department', 'Username', 'Password', 'Status', 'Created Date'];
  const dataRows = rows.map((r) => [
    r.fullName ?? '',
    r.employeeId ?? '',
    r.designation ?? '',
    r.department ?? '',
    r.credential.username,
    r.credential.password,
    r.credential.status,
    r.credential.createdDate,
  ]);
  return [headerRow, ...dataRows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
}

export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Reload from localStorage (sync after external mutations)
// ---------------------------------------------------------------------------

export function reloadCredentials(): void {
  try {
    const stored = localStorage.getItem('erp_credentials');
    if (stored) {
      const parsed = JSON.parse(stored) as UserCredential[];
      if (Array.isArray(parsed)) {
        _credentials = parsed;
        return;
      }
    }
  } catch (_) {/* ignore */}
  _credentials = [...CREDENTIALS];
}

// ---------------------------------------------------------------------------
// Get live snapshot (for reactive use)
// ---------------------------------------------------------------------------

export function getAllCredentials(): UserCredential[] {
  return _credentials;
}
