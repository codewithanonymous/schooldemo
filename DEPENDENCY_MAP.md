# DEPENDENCY MAP: Terminology Mapping & Refactoring Plan

This mapping details how college-specific terminology and structures in `accounts/` are mapped to school-specific terminology in `schoolproject/`.

---

## 1. Field Mapping Table

| College Concept | Field Name in Code | School Concept | Target Field Name | Migration Action |
| :--- | :--- | :--- | :--- | :--- |
| **Department** | `department_name`, `department_id` | **Class** | `class_name`, `class_id` | Replace all references. Map values (e.g. "CSE", "ECE") to school classes (e.g. "Class 1", "Class 2"). |
| **Branch** | `branch_name`, `branch_id`, `branch_code` | **Section** | `section_name`, `section_id`, `section_code` | Replace all references. Map values to sections (e.g. "A", "B", "C"). |
| **Course** | `course_name`, `course_id`, `course_code` | **N/A** | *(None)* | Remove all references. School students are organized by Class + Section. |
| **Semester** | `semester_name`, `semester_id` | **N/A** | *(None)* | Remove all references. Track fee structures by Academic Year. |
| **Academic Program**| `program_name`, `program_id` | **N/A** | *(None)* | Remove all references. |
| **Roll Number** | `roll_number` | **Admission Number** & **Roll Number** | `admission_number`, `roll_number` | Retain both. Map Roll Number as secondary and Admission Number as primary student key. |
| **Collector** | `collected_by` | **Collector (Staff)** | `collected_by` | Retain. Map to users/staff with administrator privileges. |

---

## 2. File-by-File Terminology Refactoring Action Map

### `supabaseClient.ts` (Converted to Service abstraction)
- **Field Usage**: `course_id`, `branch_id`, references to `courses`, `branches`, `Course`, `Branch` interfaces.
- **Migration Action**: 
  - Remove all SQL database references and Supabase Client calls.
  - Define typescript interfaces matching the new School entity models: `Student`, `Class`, `Section`, `Transaction`, `Receipt`, `FeeType`, `FeeStructure`, `AcademicYear`.

### `DashboardHome.tsx` -> `FeeDashboard.jsx`
- **Field Usage**: Recent transactions table header lists `Roll Number`. Calls `due_fees_view`.
- **Migration Action**:
  - Replace dashboard banner text.
  - Convert statistics to school terminology: expected/collected fees, pending count, payment modes.
  - Consume data from `feeDashboardService`.

### `dueFees.tsx` -> `FeePending.jsx`
- **Field Usage**: `course_name`, `branch_name`, `year_name` interfaces. `filterBranch` state, `filterYear` state. Select inputs for branch filtering.
- **Migration Action**:
  - Replace branch filter selector with Class selector.
  - Replace year filter selector with Section selector.
  - Update row rendering: display student name, admission number, class, section, outstanding balance.
  - Consume data from `feeCollectionService` (specifically get pending fee lists).

### `feeCollection.tsx` -> `FeeCollections.jsx`
- **Field Usage**: Student select dropdown displays `branches` and `courses` metadata. Detailed receipt info displays `Course` and `Branch`. Calls Supabase RPC `generate_receipt_number`.
- **Migration Action**:
  - Update student card metadata display: show Admission Number, Class, Section.
  - In dynamic fee breakdown: bind entries to school fee items (Tuition Fee, Bus Fee, Exam Fee).
  - Update submission action to save transaction via `feeCollectionService.recordPayment()`.

### `receipts.tsx` -> `FeeReceipts.jsx`
- **Field Usage**: Receipt details card displays `Branch` and `Academic Year`. Embedded print template lists `Kakatiya Institute of Technology & Science for Women`, `Course / Branch` cell.
- **Migration Action**:
  - Replace print template header with school parameters (School Name, Logo placeholder).
  - Replace `Course / Branch` in the receipt layout with `Class / Section`.
  - Add `Admission Number` to receipt info table.
  - Consume data from `feeReceiptService`.

### `transactions.tsx` -> `FeeTransactions.jsx`
- **Field Usage**: Columns include `Student`, `Roll Number`, `Academic Year`.
- **Migration Action**:
  - Replace Roll Number column with Admission Number (or show both).
  - Replace Academic Year column with Class & Section.
  - Group transactions list by payment receipts using `feeTransactionService`.

### `reports.tsx` -> `FeeReports.jsx`
- **Field Usage**: Renders analytics by Department (`byDepartment`), by Academic Year (`byYear`). Sheet exports include "Department Revenue" and "Academic Year Revenue".
- **Migration Action**:
  - Refactor report sheets:
    1. **Revenue by Class** (replaces Department Revenue)
    2. **Revenue by Section** (replaces Academic Year Revenue)
    3. **Monthly Collections**
    4. **Payment Mode Breakdown**
    5. **Outstanding Dues Report**
  - Consume data from `feeReportService`.

### `settings.tsx` -> `FeeStructure.jsx`
- **Field Usage**: Tabs for `Courses`, `Branches`, `Fee Types`, `Academic Years`. Management tables for Course Codes and Branch Names.
- **Migration Action**:
  - Refactor tabs to:
    1. **Classes** (replaces Courses)
    2. **Sections** (replaces Branches)
    3. **Fee Types** (retains original concept)
    4. **Academic Years** (retains original concept)
  - Display class-wise expected fee allocations in the Classes tab.
  - Manage sections (linked to classes) in the Sections tab.
