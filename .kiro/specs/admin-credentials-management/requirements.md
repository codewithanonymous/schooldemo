# Requirements Document

## Introduction

This feature introduces a centralized **Credentials Management** page at `/admin/credentials` in the School ERP.
Currently, login credentials for Students, Parents, and Staff are scattered across individual modules or do not
have a dedicated consolidated view. This page consolidates all three user categories into a single, tabbed
interface with summary cards, filterable tables, a details drawer, bulk actions, and export capabilities.

The project is React + Vite + TypeScript and currently uses **mock data** stored in-memory / localStorage.
The design must be Supabase-migration-ready, using a `UserCredential` interface compatible with the planned
Supabase schema.

---

## Glossary

- **Credentials_Page**: The React component rendered at `/admin/credentials`.
- **Credentials_Store**: The mock data module (`src/data/credentialsMockData.ts`) that holds `UserCredential` records and persists mutations to `localStorage`.
- **UserCredential**: A TypeScript interface representing a single login credential record with fields: `id`, `role`, `username`, `password`, `linkedEntityId`, `status`, `lastLogin`, `createdDate`.
- **Summary_Cards**: The row of five stat cards at the top of the Credentials_Page showing aggregate counts.
- **Tab_Panel**: One of the three content panels — Students, Parents, or Staff — activated by the tab bar.
- **Credentials_Table**: The filterable, sortable, paginated `<table>` inside a Tab_Panel.
- **Details_Drawer**: The slide-over panel that appears when a user clicks a row in a Credentials_Table.
- **Reset_Password_Modal**: The confirmation modal triggered by the "Reset Password" action.
- **Bulk_Action_Bar**: The sticky toolbar that appears above a Credentials_Table when one or more rows are selected.
- **Export_Service**: The utility module (`src/utils/credentialsExport.ts`) responsible for PDF and Excel exports.
- **Auto_Generation**: The deterministic algorithm that derives `username` and `password` from entity fields at record-creation time.
- **Admin**: Any logged-in user whose `role` is `admin` or `super_admin`.

---

## Requirements

---

### Requirement 1: Page Access and Route

**User Story:** As an Admin, I want a dedicated route `/admin/credentials`, so that I can access the unified credentials manager from the sidebar without visiting multiple module pages.

#### Acceptance Criteria

1. WHEN an Admin navigates to `/admin/credentials`, THE Credentials_Page SHALL render within the existing Layout (Sidebar + Navbar).
2. WHEN a user whose role is not `admin` or `super_admin` attempts to navigate to `/admin/credentials`, THE ProtectedRoute SHALL redirect them to their role-appropriate dashboard (e.g., `/student` for students, `/teacher` for teachers).
3. THE Sidebar SHALL display a navigation link labelled "Credentials" with the `KeyRound` icon, visible only to users with role `admin` or `super_admin`.
4. WHEN a user with role `super_admin` navigates to `/admin/credentials`, THE Credentials_Page SHALL render in the same way as for a user with role `admin`; the route SHALL NOT redirect a `super_admin`.

---

### Requirement 2: Dashboard Summary Cards

**User Story:** As an Admin, I want to see aggregate credential counts at the top of the page, so that I can quickly assess the state of all accounts without scrolling through tables.

#### Acceptance Criteria

1. THE Summary_Cards SHALL display five cards with the following counts derived from the Credentials_Store:
   - **Total Student Accounts**: count of `UserCredential` records where `role = "student"`.
   - **Total Parent Accounts**: count of `UserCredential` records where `role = "parent"`.
   - **Total Staff Accounts**: count of `UserCredential` records where `role` is one of `"teacher"`, `"staff"`, or `"admin"`.
   - **Active Accounts**: count of all `UserCredential` records where `status = "active"` (across all roles).
   - **Inactive Accounts**: count of all `UserCredential` records where `status = "inactive"` (across all roles).
2. WHEN any of the following mutations occur — reset password, activate, deactivate, generate credentials — THE Summary_Cards SHALL re-render with updated counts without a browser navigation event occurring.
3. THE Summary_Cards SHALL derive their counts from the live `UserCredential` array at render time; stale counts from a previous render SHALL NOT be displayed after a mutation.

---

### Requirement 3: Students Tab — Table and Filters

**User Story:** As an Admin, I want to view all student credentials in a table with filters, so that I can quickly locate any student's login information.

#### Acceptance Criteria

