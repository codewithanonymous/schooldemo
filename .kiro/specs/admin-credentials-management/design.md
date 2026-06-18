# Design Document — Admin Credentials Management

## Overview

The Credentials Management feature consolidates student, parent, and staff login credentials into a
single admin page at `/admin/credentials`. It replaces the isolated `StudentCredentials` page (currently
at `/admin/students`) and extends coverage to parents and staff.

The implementation is React + Vite + TypeScript. Data is stored in-memory and persisted to `localStorage`
under the key `erp_credentials`. The `UserCredential` interface mirrors the planned Supabase schema so that
migration requires only swapping the data layer without touching UI components.

### Key design goals

- **Single source of truth**: one `credentialsMockData.ts` module owns all credential state.
- **Derived, not duplicated**: summary card counts and table rows are computed from the same live array.
- **Composable components**: `CredentialsTable`, `DetailsDrawer`, `ResetPasswordModal`, and
  `BulkActionBar` are generic enough to work for any tab (Students / Parents / Staff).
- **Supabase-ready interfaces**: swap `Credentials_Store` functions for Supabase queries without
  altering any component import.

---

## Architecture

### High-level flow

```
Browser → /admin/credentials
           │
           ▼
     ProtectedRoute  ──── non-admin → redirect to role dashboard
           │
           ▼
     CredentialsPage  (src/pages/admin/credentials/CredentialsPage.tsx)
      ├── SummaryCards
      ├── TabBar (Students | Parents | Staff)
      └── TabPanel
           ├── FilterBar
           ├── BulkActionBar  (conditionally visible)
           └── CredentialsTable
                ├── CredentialRow  ×N
                └── Pagination
                     ↕ click
                DetailsDrawer (overlay)
                     └── ResetPasswordModal (overlay)
```

### Data flow

```
credentialsMockData.ts
  └── CREDENTIALS: UserCredential[]   ← seeded from STUDENTS + PARENTS + STAFF
  └── saveCredentials()               ← writes to localStorage['erp_credentials']

useCredentials() hook  (src/hooks/useCredentials.ts)
  ├── state: credentials[]
  ├── resetPassword(id, newPassword)
  ├── setStatus(id, 'active'|'inactive')
  ├── generateBulk(entityIds, role)
  └── returns derived counts for SummaryCards

CredentialsPage
  ├── useCredentials()   ← all mutations & live array
  ├── useToast()         ← react-toastify
  └── tabState / filterState / selectionState  ← local useState
```

All state mutations flow through `useCredentials`. Components never write directly to the store.

---

## Components and Interfaces

### File structure

```
src/
├── pages/admin/credentials/
│   ├── CredentialsPage.tsx          Main page component, route target
│   ├── CredentialsPage.css          Page-level styles
│   ├── SummaryCards.tsx             Five stat cards
│   ├── TabPanel.tsx                 Wrapper for each tab's filter bar + table
│   ├── CredentialsTable.tsx         Generic table (Students / Parents / Staff)
│   ├── DetailsDrawer.tsx            Slide-over details panel
│   ├── ResetPasswordModal.tsx       Confirmation modal for password reset
│   ├── BulkActionBar.tsx            Sticky toolbar when rows are selected
│   └── PrintSlip.tsx                Single-slip print layout (used in modal + bulk window)
├── hooks/
│   └── useCredentials.ts            Custom hook wrapping Credentials_Store
├── data/
│   └── credentialsMockData.ts       Credentials_Store (seed + localStorage persistence)
├── utils/
│   └── credentialsExport.ts         Export_Service (PDF via jsPDF, Excel via xlsx)
└── types/
    └── credentials.ts               UserCredential interface + helper types
```

### Component descriptions

#### `CredentialsPage`

Top-level page component. Owns:
- Active tab index (`'students' | 'parents' | 'staff'`)
- `useCredentials()` hook result (credentials array + mutation functions)
- Drawer open state and selected credential record
- Toast notifications via `react-toastify`

Does **not** own: filter state, selection state, pagination state — those are owned by each `TabPanel`.

Props: none (reads auth from `useAuth()`)

#### `SummaryCards`

Pure display component. Receives the live `credentials` array and computes the five counts on each
render via `useMemo`.

```typescript
interface SummaryCardsProps {
  credentials: UserCredential[];
}
```

