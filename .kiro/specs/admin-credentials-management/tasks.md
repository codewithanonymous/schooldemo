# Implementation Plan: Admin Credentials Management

## Overview

Implement a centralized Credentials Management page at `/admin/credentials` in the School ERP. The
feature is built with React + Vite + TypeScript using mock data persisted in `localStorage`. It covers
five logical groups: foundation (types, data store, hook), core UI components, page assembly and routing,
export service, and property-based + unit tests.

## Tasks

- [x] 1. Foundation — types, mock data store, and custom hook
  - [x] 1.1 Create `src/types/credentials.ts` — define `UserCredential`, `EnrichedCredentialRow`, `CredentialSummary`, and `AutoGenerationResult` interfaces
    - Export `UserCredential` with fields: `id`, `role`, `username`, `password`, `linkedEntityId`, `status`, `lastLogin`, `createdDate`
    - Export `EnrichedCredentialRow` merging credential + entity display fields (student, parent, staff variants)
    - Export `CredentialSummary` and `AutoGenerationResult` interfaces
    - _Requirements: 12.4_

  - [x] 1.2 Create `src/data/credentialsMockData.ts` — implement `Credentials_Store` with seed logic and localStorage persistence
    - Import entity arrays from `mockData.js` (STUDENTS, PARENTS) and `staffDetailsMockData.ts`
    - Implement `generateCredential(entity, role)` applying auto-generation rules per role (Req 10.1–10.3)
    - Implement `generateResetPassword()` returning an 8–16 char string with ≥1 uppercase, ≥1 digit, ≥1 special char (Req 7.4)
    - Implement `enrichCredential(credential, students, parents, staff, classes, sections)` returning `EnrichedCredentialRow`
    - Implement `computeSummary(credentials)` returning `CredentialSummary`
    - Implement `applyAutoGeneration(existing, entities, role)` with upsert-not-duplicate logic (Req 10.5)
    - Seed `CREDENTIALS` array: read from `localStorage['erp_credentials']` if present; otherwise apply auto-generation to all entities and write to localStorage (Req 12.1–12.3)
    - Wrap every `localStorage.setItem` call in try/catch; do not update in-memory state on failure (Req 7.8)
    - Handle missing `employee_id` on staff using `EMP{zero-padded-index}` fallback (Req 12.6)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 12.1, 12.2, 12.3, 12.5, 12.6_

  - [x] 1.3 Create `src/hooks/useCredentials.ts` — custom hook wrapping the Credentials_Store
    - Expose `credentials: UserCredential[]` state initialized from `CREDENTIALS`
    - Implement `resetPassword(id, newPassword)` — uses `applyMutation` pattern with try/catch around `localStorage.setItem`
    - Implement `setStatus(id, status)` — activates or deactivates a credential; persists to localStorage
    - Implement `generateBulk(entityIds, role)` — calls `applyAutoGeneration`, persists batch; returns `AutoGenerationResult`
    - Return `computeSummary(credentials)` derived value on each render
    - _Requirements: 7.5, 7.6, 7.7, 7.8, 9.3, 12.2_