1. THE Credentials_Table in the Students Tab_Panel SHALL display columns: Student (avatar + full name), Admission No, Class, Section, Username, Password (masked as `••••••••`), Status.
2. THE Credentials_Table SHALL support filtering by Class, Section, and Status via dropdown selectors; WHEN multiple filters are active simultaneously, THE Credentials_Table SHALL display only rows that satisfy ALL active filter conditions (AND logic).
3. THE Credentials_Table SHALL support text search across Student Name, Admission Number, and Username fields; the search SHALL be case-insensitive and SHALL update results on each keystroke.
4. WHEN no records match the active filters or search query, THE Credentials_Table SHALL display an empty-state message and a "Clear Filters" button; clicking "Clear Filters" SHALL reset all active filter dropdowns and the search field to their default (unfiltered) values.
5. THE Credentials_Table SHALL paginate results at 15 rows per page and display a pagination toolbar; WHEN a filter or search value changes, THE Credentials_Table SHALL reset to page 1.
6. WHERE a student record has `status = "inactive"`, THE Credentials_Table row SHALL render the status cell with an amber/orange-coloured badge labelled "Inactive".

---

### Requirement 4: Parents Tab — Table and Filters

**User Story:** As an Admin, I want to see parent credentials linked to their associated student, so that I can manage parent portal access centrally.

#### Acceptance Criteria