Cards rendered:
| Card | Derivation |
|------|-----------|
| Total Student Accounts | `credentials.filter(c => c.role === 'student').length` |
| Total Parent Accounts | `credentials.filter(c => c.role === 'parent').length` |
| Total Staff Accounts | `credentials.filter(c => ['teacher','staff','admin'].includes(c.role)).length` |
| Active Accounts | `credentials.filter(c => c.status === 'active').length` |
| Inactive Accounts | `credentials.filter(c => c.status === 'inactive').length` |

Because `credentials` is passed as a prop from the hook's state, React re-renders `SummaryCards`
automatically after every mutation without any additional coordination.

#### `TabPanel`

Wrapper component that owns filter state, selection state, and pagination for one tab. Each tab instance
is mounted independently so state does not bleed between tabs.

```typescript
interface TabPanelProps {
  tab: 'students' | 'parents' | 'staff';
  credentials: UserCredential[];
  onRowClick: (credential: UserCredential) => void;
  onResetPassword: (credential: UserCredential) => void;
  onToggleStatus: (credential: UserCredential) => void;
  onBulkGenerate: (ids: string[]) => void;
  onBulkExportPDF: (ids: string[]) => void;
  onBulkExportExcel: (ids: string[]) => void;
  onBulkPrint: (ids: string[]) => void;
}
```

Internal state:
- `searchQuery: string`
- `filters: Record<string, string>` (keys vary per tab: class/section/status for students; status for parents; role/status for staff)
- `currentPage: number`
- `selectedIds: Set<string>` (cross-page persistent selection)
- `visiblePasswordIds: Set<string>` (which rows are unmasked)

Filter logic:
- On any filter or search change: `setCurrentPage(1)`
- Filtered array is computed via `useMemo` — filter chain applies AND logic across all active filters
- Search is case-insensitive substring match against the fields listed per tab in requirements

#### `CredentialsTable`

Renders the `<table>` element for a single tab. Stateless — receives filtered+paginated rows as props.

```typescript
interface CredentialsTableProps {
  tab: 'students' | 'parents' | 'staff';
  rows: CredentialRow[];                      // enriched rows (see Data Models)
  selectedIds: Set<string>;
  visiblePasswordIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onTogglePassword: (id: string) => void;
  onRowClick: (id: string) => void;
  onCopyUsername: (credential: UserCredential) => void;
  onCopyPassword: (credential: UserCredential) => void;
  onResetPassword: (credential: UserCredential) => void;
  onToggleStatus: (credential: UserCredential) => void;
  onPrintSlip: (credential: UserCredential) => void;
}
```