- [ ] 2. Core UI components
  - [-] 2.1 Create `src/pages/admin/credentials/SummaryCards.tsx`
    - Accept `credentials: UserCredential[]` prop
    - Compute five counts via `useMemo` (totalStudents, totalParents, totalStaff, activeAccounts, inactiveAccounts)
    - Render five stat cards with label and count; re-renders automatically when `credentials` prop changes
    - _Requirements: 2.1, 2.2, 2.3_

  - [-] 2.2 Create `src/pages/admin/credentials/CredentialsTable.tsx`
    - Accept `CredentialsTableProps` as defined in design (tab, rows, selectedIds, visiblePasswordIds, callbacks)
    - Render checkbox column, tab-specific columns (Students/Parents/Staff column sets per design), Actions column
    - Mask passwords with `••••••••` by default; reveal only for ids in `visiblePasswordIds`
    - Render eye-icon toggle button per row for password visibility
    - Actions column: Copy Username, Copy Password, Reset Password, Deactivate/Activate per row; Parents tab uses Copy Credentials
    - Render status cell with amber/orange badge for "inactive" records
    - Header checkbox calls `onSelectAll` (current page rows only)
    - _Requirements: 3.1, 3.6, 4.1, 5.1, 6.1, 6.2, 6.3, 7.1_

  - [~] 2.3 Create `src/pages/admin/credentials/TabPanel.tsx`
    - Accept `TabPanelProps` as defined in design
    - Own local state: `searchQuery`, `filters`, `currentPage`, `selectedIds` (Set), `visiblePasswordIds` (Set)
    - Compute filtered rows via `useMemo` applying AND logic across active filters and case-insensitive search
    - Reset `currentPage` to 1 on any filter or search change
    - Paginate at 15 rows per page; pass only current-page rows to `CredentialsTable`
    - Render FilterBar with tab-appropriate dropdowns (class/section/status for students; status for parents; role/status for staff)
    - Render empty-state message + "Clear Filters" button when no rows match; Clear Filters resets all filters and search
    - Render `BulkActionBar` when `selectedIds.size > 0`
    - Preserve `selectedIds` across page navigation (cross-page selection)
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 4.2, 4.3, 4.5, 4.6, 5.2, 5.3, 5.4, 5.5, 9.1, 9.4_

  - [~] 2.4 Create `src/pages/admin/credentials/DetailsDrawer.tsx`
    - Accept `DetailsDrawerProps` as defined in design
    - Slide in from right; display: full name, role label, linked entity name, username, password (masked with toggle), lastLogin (or "Never"), createdDate, status badge
    - Local `showPassword` state reset to `false` when `credential.id` changes
    - Include Reset Password and Activate/Deactivate buttons wired to callbacks
    - Close on Escape keypress (via `useEffect` + `keydown` listener) and on overlay click
    - Update content in-place when `credential` changes while drawer is open
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [-] 2.5 Create `src/pages/admin/credentials/ResetPasswordModal.tsx`
    - Accept `ResetPasswordModalProps` as defined in design
    - Display user name and pre-generated `generatedPassword`; allow admin to edit before confirming
    - `onConfirm` called with the (possibly edited) password; `onClose` closes without mutation
    - _Requirements: 7.4, 7.5_

  - [-] 2.6 Create `src/pages/admin/credentials/BulkActionBar.tsx`
    - Visible only when `selectedCount > 0`
    - Display selected count and four buttons: Generate Credentials, Print Credentials, Export PDF, Export Excel
    - Defensive guard: if `onPrint` triggered with zero selection, show validation toast "Select at least one record to print"
    - _Requirements: 9.2, 11.4_

  - [-] 2.7 Create `src/pages/admin/credentials/PrintSlip.tsx`
    - Render a formatted credential slip: full name, role label, username, masked password with reveal option
    - Include `@media print` CSS to scope printing to slip element only
    - Accept an array of `EnrichedCredentialRow` to support both single-record and bulk (2-per-row grid) layouts
    - _Requirements: 11.1, 11.2, 11.3_

- [~] 3. Checkpoint — Verify foundation and components compile cleanly
  - Ensure TypeScript compiles without errors on all files created so far. Ask the user if questions arise.

