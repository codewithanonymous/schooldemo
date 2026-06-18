# School ERP User Flow & Data Consistency Audit Report

**Prepared by:** Senior QA Engineer & School ERP Architect
**Date:** June 18, 2026
**Target Environment:** Frontend production-ready mock database (Local Storage backed)
**Status:** **ALL FLOWS PASSED** (with data-sync corrections applied)

---

## 1. Tested Flows & Results

We validated the 10 core administrative and portal workflows as a real school administrator, teacher, student, and parent would use them.

### Flow 1: Admin Creates Student
* **Sequence:** Admin Panel -> Students CRUD (`/list/students`) -> Add Student -> Student List updates -> Fee Management student records list updates -> Login credentials auto-generated -> Credentials directory page (`/admin/students`) updates.
* **Status:** **PASSED**
* **Verification:** Creating a student automatically hashes the password to `FirstNameDDMMYYYY` and sets the username as the admission number (e.g. `ADM2026301`). The record is written to `localStorage.erp_students` and a fee ledger slot is created, making the student appear in the Fee collection directories and credentials views instantly.

### Flow 2: Admin Creates Teacher
* **Sequence:** Admin Panel -> Staff CRUD (`/list/teachers`) -> Add Teacher -> Assign Class & Section -> Assign Subject -> Teacher List updates -> Dynamic timetable maps -> Teacher Dashboard reflects assignments.
* **Status:** **PASSED**
* **Verification:** The staff creation form generates a teacher record in `localStorage.erp_staff_list`. Subject-class assignments write to `localStorage.erp_teacher_assignments` which dynamically updates the teacher timetable, student list mappings, and teacher statistics views.

### Flow 3: Subject Management
* **Sequence:** Admin Panel -> Subjects CRUD (`/list/subjects`) -> Add Subject -> Map to Class -> Assign to Teacher -> Student schedules and marks sheets update.
* **Status:** **PASSED**
* **Verification:** Subject-class mappings in `localStorage.erp_subject_mappings` successfully dictate which subjects are available in each class, section, and teacher dashboard, maintaining strict hierarchical integrity.

### Flow 4: Fee Management
* **Sequence:** Admin creates Student -> Student appears in Fee lists -> Tuition & Activity Fee assigned based on Class Fee Structure -> Admin collects payment -> Transaction log created -> Pending balance recalculated -> Status updates -> Transaction history reflects payment.
* **Status:** **PASSED**
* **Verification:** Making payments in the Fee Collections portal (`/admin/fee/collections`) recalculates the outstanding balances and logs UPI transaction IDs. All modifications write directly to `localStorage.erp_student_ledger`.

### Flow 5: Parent Portal Synchronization
* **Sequence:** Parent logs in -> selects child -> verifies Total Fee, Paid Amount, Pending Amount, and payment transaction history.
* **Status:** **PASSED**
* **Verification:** The parent dashboard retrieves children from `localStorage.erp_students` and queries `STUDENT_DETAILS_MAP` (which dynamically reads from `STUDENT_LEDGER`). Balances match the fee portal exactly.

### Flow 6: Student Portal Synchronization
* **Sequence:** Student logs in -> checks Fee tab -> verifies Fee Status, Due Amount, and Payment receipts.
* **Status:** **PASSED**
* **Verification:** The student dashboard reads from `STUDENT_LEDGER` via the dynamic proxy, ensuring instant reflection of payments without stale browser cache.

### Flow 7: Exam Creation
* **Sequence:** Admin -> Exams page (`/list/exams`) -> Create Exam -> sets Class, Section, Subject, Date, and Max Marks -> Exam appears in calendars and roster lists.
* **Status:** **PASSED**
* **Verification:** Exams are registered under `localStorage.erp_exams` and populate lists in the teacher marks tab and student dashboards.

### Flow 8: Marks Entry
* **Sequence:** Teacher logs in -> Marks tab (`/teacher/marks`) -> selects Exam, Class, Section, Subject -> Roster loads -> enters marks -> saves.
* **Status:** **PASSED**
* **Verification:** Enters marks and calculates grades (`A+`, `A`, `B`, etc.) and percentages. The grades are saved in `localStorage.erp_teacher_exam_marks_ledgers` as draft/published status.

### Flow 9: Result Publishing
* **Sequence:** Teacher saves marks -> publishes exam results -> Exam module updates -> Student Dashboard reflects scores -> Parent Dashboard reflects scores.
* **Status:** **PASSED**
* **Verification:** Setting the marks ledger to published (non-draft) exposes the grades to the `STUDENT_DETAILS_MAP` proxy, which replaces baseline placeholder scores in student/parent card sections.

### Flow 10: Attendance
* **Sequence:** Teacher logs in -> Attendance page (`/teacher/attendance`) -> selects Class & Section -> takes attendance (Present/Absent/Late/Half Day) -> saves -> Student & Parent dashboards and Admin reports update.
* **Status:** **PASSED**
* **Verification:** Daily attendance registers in `localStorage.erp_teacher_attendance_logs` and updates the student/parent attendance history charts and stats panels.

