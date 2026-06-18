/**
 * Credentials Management Types
 *
 * Supabase-ready interfaces for the admin credentials management feature.
 * These types mirror the planned Supabase `credentials` table schema so that
 * migration requires only swapping the data layer without touching UI components.
 */

// ---------------------------------------------------------------------------
// Core credential record — matches Supabase schema exactly (Requirement 12.4)
// ---------------------------------------------------------------------------

export interface UserCredential {
  /** UUID generated via crypto.randomUUID() */
  id: string;
  role: 'student' | 'parent' | 'teacher' | 'staff' | 'admin';
  username: string;
  password: string;
  /** References Student.id / Parent.id / StaffMember.id */
  linkedEntityId: string;
  status: 'active' | 'inactive';
  /** ISO 8601 datetime string, or null if the user has never logged in */
  lastLogin: string | null;
  /** ISO 8601 date string (YYYY-MM-DD) */
  createdDate: string;
}

// ---------------------------------------------------------------------------
// Enriched display model — merges UserCredential with entity display fields.
// Computed at render time; never stored in the Credentials_Store.
// ---------------------------------------------------------------------------

export interface EnrichedCredentialRow {
  credential: UserCredential;

  // --- Students tab ---
  /** Full name (name + surname) of the linked student */
  fullName?: string;
  admissionNumber?: string;
  className?: string;
  sectionName?: string;

  // --- Parents tab ---
  parentName?: string;
  /** Full name of the parent's linked child student */
  linkedStudentName?: string;
  linkedAdmissionNumber?: string;
  phone?: string;

  // --- Staff tab ---
  employeeId?: string;
  designation?: string;
  department?: string;
}

// ---------------------------------------------------------------------------
// Summary counts — displayed in the five dashboard cards
// ---------------------------------------------------------------------------

export interface CredentialSummary {
  /** Count of UserCredential records where role === 'student' */
  totalStudents: number;
  /** Count of UserCredential records where role === 'parent' */
  totalParents: number;
  /** Count of UserCredential records where role is 'teacher', 'staff', or 'admin' */
  totalStaff: number;
  /** Count of all UserCredential records where status === 'active' */
  activeAccounts: number;
  /** Count of all UserCredential records where status === 'inactive' */
  inactiveAccounts: number;
}

// ---------------------------------------------------------------------------
// Auto-generation result — returned by the Auto_Generation algorithm
// ---------------------------------------------------------------------------

export interface AutoGenerationResult {
  /** Credentials that were successfully generated or overwritten */
  generated: UserCredential[];
  /** Entity names skipped due to missing required source fields */
  skipped: string[];
}