- [ ] 4. Page assembly and routing
  - [~] 4.1 Create `src/pages/admin/credentials/CredentialsPage.tsx` and `CredentialsPage.css`
    - Wire `useCredentials()` hook; own active tab, drawer open state, selected credential, toast notifications
    - Render `SummaryCards`, tab bar (Students | Parents | Staff), and the active `TabPanel`
    - Handle `onRowClick` → open `DetailsDrawer`; handle `onResetPassword` → call `generateResetPassword()` then open `ResetPasswordModal`
    - Implement `handleCopyUsername` and `handleCopyPassword` using `navigator.clipboard.writeText` wrapped in try/catch; show "Copied!" toast on success or error toast on failure
    - Implement `handleBulkPrint` — open new browser window with all selected slips in 2-per-row grid and call `window.print()` after load; show validation toast if zero selected
    - Wire `onBulkExportPDF` and `onBulkExportExcel` callbacks to Export_Service
    - Add page-level styles in `CredentialsPage.css` (layout, tab bar active state, drawer overlay, print media queries)
    - _Requirements: 7.2, 7.3, 9.2, 11.1, 11.2, 11.3, 11.4_

  - [~] 4.2 Wire route `/admin/credentials` in `src/App.jsx`
    - Import `CredentialsPage` component
    - Add `<Route path="admin/credentials" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><CredentialsPage /></ProtectedRoute>} />` inside the Layout route
    - _Requirements: 1.1, 1.2, 1.4_

  - [~] 4.3 Add "Credentials" nav link in `src/components/Sidebar.jsx`
    - Import `KeyRound` from `lucide-react`
    - Add menu item `{ icon: KeyRound, label: "Credentials", href: "/admin/credentials", visible: ["super_admin", "admin"] }` in the MENU section (after the existing "Student Credentials" entry)
    - _Requirements: 1.3_

- [ ] 5. Export service
  - [x] 5.1 Install dependencies: `jspdf`, `xlsx` (runtime) and `fast-check` (dev)
    - Run `npm install jspdf xlsx` and `npm install --save-dev fast-check`
    - Verify entries appear in `package.json` dependencies and devDependencies

  - [~] 5.2 Create `src/utils/credentialsExport.ts` — Export_Service with PDF and Excel generation
    - Import `jsPDF` from `jspdf` and `utils` from `xlsx`
    - Implement `exportCredentialsPDF(rows: EnrichedCredentialRow[], tab: string): Promise<{ success: boolean; error?: string }>`
      - Generate one credential slip block per row
      - Filename pattern: `credentials-{tab}-{YYYY-MM-DD}.pdf`
      - Trigger browser download; wrap in try/catch returning `{ success: false, error }` on failure
    - Implement `exportCredentialsExcel(rows: EnrichedCredentialRow[], tab: string): Promise<{ success: boolean; error?: string }>`
      - Columns: Name, Role, Username, Password, Status, Created Date
      - Filename pattern: `credentials-{tab}-{YYYY-MM-DD}.xlsx`
      - Trigger browser download; wrap in try/catch returning `{ success: false, error }` on failure
    - _Requirements: 9.5, 9.6_

- [~] 6. Checkpoint — Run `npm run build` and verify zero TypeScript/compilation errors
  - Fix any type errors or import issues revealed by the build. Ask the user if questions arise.

