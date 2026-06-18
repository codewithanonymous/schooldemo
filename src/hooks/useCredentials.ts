/**
 * useCredentials.ts — Custom hook wrapping the Credentials_Store
 *
 * Provides reactive credential state and all mutation functions.
 * All writes go through applyMutation, which persists to localStorage
 * before updating React state — guaranteeing the two are never out of sync.
 *
 * Requirements covered: 7.5, 7.6, 7.7, 7.8, 9.3, 12.2
 */

import { useState, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';

import {
  CREDENTIALS,
  STUDENTS,
  PARENTS,
  STAFF,
  applyAutoGeneration,
  computeSummary,
  generateResetPassword,
  enrichCredential,
} from '../data/credentialsMockData';

import type { UserCredential, AutoGenerationResult, CredentialSummary } from '../types/credentials';
import type { Student, Parent } from '../types/student';
import type { StaffMember } from '../types/staff';

// ---------------------------------------------------------------------------
// Hook return type
// ---------------------------------------------------------------------------
export interface UseCredentialsReturn {
  /** Live credential array — the single source of truth for all UI components */
  credentials: UserCredential[];

  /** Five derived dashboard card counts, re-computed on every render */
  summary: CredentialSummary;

  /**
   * Reset the password for a single credential.
   * Persists to localStorage before updating state (Req 7.5, 7.8, 12.2).
   */
  resetPassword: (id: string, newPassword: string) => void;

  /**
   * Activate or deactivate a credential.
   * Persists to localStorage before updating state (Req 7.6, 7.7, 7.8, 12.2).
   */
  setStatus: (id: string, status: 'active' | 'inactive') => void;

  /**
   * Auto-generate (or overwrite) credentials for a list of entity ids under
   * the given role.  Persists batch to localStorage and returns the result
   * including any skipped entities (Req 9.3).
   */
  generateBulk: (
    entityIds: string[],
    role: 'student' | 'parent' | 'teacher' | 'staff' | 'admin',
  ) => AutoGenerationResult;

  /** Re-exported from credentialsMockData for caller convenience */
  generateResetPassword: () => string;

  /** Re-exported from credentialsMockData for UI components that need enriched rows */
  enrichCredential: typeof enrichCredential;
}

// ---------------------------------------------------------------------------
// Hook implementation
// ---------------------------------------------------------------------------
export function useCredentials(): UseCredentialsReturn {
  // Initialise from the module-level CREDENTIALS export (seeded from
  // localStorage or auto-generated on first load in credentialsMockData.ts).
  const [credentials, setCredentials] = useState<UserCredential[]>(() => CREDENTIALS);

  // useRef so that applyMutation always reads the *latest* snapshot without
  // needing credentials as a closure dependency (avoids stale state in callbacks).
  const credentialsRef = useRef<UserCredential[]>(credentials);

  // Keep ref in sync whenever state updates
  // (done via the setter wrapper below instead of useEffect to avoid an extra render cycle)
  const updateCredentials = useCallback((next: UserCredential[]) => {
    credentialsRef.current = next;
    setCredentials(next);
  }, []);

  // ---------------------------------------------------------------------------
  // applyMutation — the single write path for all mutations (Req 7.8, 12.2)
  //
  // 1. Compute the next state via the caller-supplied updater function.
  // 2. Attempt to persist to localStorage.
  // 3. Only update React state on success — in-memory state never diverges
  //    from what is stored on disk.
  // ---------------------------------------------------------------------------
  const applyMutation = useCallback(
    (updater: (prev: UserCredential[]) => UserCredential[]): void => {
      const next = updater(credentialsRef.current);
      try {
        localStorage.setItem('erp_credentials', JSON.stringify(next));
        updateCredentials(next);
      } catch (err) {
        toast.error('Failed to save changes — please try again');
        // credentialsRef.current is unchanged — in-memory state not mutated
      }
    },
    [updateCredentials],
  );

  // ---------------------------------------------------------------------------
  // resetPassword — Req 7.5, 12.2
  // ---------------------------------------------------------------------------
  const resetPassword = useCallback(
    (id: string, newPassword: string): void => {
      applyMutation((prev) =>
        prev.map((cred) =>
          cred.id === id ? { ...cred, password: newPassword } : cred,
        ),
      );
    },
    [applyMutation],
  );

  // ---------------------------------------------------------------------------
  // setStatus — Req 7.6, 7.7, 12.2
  // ---------------------------------------------------------------------------
  const setStatus = useCallback(
    (id: string, status: 'active' | 'inactive'): void => {
      applyMutation((prev) =>
        prev.map((cred) =>
          cred.id === id ? { ...cred, status } : cred,
        ),
      );
    },
    [applyMutation],
  );

  // ---------------------------------------------------------------------------
  // generateBulk — Req 9.3
  //
  // Resolves the target entities from the current credentials ref (using
  // linkedEntityId) then calls applyAutoGeneration.  The resulting array is
  // persisted and state updated via applyMutation's write path.
  // ---------------------------------------------------------------------------
  const generateBulk = useCallback(
    (
      entityIds: string[],
      role: 'student' | 'parent' | 'teacher' | 'staff' | 'admin',
    ): AutoGenerationResult => {
      // Determine which source array to look up entities from
      const sourceArray: (Student | Parent | StaffMember)[] =
        role === 'student'
          ? (STUDENTS as Student[])
          : role === 'parent'
            ? (PARENTS as Parent[])
            : (STAFF as StaffMember[]);

      const targetEntities = sourceArray.filter((e) => entityIds.includes(e.id));

      // Run the auto-generation algorithm against the current in-memory state
      const result = applyAutoGeneration(credentialsRef.current, targetEntities, role);

      // Persist and update state (only on localStorage success)
      try {
        localStorage.setItem('erp_credentials', JSON.stringify(result.generated));
        updateCredentials(result.generated);
      } catch (err) {
        toast.error('Failed to save changes — please try again');
      }

      return result;
    },
    [updateCredentials],
  );

  // ---------------------------------------------------------------------------
  // Derived summary — recomputed on every render from live state (Req 2.1)
  // ---------------------------------------------------------------------------
  const summary = computeSummary(credentials);

  return {
    credentials,
    summary,
    resetPassword,
    setStatus,
    generateBulk,
    generateResetPassword,
    enrichCredential,
  };
}