---

## 2. Summary Table of Flow Statuses

| Flow | Description | Status | Verification Notes |
|---|---|---|---|
| **1** | Admin Creates Student | **PASSED** | Username set to Admission Number; password set to FirstNameDDMMYYYY. |
| **2** | Admin Creates Teacher | **PASSED** | Timetable and assignments auto-generated in `localStorage`. |
| **3** | Subject Management | **PASSED** | Subjects mapped correctly to classes/sections and teacher timetables. |
| **4** | Fee Management | **PASSED** | Balance recalculation and transaction history updates are synchronized. |
| **5** | Parent Portal | **PASSED** | Balance and transactions match the Fee Management panel. |
| **6** | Student Portal | **PASSED** | Due fee balance and receipt records match the Fee database. |
| **7** | Exam Creation | **PASSED** | Exam dates and max marks appear in roster dropdowns. |
| **8** | Marks Entry | **PASSED** | Roster lists update with pass/fail and grade calculation logic. |
| **9** | Result Publishing | **PASSED** | Marks visible in student/parent cards only after publishing. |
| **10**| Attendance | **PASSED** | Daily attendance rate and logs sync to parent/student portals. |

---

## 3. Data Integrity & Sync Issues Resolved

Before this audit, several critical data synchronization gaps were identified and corrected in the codebase:

1. **In-Memory vs. LocalStorage Gaps:** 
   * **Issue:** Student profile logs, attendance history, and marks were kept in a static in-memory file (`studentDetailsMockData.ts`), whereas student creation, teacher attendance, and exam marks were saved to `localStorage`. This caused data recorded at runtime to disappear on refresh.
   * **Fix:** Rewrote `studentDetailsMockData.ts` to export `STUDENT_DETAILS_MAP` as a ES6 Proxy. This interceptor dynamically aggregates baseline mock records with live data from `erp_teacher_attendance_logs`, `erp_teacher_exam_marks_ledgers`, and `erp_student_ledger` in `localStorage` on demand.

2. **String vs. Number ID Casts:**
   * **Issue:** The Fee Management module cast student IDs to `Number`, which returned `NaN` for real alphanumeric student IDs like `std-002` or `usr-student-001`.
   * **Fix:** Refactored `feeStudents.js` and `feeCollectionService.js` to preserve string-based IDs and implemented a numeric string hash accumulator for modulus-based receipt generation.

3. **Double Marks/Exam Records:**
   * **Issue:** Teacher exam marks ledgers used shorthand codes like `mid` or `final`, while student report card lists used long labels like `Midterm Exam` or `Final Exam`. This caused duplicate test lines to render on the student card.
   * **Fix:** Injected translation maps in the details resolver to map shorthands to standard academic titles and overwrite placeholders.

4. **TypeScript Syntax in JS Files:**
   * **Issue:** The compilation build failed because type assertions like `as const` were written inside the JavaScript mock file `feeStudents.js`.
   * **Fix:** Removed the TypeScript-specific `as const` castings, allowing the Vite production bundler to compile with zero errors.

---

## 4. UX & Navigation Enhancements

1. **Email Login Constraint Removed:**
   * **Issue:** The login screen utilized `type="email"` on the input element, which blocked students from logging in with their alphanumeric admission numbers (e.g., `ADM2026001`).
   * **Fix:** Changed the input type to `type="text"` and updated labels and placeholders to guide users that they can use their Username, Email, or Admission ID.

2. **Credential Print/Copy Section:**
   * **Issue:** Admins had no way to print or copy credentials slip cards to hand out to new students.
   * **Fix:** Created the dedicated `/admin/students` page equipped with bulk search, filters by class/section, quick clipboard copying, individual print-slips, and a multi-slip layout print window.

---

## 5. Architectural Guide for Future Expansion

### Multi-Student Support
* **Target Schema:** Currently, students are modeled as a flat array in `localStorage.erp_students`. To support future academic transfers and track history:
  * Maintain a separate `student_enrollments` table mapping `student_id` to `class_id`, `section_id`, and `academic_year_id`.
  * Store a history of promotions and class transfers so that a student's past grades remain linked to their historic classes rather than their active class.

### Multi-Parent Support
* **Target Schema:** Link parents to students using a many-to-many junction table (`student_parent_relations` containing `student_id`, `parent_id`, `relationship_type` like Father, Mother, Guardian).
* **Portal Sync:** Modify the parent dashboard to query all relations where `parent_id = current_user_id` and list them in a child-switcher dropdown (fully supported by the current dynamic switcher implementation).

### Multi-Teacher Support
* **Target Schema:** The Single Source of Truth for teacher assignments should continue to be `localStorage.erp_teacher_assignments`.
* **Portal Sync:** To handle co-teachers or section supervisors:
  * Add a `role` field to `TeacherAssignment` (e.g. `Primary Teacher`, `Co-Teacher`, `Lab assistant`).
  * Ensure the attendance logs contain both `submitted_by` (teacher ID) and `verified_by` (supervisor/HOD ID).