- [ ] 7. Tests — unit and property-based
  - [~] 7.1 Create `src/data/__tests__/credentialsMockData.test.ts` — unit tests for store utilities
    - Test `computeSummary()` with specific examples: empty array, all-inactive, single role, mixed roles
    - Test `generateCredential()` with concrete inputs for each role (student, parent, staff)
    - Test `generateResetPassword()` with multiple samples verifying length 8–16, uppercase, digit, special char
    - Test `applyAutoGeneration()` upsert behavior — existing `linkedEntityId` overwrites, new entity appends
    - Test missing-field skip logic in `generateCredential` — returns `null` when required fields absent
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 12.1_

  - [ ]* 7.2 Write property test for `computeSummary` — Property 2
    - **Property 2: Summary card counts match live credential array**
    - **Validates: Requirements 2.1, 2.2, 2.3**
    - Use `fc.array(arbitraryUserCredential())` with `numRuns: 200`
    - Assert each summary field equals independently filtered count from the same input array

  - [ ]* 7.3 Write property test for multi-filter AND logic — Property 3
    - **Property 3: Multi-filter AND logic**
    - **Validates: Requirements 3.2, 5.2**
    - Generate arbitrary student rows plus filter combinations; assert every result row satisfies all active filters

  - [ ]* 7.4 Write property test for case-insensitive search — Property 4
    - **Property 4: Case-insensitive search correctness**
    - **Validates: Requirements 3.3, 4.2, 5.3**
    - Generate arbitrary rows and search strings; assert every result row contains the query (case-insensitive) in at least one searchable field

  - [ ]* 7.5 Write property test for filter/search → page reset — Property 5
    - **Property 5: Filter and search changes reset pagination to page 1**
    - **Validates: Requirements 3.5, 4.3, 4.5, 5.4**
    - For any filter or search change, resulting `currentPage` must equal 1

  - [ ]* 7.6 Write property test for password masking default state — Property 6
    - **Property 6: Password masking is the default state**
    - **Validates: Requirements 6.1, 6.4**
    - Assert `visiblePasswordIds` set is empty on mount for any set of credentials

  - [ ]* 7.7 Write property test for password visibility toggle isolation — Property 7
    - **Property 7: Password visibility toggle isolation**
    - **Validates: Requirements 6.2**
    - After toggling row i, assert `visiblePasswordIds` has size 1 containing only row i's id

  - [ ]* 7.8 Write property test for password visibility toggle round-trip — Property 8
    - **Property 8: Password visibility toggle is a round-trip**
    - **Validates: Requirements 6.3**
    - After two toggles on same id, assert id is absent from `visiblePasswordIds`

  - [ ]* 7.9 Write property test for `generateResetPassword` constraints — Property 10
    - **Property 10: Generated reset password satisfies composition constraints**
    - **Validates: Requirements 7.4**
    - `numRuns: 500`; assert length 8–16, contains `[A-Z]`, `[0-9]`, and at least one special char

  - [ ]* 7.10 Write property test for status toggle round-trip — Property 11
    - **Property 11: Status toggle round-trip (activate/deactivate)**
    - **Validates: Requirements 7.6, 7.7, 12.2**
    - Deactivate active credential → status = 'inactive'; re-activate → status = 'active'; localStorage reflects each state

  - [ ]* 7.11 Write property test for password reset persistence — Property 12
    - **Property 12: Password reset mutation is persisted**
    - **Validates: Requirements 7.5, 12.2**
    - After reset, in-memory store and `JSON.parse(localStorage.getItem('erp_credentials'))` both have the new password

  - [ ]* 7.12 Write property test for localStorage failure atomicity — Property 13
    - **Property 13: localStorage failure leaves store unchanged**
    - **Validates: Requirements 7.8**
    - Mock `localStorage.setItem` to throw; assert in-memory credentials array is identical to pre-mutation state

  - [ ]* 7.13 Write property test for header checkbox selects current page only — Property 14
    - **Property 14: Header checkbox selects current page only**
    - **Validates: Requirements 9.1**
    - For any K-row page (K ≤ 15), after `onSelectAll`, `selectedIds` grows by exactly K and contains only those K row ids

  - [ ]* 7.14 Write property test for BulkActionBar visibility invariant — Property 15
    - **Property 15: Bulk action bar visibility invariant**
    - **Validates: Requirements 9.2**
    - Visible iff `selectedIds.size > 0`; any selection makes it appear; clearing all makes it disappear

  - [ ]* 7.15 Write property test for cross-page selection persistence — Property 16
    - **Property 16: Cross-page selection persistence**
    - **Validates: Requirements 9.4**
    - Page navigation must not alter `selectedIds` contents

  - [ ]* 7.16 Write property test for export filename pattern — Property 17
    - **Property 17: Export filename pattern correctness**
    - **Validates: Requirements 9.5, 9.6**
    - For any tab name and date, generated filenames match `credentials-{tab}-{YYYY-MM-DD}.pdf/xlsx`

  - [ ]* 7.17 Write property test for student auto-generation — Property 18
    - **Property 18: Student auto-generation algorithm correctness**
    - **Validates: Requirements 10.1**
    - `numRuns: 200`; assert `username === admission_number` and `password === name + DDMMYYYY`

  - [ ]* 7.18 Write property test for parent auto-generation — Property 19
    - **Property 19: Parent auto-generation algorithm correctness**
    - **Validates: Requirements 10.2**
    - Assert `username` equals phone digits only and `password === firstName + '@123'`

  - [ ]* 7.19 Write property test for staff auto-generation — Property 20
    - **Property 20: Staff auto-generation algorithm correctness**
    - **Validates: Requirements 10.3**
    - Assert `username === employee_id` (verbatim) and `password === firstName + '@123'`

  - [ ]* 7.20 Write property test for auto-generation determinism — Property 21
    - **Property 21: Auto-generation is deterministic**
    - **Validates: Requirements 10.4**
    - `numRuns: 200`; calling `generateCredential` twice with same input yields identical username and password

  - [ ]* 7.21 Write property test for auto-generation upsert — Property 22
    - **Property 22: Auto-generation upserts, does not duplicate**
    - **Validates: Requirements 10.5**
    - After `applyAutoGeneration` for an entity with existing `linkedEntityId`, exactly one record with that id remains

  - [ ]* 7.22 Write property test for seeded credentials valid linkedEntityIds — Property 23
    - **Property 23: Seeded credentials have valid linkedEntityIds**
    - **Validates: Requirements 12.5**
    - Every seeded credential's `linkedEntityId` exists in the appropriate source entity array

  - [ ]* 7.23 Write property test for verbatim username display — Property 24
    - **Property 24: Username display is verbatim (no transformation)**
    - **Validates: Requirements 4.4**
    - For any credential, the username cell text equals `credential.username` exactly with no trimming or casing

  - [~] 7.24 Create `src/pages/admin/credentials/__tests__/CredentialsTable.test.tsx` — component unit tests
    - Test that correct column headers render per tab (Students/Parents/Staff column sets)
    - Test password cells show `••••••••` by default; reveal after toggle; re-mask after second toggle
    - Test status badge renders amber/orange for inactive records
    - Test "Clear Filters" button resets filters and search
    - _Requirements: 3.1, 3.4, 3.6, 4.1, 5.1, 6.1, 6.2, 6.3_

  - [~] 7.25 Create `src/pages/admin/credentials/__tests__/DetailsDrawer.test.tsx` — component unit tests
    - Test drawer closes on Escape keypress
    - Test drawer updates content in-place when a different credential is passed while open
    - Test Activate/Deactivate button label reflects credential status
    - _Requirements: 8.3, 8.4, 8.5_