1. THE Credentials_Table in the Parents Tab_Panel SHALL display columns: Parent Name, Student (linked child's name and admission number), Phone, Username, Password (masked as `••••••••`), Status.
2. THE Credentials_Table SHALL support text search across Parent Name, Phone, and Username fields; the search SHALL be case-insensitive and SHALL update results on each keystroke.
3. THE Credentials_Table SHALL support filtering by Status via a dropdown selector; WHEN the Status filter changes, THE Credentials_Table SHALL reset to page 1.
4. THE Credentials_Table in the Parents Tab_Panel SHALL derive each row's Username value directly from the `username` field of the corresponding `UserCredential` record; the column SHALL display whatever string is stored in that field without transformation.
5. THE Credentials_Table SHALL paginate results at 15 rows per page; WHEN a filter or search value changes, THE Credentials_Table SHALL reset to page 1.
6. WHEN no records match the active filter or search query, THE Credentials_Table SHALL display an empty-state message and a "Clear Filters" button that resets all filters and search to their defaults.

---

### Requirement 5: Staff Tab — Table and Filters

**User Story:** As an Admin, I want to see staff credentials (Teachers, Accountants, Receptionists, Admins) in one table, so that I can manage all staff portal access from one place.

#### Acceptance Criteria

1. THE Credentials_Table in the Staff Tab_Panel SHALL display columns: Employee ID, Name, Role/Designation, Username, Password (masked as `••••••••`), Status.
2. THE Credentials_Table SHALL support filtering by Role/Designation and Status via dropdown selectors; WHEN both filters are active, THE Credentials_Table SHALL display only rows that satisfy BOTH conditions (AND logic).
3. THE Credentials_Table SHALL support text search across Employee ID, Name, and Username fields; the search SHALL be case-insensitive and SHALL update results on each keystroke.
4. THE Credentials_Table SHALL paginate results at 15 rows per page; WHEN a filter or search value changes, THE Credentials_Table SHALL reset to page 1.
5. WHEN no records match the active filters or search query, THE Credentials_Table SHALL display an empty-state message and a "Clear Filters" button that resets all filters and search to their defaults.

---

### Requirement 6: Password Visibility Toggle

**User Story:** As an Admin, I want to toggle password visibility on any credential row, so that I can verify a password without needing to open the details drawer.

#### Acceptance Criteria

1. THE Credentials_Table SHALL render each password cell with a masked value (`••••••••`) by default on initial load and on every subsequent navigation to the page.
2. WHEN an Admin clicks the eye icon in a password cell, THE Credentials_Table SHALL reveal the plain-text password for that specific row only; all other rows in the same table SHALL remain masked.
3. WHEN the Admin clicks the eye icon again on a revealed row, THE Credentials_Table SHALL re-mask the password for that row.
4. WHEN the Admin navigates away from the Credentials_Page and returns, all previously revealed passwords SHALL revert to masked state.

---

### Requirement 7: Row Actions — Copy, Reset Password, Deactivate

**User Story:** As an Admin, I want inline action buttons on each table row, so that I can copy credentials, reset passwords, or deactivate accounts without opening the full drawer.

#### Acceptance Criteria

1. THE Credentials_Table SHALL render an Actions column with buttons: **Copy Username**, **Copy Password**, **Reset Password**, **Deactivate** for the Students and Staff tabs; and **Copy Credentials**, **Reset Password**, **Deactivate** for the Parents tab.
2. WHEN an Admin clicks **Copy Username**, THE Credentials_Page SHALL write the username value to the system clipboard and display a transient "Copied!" confirmation toast for 2 seconds; IF the Clipboard API is unavailable or permission is denied, THE Credentials_Page SHALL display an error toast with the message "Unable to copy — please copy manually".
3. WHEN an Admin clicks **Copy Password**, THE Credentials_Page SHALL write the plain-text password value to the system clipboard and display a transient "Copied!" confirmation toast for 2 seconds; IF the Clipboard API is unavailable or permission is denied, THE Credentials_Page SHALL display an error toast with the message "Unable to copy — please copy manually".
4. WHEN an Admin clicks **Reset Password**, THE Reset_Password_Modal SHALL open pre-populated with the selected user's name and a system-generated new password that is 8–16 characters long and contains at least one uppercase letter, one digit, and one special character.
5. WHEN an Admin confirms the reset inside the Reset_Password_Modal, THE Credentials_Store SHALL update the `password` field for that `UserCredential` record and persist the change to `localStorage`.
6. WHEN an Admin clicks **Deactivate** on an active record, THE Credentials_Store SHALL set `status` to `"inactive"` for that `UserCredential` record, persist to `localStorage`, and THE Summary_Cards SHALL reflect updated counts immediately.
7. IF a `UserCredential` record has `status = "inactive"`, THEN THE Credentials_Table Actions column SHALL display **Activate** instead of **Deactivate**; WHEN the Admin clicks **Activate**, THE Credentials_Store SHALL set `status` to `"active"` and persist the change to `localStorage`.
8. IF writing to `localStorage` fails during a Reset Password or status-change operation, THE Credentials_Page SHALL display an error toast with the message "Failed to save changes — please try again" and SHALL NOT update the in-memory Credentials_Store state.

---

### Requirement 8: Credential Details Drawer

**User Story:** As an Admin, I want to click any credential row to open a details drawer, so that I can see full user information and take actions in context.

#### Acceptance Criteria

1. WHEN an Admin clicks a row in any Credentials_Table (outside the Actions column), THE Details_Drawer SHALL slide in from the right displaying: User Information (full name, role label, linked entity name), Username, Password (masked `••••••••` with a visibility toggle), Last Login (ISO 8601 timestamp or "Never" if `lastLogin` is null), Created Date (ISO 8601 date), and Account Status badge.
2. THE Details_Drawer SHALL include a **Reset Password** button that opens the Reset_Password_Modal pre-populated identically to the row-action flow described in Requirement 7 criterion 4.
3. THE Details_Drawer SHALL include an **Activate/Deactivate** button whose label reads "Deactivate" when `status = "active"` and "Activate" when `status = "inactive"`; clicking the button SHALL apply the same mutation and localStorage persistence as the row-action flow in Requirement 7 criteria 6–7.
4. WHEN the Admin clicks outside the Details_Drawer overlay or presses the Escape key, THE Details_Drawer SHALL close and the selected-row highlight SHALL be cleared.
5. WHEN the Admin clicks a different row while the Details_Drawer is already open, THE Details_Drawer SHALL update its content to reflect the newly clicked row's data without closing and reopening.

---

### Requirement 9: Bulk Actions

**User Story:** As an Admin, I want to select multiple credential records and perform bulk operations, so that I can manage credentials for an entire class or cohort efficiently.

#### Acceptance Criteria

1. THE Credentials_Table SHALL render a checkbox column as the first column; WHEN an Admin checks the header checkbox, THE Credentials_Table SHALL select all rows visible on the current page only (not rows on other pages).
2. WHEN one or more row checkboxes are selected, THE Bulk_Action_Bar SHALL appear above the table displaying a count of selected records and buttons: **Generate Credentials**, **Print Credentials**, **Export PDF**, **Export Excel**; WHEN all checkboxes are deselected, THE Bulk_Action_Bar SHALL disappear.
3. WHEN the Admin clicks **Generate Credentials** in the Bulk_Action_Bar, THE Credentials_Store SHALL invoke the Auto_Generation algorithm for each selected entity, create or overwrite the corresponding `UserCredential` records, and persist all changes to `localStorage` as a single batch write.
4. WHEN the Admin navigates to a different page in the pagination toolbar, THE Credentials_Table SHALL preserve the selection state of rows on previously visited pages (cross-page selection is retained).
5. WHEN the Admin clicks **Export PDF**, THE Export_Service SHALL generate a PDF containing one credential slip per selected record and trigger a browser download; the filename SHALL follow the pattern `credentials-{tab}-{YYYY-MM-DD}.pdf`.
6. WHEN the Admin clicks **Export Excel**, THE Export_Service SHALL generate an XLSX file where each row corresponds to one selected `UserCredential` record (columns: Name, Role, Username, Password, Status, Created Date) and trigger a browser download; the filename SHALL follow the pattern `credentials-{tab}-{YYYY-MM-DD}.xlsx`.

---

### Requirement 10: Auto-Generation Algorithm

**User Story:** As an Admin, I want the system to automatically derive usernames and passwords from entity data, so that credentials are predictable and consistent without manual entry.

#### Acceptance Criteria

1. WHEN a student credential is auto-generated, THE Credentials_Store SHALL set `username` equal to the student's `admission_number` (verbatim, no case transformation) and `password` equal to the student's first name (verbatim, as stored in the `name` field) concatenated with their date-of-birth digits formatted as `DDMMYYYY` (e.g., first name "Arjun", DOB 2015-03-14 → password "Arjun14032015").
2. WHEN a parent credential is auto-generated, THE Credentials_Store SHALL set `username` equal to the parent's `phone` number (digits only, no spaces or dashes) and `password` equal to the parent's first name (verbatim) concatenated with the literal string `@123` (e.g., first name "Ravi" → password "Ravi@123").
3. WHEN a staff credential is auto-generated, THE Credentials_Store SHALL set `username` equal to the staff member's `employee_id` (verbatim) and `password` equal to the staff member's first name (verbatim) concatenated with the literal string `@123` (e.g., first name "Ramesh" → password "Ramesh@123").
4. THE Auto_Generation algorithm SHALL produce identical `username` and `password` values for the same entity on every invocation; calling the algorithm twice for the same entity SHALL yield the same result both times.
5. WHEN credentials are auto-generated for an entity that already has a `UserCredential` record (matched by `linkedEntityId`), THE Credentials_Store SHALL overwrite the existing record's `username` and `password` fields rather than inserting a new record.
6. IF a required source field (e.g., `admission_number`, `phone`, `employee_id`, `dob`) is absent or empty for an entity, THE Auto_Generation algorithm SHALL skip that entity and include its name in a warning summary returned to the caller; it SHALL NOT generate a partial or malformed credential.

---

### Requirement 11: Print Credentials Slip

**User Story:** As an Admin, I want to print individual or bulk credential slips, so that I can distribute physical login cards to students, parents, or staff.

#### Acceptance Criteria

1. WHEN an Admin clicks **Print Credentials** on a single row, THE Credentials_Page SHALL open a print modal displaying a formatted credential slip containing at minimum: the user's full name, role label, username, and masked password (with an option to reveal before printing).
2. WHEN the Admin clicks **Print** inside the single-record print modal, THE Credentials_Page SHALL call `window.print()` scoped to the slip element only; elements outside the slip SHALL be excluded from the printed output via CSS `@media print` rules.
3. WHEN the Admin clicks **Print Credentials** in the Bulk_Action_Bar with one or more records selected, THE Credentials_Page SHALL open a new browser window containing credential slips arranged in a 2-per-row grid for all selected records and SHALL automatically call `window.print()` on that window after the content has loaded.
4. IF the Admin clicks **Print Credentials** in the Bulk_Action_Bar with zero records selected, THE Bulk_Action_Bar SHALL display a validation message "Select at least one record to print" and SHALL NOT open a new browser window.

---

### Requirement 12: Mock Data Initialization

**User Story:** As a developer, I want a TypeScript mock data module that seeds all credential records from the existing mock entities, so that the page has realistic data without a live database.

#### Acceptance Criteria

1. THE Credentials_Store SHALL export a `UserCredential[]` array seeded by applying the Auto_Generation algorithm to all records from `STUDENTS`, `PARENTS`, and the combined staff list from `staffDetailsMockData.ts`.
2. THE Credentials_Store SHALL persist mutations (reset password, activate/deactivate, generate) to `localStorage` under the key `erp_credentials`.
3. WHEN the `erp_credentials` key is absent from `localStorage`, THE Credentials_Store SHALL initialize from the seed data and write it to `localStorage`; WHEN the key is present, THE Credentials_Store SHALL load from `localStorage` without re-seeding.
4. THE `UserCredential` interface SHALL match the Supabase-ready schema exactly:
   ```typescript
   interface UserCredential {
     id: string;
     role: "student" | "parent" | "teacher" | "staff" | "admin";
     username: string;
     password: string;
     linkedEntityId: string;
     status: "active" | "inactive";
     lastLogin: string | null; // ISO 8601 datetime string or null
     createdDate: string;      // ISO 8601 date string
   }
   ```
5. FOR ALL seeded `UserCredential` records, the `linkedEntityId` SHALL reference a valid entity `id` from the corresponding `STUDENTS`, `PARENTS`, or staff array; no orphaned credentials SHALL exist in the seed data.
6. IF a staff record in `staffDetailsMockData.ts` does not have an `employee_id` field, THE seeding logic SHALL derive a fallback `employee_id` using the format `EMP{zero-padded index}` (e.g., `EMP001`) before invoking Auto_Generation; this fallback SHALL also be stored as the `username`.