The header checkbox behavior: `onSelectAll` selects all rows in `rows` (current page only — the parent
`TabPanel` passes only the current page's rows).

Column rendering per tab:

**Students**: Checkbox | Student (avatar+name) | Admission No | Class | Section | Username | Password | Status | Actions

**Parents**: Checkbox | Parent Name | Student (child name + admission no) | Phone | Username | Password | Status | Actions

**Staff**: Checkbox | Employee ID | Name | Role/Designation | Username | Password | Status | Actions

#### `DetailsDrawer`

Slide-over overlay anchored to the right side. Receives the selected `UserCredential` and
the enriched entity data (looked up by `linkedEntityId`).

```typescript
interface DetailsDrawerProps {
  credential: UserCredential | null;
  enrichedEntity: EnrichedCredentialRow | null;
  isOpen: boolean;
  onClose: () => void;
  onResetPassword: (credential: UserCredential) => void;
  onToggleStatus: (credential: UserCredential) => void;
}
```

- Closes on `Escape` keypress (via `useEffect` + `keydown` listener) and on overlay click.
- When `isOpen` is true and `credential` changes, the drawer updates content in place (no close/reopen).
- Password inside drawer has its own local `showPassword: boolean` state reset to `false` whenever
  `credential.id` changes.

#### `ResetPasswordModal`

```typescript
interface ResetPasswordModalProps {
  isOpen: boolean;
  credential: UserCredential | null;
  entityName: string;
  generatedPassword: string;            // pre-generated by caller
  onConfirm: (newPassword: string) => void;
  onClose: () => void;
}
```

The caller (`CredentialsPage`) generates the new password using `generateResetPassword()` before
opening the modal. The modal displays the generated password and allows the admin to edit it before
confirming.

Password generation rule: 8–16 characters, at least 1 uppercase letter, 1 digit, 1 special character.
Implemented in `credentialsMockData.ts` → `generateResetPassword()`.

#### `BulkActionBar`

```typescript
interface BulkActionBarProps {
  selectedCount: number;
  tab: 'students' | 'parents' | 'staff';
  onGenerate: () => void;
  onPrint: () => void;
  onExportPDF: () => void;
  onExportExcel: () => void;
}
```

Visible when `selectedCount > 0`. Displays count and four action buttons.
If `onPrint` is triggered with `selectedCount === 0` (defensive guard), shows a validation toast.

---

## Data Models

### `UserCredential` interface

Defined in `src/types/credentials.ts`. This is the canonical Supabase-ready schema:

```typescript
export interface UserCredential {
  id: string;                                              // UUID (crypto.randomUUID())
  role: 'student' | 'parent' | 'teacher' | 'staff' | 'admin';
  username: string;
  password: string;
  linkedEntityId: string;                                  // references Student.id / Parent.id / StaffMember.id
  status: 'active' | 'inactive';
  lastLogin: string | null;                                // ISO 8601 datetime string or null
  createdDate: string;                                     // ISO 8601 date string (YYYY-MM-DD)
}
```

### `EnrichedCredentialRow` — display model

Computed at render time (not stored). Merges `UserCredential` with the linked entity's display fields:

```typescript
export interface EnrichedCredentialRow {
  credential: UserCredential;
  // Students
  fullName?: string;
  admissionNumber?: string;
  className?: string;
  sectionName?: string;
  // Parents
  parentName?: string;
  linkedStudentName?: string;
  linkedAdmissionNumber?: string;
  phone?: string;
  // Staff
  employeeId?: string;
  designation?: string;
  department?: string;
}
```

The enrichment function lives in `credentialsMockData.ts`:

```typescript
export function enrichCredential(
  credential: UserCredential,
  students: Student[],
  parents: Parent[],
  staff: StaffMember[],
  classes: AcademicClass[],
  sections: AcademicSection[]
): EnrichedCredentialRow
```

### `CredentialSummary` — counts model

```typescript
export interface CredentialSummary {
  totalStudents: number;
  totalParents: number;
  totalStaff: number;
  activeAccounts: number;
  inactiveAccounts: number;
}

export function computeSummary(credentials: UserCredential[]): CredentialSummary
```

### `AutoGenerationResult` — output of auto-generation

```typescript
export interface AutoGenerationResult {
  generated: UserCredential[];
  skipped: string[];    // entity names that were skipped due to missing fields
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a
system — essentially, a formal statement about what the system should do. Properties serve as the
bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Role-based redirect for non-admin roles

*For any* user role that is not `'admin'` or `'super_admin'`, attempting to access `/admin/credentials`
should result in a redirect to that role's home dashboard (not a render of `CredentialsPage`).

**Validates: Requirements 1.2**

---

### Property 2: Summary card counts match live credential array

*For any* array of `UserCredential` records, `computeSummary(credentials)` must return counts that
exactly equal the counts obtained by independently filtering the same array — no stale, cached, or
off-by-one values.

**Validates: Requirements 2.1, 2.2, 2.3**

---

### Property 3: Multi-filter AND logic

*For any* combination of active filter values (class, section, status for students; role, status for
staff; status for parents), every row returned by the filter function must satisfy every active filter
condition simultaneously. No row should appear in the results if it fails even one active filter.

**Validates: Requirements 3.2, 5.2**

---

### Property 4: Case-insensitive search correctness

*For any* non-empty search query string, every row returned by the search function must contain the
query as a case-insensitive substring in at least one of the searchable fields for that tab. No row
that does not match should appear in the results.

**Validates: Requirements 3.3, 4.2, 5.3**

---

### Property 5: Filter and search changes reset pagination to page 1

*For any* change to a filter dropdown value or search query, the resulting `currentPage` value must
equal `1`, regardless of what page the user was on before the change.

**Validates: Requirements 3.5, 4.3, 4.5, 5.4**

---

### Property 6: Password masking is the default state

*For any* `UserCredential` record rendered in any `CredentialsTable` on initial mount, the password
cell must display the masked string (`••••••••`) and not the plain-text `credential.password` value.
The `visiblePasswordIds` set must be empty on mount.

**Validates: Requirements 6.1, 6.4**

---

### Property 7: Password visibility toggle isolation

*For any* set of N credential rows, toggling the visibility of row at index i should result in
exactly row i being revealed and all other rows remaining masked. The `visiblePasswordIds` set
after the toggle must have size exactly 1 and contain only the toggled row's id.

**Validates: Requirements 6.2**

---

### Property 8: Password visibility toggle is a round-trip

*For any* credential row id, toggling visibility twice (reveal then hide) must return the row to
masked state — the row's id must be absent from `visiblePasswordIds` after two toggles.

**Validates: Requirements 6.3**

---

### Property 9: Copy action writes correct value to clipboard

*For any* `UserCredential` record, when the admin copies the username, the text written to the
clipboard must equal `credential.username` exactly. When the admin copies the password, the text
written to the clipboard must equal `credential.password` exactly.

**Validates: Requirements 7.2, 7.3**

---

### Property 10: Generated reset password satisfies composition constraints

*For any* invocation of `generateResetPassword()`, the returned string must:
- Have length between 8 and 16 characters (inclusive)
- Contain at least one uppercase letter (`[A-Z]`)
- Contain at least one digit (`[0-9]`)
- Contain at least one special character (`[!@#$%^&*]` or similar)

**Validates: Requirements 7.4**

---

### Property 11: Status toggle round-trip (activate/deactivate)

*For any* `UserCredential` with `status = 'active'`, after a deactivate mutation the status must be
`'inactive'`. After a subsequent activate mutation, the status must return to `'active'`. The
`localStorage` value under `erp_credentials` must reflect each state change immediately after the
mutation.

**Validates: Requirements 7.6, 7.7, 12.2**

---

### Property 12: Password reset mutation is persisted

*For any* `UserCredential` record and any valid new password string, after confirming a reset the
in-memory store entry for that `id` must have `password` equal to the new value, and
`JSON.parse(localStorage.getItem('erp_credentials'))` must contain a record with the same `id`
and the same new `password`.

**Validates: Requirements 7.5, 12.2**

---

### Property 13: localStorage failure leaves store unchanged

*For any* mutation operation (reset password, activate, deactivate), if `localStorage.setItem` throws
an error, the in-memory `credentials` array must remain identical to its state before the attempted
mutation — no partial updates.

**Validates: Requirements 7.8**

---

### Property 14: Header checkbox selects current page only

*For any* paginated table state where the current page contains K rows (K ≤ 15), clicking the header
checkbox must result in `selectedIds` growing by exactly K entries — the ids of those K rows — and
must not add ids from any other page.

**Validates: Requirements 9.1**

---

### Property 15: Bulk action bar visibility invariant

*For any* selection state, the `BulkActionBar` must be visible if and only if `selectedIds.size > 0`.
Adding any selection must make it appear; clearing all selections must make it disappear.

**Validates: Requirements 9.2**

---

### Property 16: Cross-page selection persistence

*For any* set of selected row ids that spans multiple pages, navigating to a different page and back
must leave `selectedIds` unchanged — no ids are lost on page navigation.

**Validates: Requirements 9.4**

---

### Property 17: Export filename pattern correctness

*For any* tab name (`'students'`, `'parents'`, or `'staff'`) and any date, the filename generated by
the Export_Service must match the pattern `credentials-{tab}-{YYYY-MM-DD}.pdf` for PDF exports and
`credentials-{tab}-{YYYY-MM-DD}.xlsx` for Excel exports.

**Validates: Requirements 9.5, 9.6**

---

### Property 18: Student auto-generation algorithm correctness

*For any* student record with a non-empty `admission_number` and a non-empty `birthday` field, the
auto-generated credential must have:
- `username === student.admission_number` (verbatim)
- `password === student.name + formatDate(student.birthday, 'DDMMYYYY')`

**Validates: Requirements 10.1**

---

### Property 19: Parent auto-generation algorithm correctness

*For any* parent record with a non-empty `phone` field and a non-empty `name`, the auto-generated
credential must have:
- `username` equal to the `phone` string with all non-digit characters removed
- `password === parent.name.split(' ')[0] + '@123'`

**Validates: Requirements 10.2**

---

### Property 20: Staff auto-generation algorithm correctness

*For any* staff member record with a non-empty `employee_id` and a non-empty `name`, the
auto-generated credential must have:
- `username === staff.employee_id` (verbatim)
- `password === staff.name.split(' ')[0] + '@123'`

**Validates: Requirements 10.3**

---

### Property 21: Auto-generation is deterministic (idempotent inputs)

*For any* entity record, calling the auto-generation function twice with the same input must produce
identical `username` and `password` values both times. The function must have no side effects that
affect its output.

**Validates: Requirements 10.4**

---

### Property 22: Auto-generation upserts, does not duplicate

*For any* entity whose `linkedEntityId` already appears in the `credentials` array, after running
auto-generation the array must contain exactly one record with that `linkedEntityId` — the existing
record must be overwritten, not a new one appended.

**Validates: Requirements 10.5**

---

### Property 23: Seeded credentials have valid linkedEntityIds

*For any* `UserCredential` record in the seeded store, its `linkedEntityId` must appear as the `id`
of an existing entity in the appropriate source array (STUDENTS for `role='student'`, PARENTS for
`role='parent'`, STAFF for `role` in `['teacher','staff','admin']`).

**Validates: Requirements 12.5**

---

### Property 24: Username display is verbatim (no transformation)

*For any* `UserCredential` record displayed in a `CredentialsTable`, the username cell text must equal
`credential.username` exactly — no trimming, casing, or transformation applied.

**Validates: Requirements 4.4**

---

## Error Handling

### localStorage failures

`credentialsMockData.ts` wraps every `localStorage.setItem` call in a try/catch. The mutation
functions in `useCredentials` follow this pattern:

```typescript
function applyMutation(updater: (prev: UserCredential[]) => UserCredential[]): void {
  const next = updater(credentialsRef.current);
  try {
    localStorage.setItem('erp_credentials', JSON.stringify(next));
    setCredentials(next);           // only update state on success
  } catch (err) {
    toast.error('Failed to save changes — please try again');
    // credentialsRef.current unchanged — in-memory state not mutated
  }
}
```

This guarantees in-memory state and localStorage are never out of sync due to a write failure.

### Clipboard API unavailability

`handleCopy` wraps `navigator.clipboard.writeText` in a try/catch:

```typescript
async function handleCopyUsername(credential: UserCredential): Promise<void> {
  try {
    await navigator.clipboard.writeText(credential.username);
    toast.success('Copied!', { autoClose: 2000 });
  } catch {
    toast.error('Unable to copy — please copy manually');
  }
}
```

### Missing entity fields during auto-generation

`generateCredentialForEntity` returns `null` if any required source field is absent, and the caller
accumulates the entity name into the `skipped[]` array. After bulk generation, a summary toast lists
any skipped entities.

### PDF/Excel export failures

`credentialsExport.ts` wraps the export in a try/catch. On failure it resolves with
`{ success: false, error: string }`, and `CredentialsPage` shows an error toast.

---

## Testing Strategy

### Unit tests

Use **Vitest** (already present via Vite ecosystem) with **@testing-library/react** for component tests.

Focus areas:
- `computeSummary()` — specific examples and edge cases (empty array, all-inactive, mixed roles)
- `generateCredential()` — concrete examples for each role type
- `generateResetPassword()` — verify constraints for multiple samples
- `applyFilters()` — example combinations covering AND logic
- `enrichCredential()` — verify field mapping for each tab type
- `CredentialsTable` column headers rendered per tab
- `DetailsDrawer` closes on Escape key
- `BulkActionBar` visible/hidden based on selection count

### Property-based tests

Use **fast-check** for property-based testing.

Install: `npm install --save-dev fast-check`

Each property test runs a minimum of **100 iterations**.

Tag format: `// Feature: admin-credentials-management, Property {N}: {property_text}`

**Property 2** — Summary card counts match live array:
```typescript
// Feature: admin-credentials-management, Property 2: computeSummary counts match filtered array
fc.assert(fc.property(fc.array(arbitraryUserCredential()), (credentials) => {
  const summary = computeSummary(credentials);
  expect(summary.totalStudents).toBe(credentials.filter(c => c.role === 'student').length);
  expect(summary.totalParents).toBe(credentials.filter(c => c.role === 'parent').length);
  expect(summary.totalStaff).toBe(credentials.filter(c => ['teacher','staff','admin'].includes(c.role)).length);
  expect(summary.activeAccounts).toBe(credentials.filter(c => c.status === 'active').length);
  expect(summary.inactiveAccounts).toBe(credentials.filter(c => c.status === 'inactive').length);
}), { numRuns: 200 });
```

**Property 3** — Multi-filter AND logic (student tab example):
```typescript
// Feature: admin-credentials-management, Property 3: multi-filter AND logic
fc.assert(fc.property(
  fc.array(arbitraryStudentCredentialRow()),
  fc.string(), fc.string(), fc.constantFrom('active', 'inactive', ''),
  (rows, classFilter, sectionFilter, statusFilter) => {
    const result = applyStudentFilters(rows, classFilter, sectionFilter, statusFilter);
    result.forEach(row => {
      if (classFilter) expect(row.className).toBe(classFilter);
      if (sectionFilter) expect(row.sectionName).toBe(sectionFilter);
      if (statusFilter) expect(row.credential.status).toBe(statusFilter);
    });
  }
), { numRuns: 100 });
```

**Property 10** — Reset password composition constraints:
```typescript
// Feature: admin-credentials-management, Property 10: generated reset password satisfies constraints
fc.assert(fc.property(fc.constant(null), () => {
  const pwd = generateResetPassword();
  expect(pwd.length).toBeGreaterThanOrEqual(8);
  expect(pwd.length).toBeLessThanOrEqual(16);
  expect(/[A-Z]/.test(pwd)).toBe(true);
  expect(/[0-9]/.test(pwd)).toBe(true);
  expect(/[^A-Za-z0-9]/.test(pwd)).toBe(true);
}), { numRuns: 500 });
```

**Property 18** — Student auto-generation:
```typescript
// Feature: admin-credentials-management, Property 18: student auto-generation username and password
fc.assert(fc.property(arbitraryStudentRecord(), (student) => {
  const result = generateCredential(student, 'student');
  expect(result?.username).toBe(student.admission_number);
  const [day, month, year] = [
    student.birthday.slice(8, 10),
    student.birthday.slice(5, 7),
    student.birthday.slice(0, 4)
  ];
  expect(result?.password).toBe(`${student.name}${day}${month}${year}`);
}), { numRuns: 200 });
```

**Property 21** — Auto-generation determinism:
```typescript
// Feature: admin-credentials-management, Property 21: auto-generation is deterministic
fc.assert(fc.property(arbitraryStudentRecord(), (student) => {
  const first = generateCredential(student, 'student');
  const second = generateCredential(student, 'student');
  expect(first?.username).toBe(second?.username);
  expect(first?.password).toBe(second?.password);
}), { numRuns: 200 });
```

**Property 22** — Auto-generation upserts:
```typescript
// Feature: admin-credentials-management, Property 22: auto-generation upserts not duplicates
fc.assert(fc.property(
  fc.array(arbitraryUserCredential(), { minLength: 1 }),
  arbitraryStudentRecord(),
  (existing, student) => {
    // Inject one existing credential for the student
    const withExisting = [...existing, { ...existing[0], linkedEntityId: student.id, role: 'student' }];
    const result = applyAutoGeneration(withExisting, [student], 'student');
    const matching = result.filter(c => c.linkedEntityId === student.id);
    expect(matching).toHaveLength(1);
  }
), { numRuns: 100 });
```

### Integration considerations (for future Supabase migration)

- Replace `credentialsMockData.ts` exports with a `CredentialsService` class backed by Supabase client.
- `useCredentials` hook interface does not change — only the underlying service swaps.
- The `UserCredential` interface already matches the planned `credentials` table schema.
- Row-level security on the `credentials` table: only `admin` and `super_admin` roles can SELECT/UPDATE.

### Accessibility

- All interactive elements (buttons, checkboxes, drawer close) have `aria-label` attributes.
- `DetailsDrawer` traps focus using a `focus-trap` pattern while open.
- Toast notifications use `aria-live="polite"` regions via `react-toastify`.
- Status badges use `role="status"` and color is not the sole indicator (label text is always present).