- [~] 8. Final checkpoint — Ensure all tests pass
  - Run `npx vitest --run` and fix any failing tests. Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Property tests (7.2–7.23) require the `fast-check` dev dependency installed in task 5.1
- Each property test references a property number from the design document for traceability
- All mutations in `useCredentials` must follow the `applyMutation` pattern (try localStorage first, update state only on success)
- `CredentialsPage` does not own filter/selection/pagination state — those live in each `TabPanel` instance
- The existing `StudentCredentials` page at `/admin/students` is not removed in this feature; the new page coexists at `/admin/credentials`
- Supabase migration path: replace `credentialsMockData.ts` exports with a service class; `useCredentials` hook interface stays unchanged

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3", "5.1"] },
    { "id": 3, "tasks": ["2.1", "2.2", "2.5", "2.6", "2.7"] },
    { "id": 4, "tasks": ["2.3", "2.4"] },
    { "id": 5, "tasks": ["4.1", "5.2"] },
    { "id": 6, "tasks": ["4.2", "4.3"] },
    { "id": 7, "tasks": ["7.1", "7.24", "7.25"] },
    { "id": 8, "tasks": ["7.2", "7.3", "7.4", "7.5", "7.6", "7.7", "7.8", "7.9", "7.10", "7.11", "7.12", "7.13", "7.14", "7.15", "7.16", "7.17", "7.18", "7.19", "7.20", "7.21", "7.22", "7.23"] }
  ]
}
```
