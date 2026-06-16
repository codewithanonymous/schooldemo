-- =============================================================================
-- SCHOOL MANAGEMENT SAAS — RLS POLICIES v2
-- =============================================================================
-- Run AFTER schema.sql.
-- Every policy is school-id scoped. is_admin() only grants access within the
-- caller's own school. super_admin bypasses everything.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Drop all existing policies (idempotent clean slate)
-- ---------------------------------------------------------------------------
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- =============================================================================
-- SCHOOLS
-- Super admin: full access
-- Admin/teacher/student/parent: can read ONLY their own school row
-- =============================================================================
CREATE POLICY "schools: super_admin full"
  ON public.schools FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "schools: member read own"
  ON public.schools FOR SELECT
  USING (id = public.my_school_id());

-- =============================================================================
-- ACADEMIC YEARS
-- =============================================================================
CREATE POLICY "academic_years: super_admin full"
  ON public.academic_years FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "academic_years: admin full in school"
  ON public.academic_years FOR ALL
  USING (school_id = public.my_school_id() AND public.is_admin())
  WITH CHECK (school_id = public.my_school_id() AND public.is_admin());

CREATE POLICY "academic_years: members read own school"
  ON public.academic_years FOR SELECT
  USING (school_id = public.my_school_id());

-- =============================================================================
-- PROFILES
-- Users read own profile. Admins read all profiles in their school.
-- Super admin reads all. Updates are admin-only (role/school assignments).
-- =============================================================================
CREATE POLICY "profiles: own read"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "profiles: super_admin full"
  ON public.profiles FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "profiles: admin read own school"
  ON public.profiles FOR SELECT
  USING (public.is_admin() AND school_id = public.my_school_id());

CREATE POLICY "profiles: admin update own school"
  ON public.profiles FOR UPDATE
  USING (public.is_admin() AND school_id = public.my_school_id())
  WITH CHECK (
    public.is_admin() AND
    school_id = public.my_school_id() AND
    -- Admin cannot elevate anyone to super_admin or change their own role
    role != 'super_admin'
  );

-- =============================================================================
-- GRADES
-- Scoped per school. Admin manages; all school members read.
-- =============================================================================
CREATE POLICY "grades: super_admin full"
  ON public.grades FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "grades: admin manage"
  ON public.grades FOR ALL
  USING (school_id = public.my_school_id() AND public.is_admin())
  WITH CHECK (school_id = public.my_school_id() AND public.is_admin());

CREATE POLICY "grades: school members read"
  ON public.grades FOR SELECT
  USING (school_id = public.my_school_id());

-- =============================================================================
-- SUBJECTS
-- Scoped per school. Admin manages; all school members read.
-- =============================================================================
CREATE POLICY "subjects: super_admin full"
  ON public.subjects FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "subjects: admin manage"
  ON public.subjects FOR ALL
  USING (school_id = public.my_school_id() AND public.is_admin())
  WITH CHECK (school_id = public.my_school_id() AND public.is_admin());

CREATE POLICY "subjects: school members read"
  ON public.subjects FOR SELECT
  USING (school_id = public.my_school_id());

-- =============================================================================
-- TEACHERS
-- Key constraint: every teacher query is AND school_id = my_school_id().
-- This is what prevents cross-school data leakage.
-- =============================================================================
CREATE POLICY "teachers: super_admin full"
  ON public.teachers FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Admin: full CRUD within own school only
CREATE POLICY "teachers: admin full in school"
  ON public.teachers FOR ALL
  USING (school_id = public.my_school_id() AND public.is_admin())
  WITH CHECK (school_id = public.my_school_id() AND public.is_admin());

-- Teacher: read and update own row only
CREATE POLICY "teachers: own read"
  ON public.teachers FOR SELECT
  USING (id = auth.uid() AND school_id = public.my_school_id());

CREATE POLICY "teachers: own update"
  ON public.teachers FOR UPDATE
  USING (id = auth.uid() AND school_id = public.my_school_id())
  WITH CHECK (id = auth.uid() AND school_id = public.my_school_id());

-- Students/parents: read basic teacher info for schedule display (in their school)
CREATE POLICY "teachers: student read in school"
  ON public.teachers FOR SELECT
  USING (
    school_id = public.my_school_id() AND
    public.my_role() IN ('student', 'parent')
  );

-- =============================================================================
-- PARENTS
-- =============================================================================
CREATE POLICY "parents: super_admin full"
  ON public.parents FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "parents: admin full in school"
  ON public.parents FOR ALL
  USING (school_id = public.my_school_id() AND public.is_admin())
  WITH CHECK (school_id = public.my_school_id() AND public.is_admin());

-- Parent: own record only
CREATE POLICY "parents: own read"
  ON public.parents FOR SELECT
  USING (id = auth.uid() AND school_id = public.my_school_id());

CREATE POLICY "parents: own update"
  ON public.parents FOR UPDATE
  USING (id = auth.uid() AND school_id = public.my_school_id())
  WITH CHECK (id = auth.uid() AND school_id = public.my_school_id());

-- Teacher: read parent info for students in their classes (same school)
CREATE POLICY "parents: teacher reads linked"
  ON public.parents FOR SELECT
  USING (
    school_id = public.my_school_id() AND
    public.is_teacher() AND
    id IN (
      SELECT sp.parent_id
      FROM public.student_parents sp
      JOIN public.students s ON s.id = sp.student_id
      JOIN public.lessons  l ON l.class_id = s.class_id
      WHERE l.teacher_id = auth.uid()
    )
  );

-- =============================================================================
-- CLASSES
-- =============================================================================
CREATE POLICY "classes: super_admin full"
  ON public.classes FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "classes: admin full in school"
  ON public.classes FOR ALL
  USING (school_id = public.my_school_id() AND public.is_admin())
  WITH CHECK (school_id = public.my_school_id() AND public.is_admin());

-- Teacher: read all classes in their school (needed for schedule/dropdown)
CREATE POLICY "classes: teacher read in school"
  ON public.classes FOR SELECT
  USING (school_id = public.my_school_id() AND public.is_teacher());

-- Student: read only own class
CREATE POLICY "classes: student own class"
  ON public.classes FOR SELECT
  USING (
    school_id = public.my_school_id() AND
    public.my_role() = 'student' AND
    id IN (SELECT class_id FROM public.students WHERE id = auth.uid())
  );

-- Parent: read children's classes
CREATE POLICY "classes: parent children classes"
  ON public.classes FOR SELECT
  USING (
    school_id = public.my_school_id() AND
    public.my_role() = 'parent' AND
    id IN (
      SELECT s.class_id
      FROM public.students s
      JOIN public.student_parents sp ON sp.student_id = s.id
      WHERE sp.parent_id = auth.uid()
    )
  );

-- =============================================================================
-- STUDENTS
-- =============================================================================
CREATE POLICY "students: super_admin full"
  ON public.students FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "students: admin full in school"
  ON public.students FOR ALL
  USING (school_id = public.my_school_id() AND public.is_admin())
  WITH CHECK (school_id = public.my_school_id() AND public.is_admin());

-- Teacher: read students in their assigned classes only (same school)
CREATE POLICY "students: teacher reads assigned class"
  ON public.students FOR SELECT
  USING (
    school_id = public.my_school_id() AND
    public.is_teacher() AND
    class_id IN (
      SELECT DISTINCT class_id FROM public.lessons
      WHERE teacher_id = auth.uid() AND school_id = public.my_school_id()
    )
  );

-- Student: own record only
CREATE POLICY "students: own read"
  ON public.students FOR SELECT
  USING (id = auth.uid() AND school_id = public.my_school_id());

-- Parent: own children only
CREATE POLICY "students: parent own children"
  ON public.students FOR SELECT
  USING (
    school_id = public.my_school_id() AND
    public.my_role() = 'parent' AND
    id IN (
      SELECT student_id FROM public.student_parents
      WHERE parent_id = auth.uid()
    )
  );

-- =============================================================================
-- STUDENT_PARENTS
-- =============================================================================
CREATE POLICY "student_parents: super_admin full"
  ON public.student_parents FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "student_parents: admin manage"
  ON public.student_parents FOR ALL
  USING (
    public.is_admin() AND
    student_id IN (SELECT id FROM public.students WHERE school_id = public.my_school_id())
  )
  WITH CHECK (
    public.is_admin() AND
    student_id IN (SELECT id FROM public.students WHERE school_id = public.my_school_id())
  );

-- Parent: read own links
CREATE POLICY "student_parents: parent own"
  ON public.student_parents FOR SELECT
  USING (parent_id = auth.uid());

-- Student: read own links
CREATE POLICY "student_parents: student own"
  ON public.student_parents FOR SELECT
  USING (student_id = auth.uid());

-- Teacher: read links for students in their classes
CREATE POLICY "student_parents: teacher read"
  ON public.student_parents FOR SELECT
  USING (
    public.is_teacher() AND
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.lessons l ON l.class_id = s.class_id
      WHERE l.teacher_id = auth.uid() AND s.school_id = public.my_school_id()
    )
  );

-- =============================================================================
-- TEACHER_SUBJECTS
-- =============================================================================
CREATE POLICY "teacher_subjects: super_admin full"
  ON public.teacher_subjects FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "teacher_subjects: admin manage"
  ON public.teacher_subjects FOR ALL
  USING (school_id = public.my_school_id() AND public.is_admin())
  WITH CHECK (school_id = public.my_school_id() AND public.is_admin());

CREATE POLICY "teacher_subjects: school members read"
  ON public.teacher_subjects FOR SELECT
  USING (school_id = public.my_school_id());

-- =============================================================================
-- LESSONS
-- =============================================================================
CREATE POLICY "lessons: super_admin full"
  ON public.lessons FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "lessons: admin full in school"
  ON public.lessons FOR ALL
  USING (school_id = public.my_school_id() AND public.is_admin())
  WITH CHECK (school_id = public.my_school_id() AND public.is_admin());

-- Teacher: full control over own lessons in their school
CREATE POLICY "lessons: teacher own"
  ON public.lessons FOR SELECT
  USING (school_id = public.my_school_id() AND teacher_id = auth.uid());

CREATE POLICY "lessons: teacher insert"
  ON public.lessons FOR INSERT
  WITH CHECK (school_id = public.my_school_id() AND teacher_id = auth.uid() AND public.is_teacher());

CREATE POLICY "lessons: teacher update own"
  ON public.lessons FOR UPDATE
  USING (school_id = public.my_school_id() AND teacher_id = auth.uid())
  WITH CHECK (school_id = public.my_school_id() AND teacher_id = auth.uid());

-- Student: lessons for own class in own school
CREATE POLICY "lessons: student own class"
  ON public.lessons FOR SELECT
  USING (
    school_id = public.my_school_id() AND
    class_id IN (SELECT class_id FROM public.students WHERE id = auth.uid())
  );

-- Parent: lessons for children's classes in own school
CREATE POLICY "lessons: parent children"
  ON public.lessons FOR SELECT
  USING (
    school_id = public.my_school_id() AND
    class_id IN (
      SELECT s.class_id FROM public.students s
      JOIN public.student_parents sp ON sp.student_id = s.id
      WHERE sp.parent_id = auth.uid()
    )
  );

-- =============================================================================
-- EXAMS
-- =============================================================================
CREATE POLICY "exams: super_admin full"
  ON public.exams FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "exams: admin full in school"
  ON public.exams FOR ALL
  USING (school_id = public.my_school_id() AND public.is_admin())
  WITH CHECK (school_id = public.my_school_id() AND public.is_admin());

CREATE POLICY "exams: teacher own lessons"
  ON public.exams FOR SELECT
  USING (
    school_id = public.my_school_id() AND
    lesson_id IN (SELECT id FROM public.lessons WHERE teacher_id = auth.uid())
  );

CREATE POLICY "exams: teacher write own"
  ON public.exams FOR INSERT
  WITH CHECK (
    school_id = public.my_school_id() AND public.is_teacher() AND
    lesson_id IN (SELECT id FROM public.lessons WHERE teacher_id = auth.uid())
  );

CREATE POLICY "exams: teacher update own"
  ON public.exams FOR UPDATE
  USING (
    school_id = public.my_school_id() AND
    lesson_id IN (SELECT id FROM public.lessons WHERE teacher_id = auth.uid())
  )
  WITH CHECK (
    school_id = public.my_school_id() AND
    lesson_id IN (SELECT id FROM public.lessons WHERE teacher_id = auth.uid())
  );

CREATE POLICY "exams: teacher delete own"
  ON public.exams FOR DELETE
  USING (
    school_id = public.my_school_id() AND
    lesson_id IN (SELECT id FROM public.lessons WHERE teacher_id = auth.uid())
  );

CREATE POLICY "exams: student own class"
  ON public.exams FOR SELECT
  USING (
    school_id = public.my_school_id() AND
    lesson_id IN (
      SELECT l.id FROM public.lessons l
      JOIN public.students s ON s.class_id = l.class_id
      WHERE s.id = auth.uid()
    )
  );

CREATE POLICY "exams: parent children"
  ON public.exams FOR SELECT
  USING (
    school_id = public.my_school_id() AND
    lesson_id IN (
      SELECT l.id FROM public.lessons l
      JOIN public.students s ON s.class_id = l.class_id
      JOIN public.student_parents sp ON sp.student_id = s.id
      WHERE sp.parent_id = auth.uid()
    )
  );

-- =============================================================================
-- ASSIGNMENTS
-- =============================================================================
CREATE POLICY "assignments: super_admin full"
  ON public.assignments FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "assignments: admin full in school"
  ON public.assignments FOR ALL
  USING (school_id = public.my_school_id() AND public.is_admin())
  WITH CHECK (school_id = public.my_school_id() AND public.is_admin());

CREATE POLICY "assignments: teacher own lessons"
  ON public.assignments FOR SELECT
  USING (
    school_id = public.my_school_id() AND
    lesson_id IN (SELECT id FROM public.lessons WHERE teacher_id = auth.uid())
  );

CREATE POLICY "assignments: teacher write"
  ON public.assignments FOR INSERT
  WITH CHECK (
    school_id = public.my_school_id() AND public.is_teacher() AND
    lesson_id IN (SELECT id FROM public.lessons WHERE teacher_id = auth.uid())
  );

CREATE POLICY "assignments: teacher update"
  ON public.assignments FOR UPDATE
  USING (
    school_id = public.my_school_id() AND
    lesson_id IN (SELECT id FROM public.lessons WHERE teacher_id = auth.uid())
  )
  WITH CHECK (
    school_id = public.my_school_id() AND
    lesson_id IN (SELECT id FROM public.lessons WHERE teacher_id = auth.uid())
  );

CREATE POLICY "assignments: teacher delete"
  ON public.assignments FOR DELETE
  USING (
    school_id = public.my_school_id() AND
    lesson_id IN (SELECT id FROM public.lessons WHERE teacher_id = auth.uid())
  );

CREATE POLICY "assignments: student own class"
  ON public.assignments FOR SELECT
  USING (
    school_id = public.my_school_id() AND
    lesson_id IN (
      SELECT l.id FROM public.lessons l
      JOIN public.students s ON s.class_id = l.class_id
      WHERE s.id = auth.uid()
    )
  );

CREATE POLICY "assignments: parent children"
  ON public.assignments FOR SELECT
  USING (
    school_id = public.my_school_id() AND
    lesson_id IN (
      SELECT l.id FROM public.lessons l
      JOIN public.students s ON s.class_id = l.class_id
      JOIN public.student_parents sp ON sp.student_id = s.id
      WHERE sp.parent_id = auth.uid()
    )
  );

-- =============================================================================
-- RESULTS
-- =============================================================================
CREATE POLICY "results: super_admin full"
  ON public.results FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "results: admin full in school"
  ON public.results FOR ALL
  USING (school_id = public.my_school_id() AND public.is_admin())
  WITH CHECK (school_id = public.my_school_id() AND public.is_admin());

CREATE POLICY "results: teacher own class students"
  ON public.results FOR SELECT
  USING (
    school_id = public.my_school_id() AND
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.lessons l ON l.class_id = s.class_id
      WHERE l.teacher_id = auth.uid() AND l.school_id = public.my_school_id()
    )
  );

CREATE POLICY "results: teacher write own students"
  ON public.results FOR INSERT
  WITH CHECK (
    school_id = public.my_school_id() AND public.is_teacher() AND
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.lessons l ON l.class_id = s.class_id
      WHERE l.teacher_id = auth.uid() AND l.school_id = public.my_school_id()
    )
  );

CREATE POLICY "results: teacher update own students"
  ON public.results FOR UPDATE
  USING (
    school_id = public.my_school_id() AND
    graded_by = auth.uid()
  )
  WITH CHECK (
    school_id = public.my_school_id() AND
    graded_by = auth.uid()
  );

CREATE POLICY "results: student own"
  ON public.results FOR SELECT
  USING (school_id = public.my_school_id() AND student_id = auth.uid());

CREATE POLICY "results: parent children"
  ON public.results FOR SELECT
  USING (
    school_id = public.my_school_id() AND
    student_id IN (
      SELECT student_id FROM public.student_parents WHERE parent_id = auth.uid()
    )
  );

-- =============================================================================
-- ATTENDANCE
-- =============================================================================
CREATE POLICY "attendance: super_admin full"
  ON public.attendance FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "attendance: admin full in school"
  ON public.attendance FOR ALL
  USING (school_id = public.my_school_id() AND public.is_admin())
  WITH CHECK (school_id = public.my_school_id() AND public.is_admin());

CREATE POLICY "attendance: teacher own lessons"
  ON public.attendance FOR SELECT
  USING (
    school_id = public.my_school_id() AND
    lesson_id IN (SELECT id FROM public.lessons WHERE teacher_id = auth.uid())
  );

CREATE POLICY "attendance: teacher write"
  ON public.attendance FOR INSERT
  WITH CHECK (
    school_id = public.my_school_id() AND public.is_teacher() AND
    lesson_id IN (SELECT id FROM public.lessons WHERE teacher_id = auth.uid())
  );

CREATE POLICY "attendance: teacher update"
  ON public.attendance FOR UPDATE
  USING (
    school_id = public.my_school_id() AND
    marked_by = auth.uid()
  )
  WITH CHECK (
    school_id = public.my_school_id() AND
    marked_by = auth.uid()
  );

CREATE POLICY "attendance: student own"
  ON public.attendance FOR SELECT
  USING (school_id = public.my_school_id() AND student_id = auth.uid());

CREATE POLICY "attendance: parent children"
  ON public.attendance FOR SELECT
  USING (
    school_id = public.my_school_id() AND
    student_id IN (
      SELECT student_id FROM public.student_parents WHERE parent_id = auth.uid()
    )
  );

-- =============================================================================
-- FEE_TEMPLATES
-- =============================================================================
CREATE POLICY "fee_templates: super_admin full"
  ON public.fee_templates FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "fee_templates: admin full in school"
  ON public.fee_templates FOR ALL
  USING (school_id = public.my_school_id() AND public.is_admin())
  WITH CHECK (school_id = public.my_school_id() AND public.is_admin());

-- All school members can see fee structure
CREATE POLICY "fee_templates: school members read"
  ON public.fee_templates FOR SELECT
  USING (school_id = public.my_school_id());

-- =============================================================================
-- FEES
-- =============================================================================
CREATE POLICY "fees: super_admin full"
  ON public.fees FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "fees: admin full in school"
  ON public.fees FOR ALL
  USING (school_id = public.my_school_id() AND public.is_admin())
  WITH CHECK (school_id = public.my_school_id() AND public.is_admin());

-- Teacher: read-only view of fee status for students in their classes
CREATE POLICY "fees: teacher read own class"
  ON public.fees FOR SELECT
  USING (
    school_id = public.my_school_id() AND
    public.is_teacher() AND
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.lessons l ON l.class_id = s.class_id
      WHERE l.teacher_id = auth.uid()
    )
  );

-- Student: own fees only
CREATE POLICY "fees: student own"
  ON public.fees FOR SELECT
  USING (school_id = public.my_school_id() AND student_id = auth.uid());

-- Parent: own children's fees
CREATE POLICY "fees: parent children"
  ON public.fees FOR SELECT
  USING (
    school_id = public.my_school_id() AND
    student_id IN (
      SELECT student_id FROM public.student_parents WHERE parent_id = auth.uid()
    )
  );

-- =============================================================================
-- EVENTS
-- =============================================================================
CREATE POLICY "events: super_admin full"
  ON public.events FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "events: admin full in school"
  ON public.events FOR ALL
  USING (school_id = public.my_school_id() AND public.is_admin())
  WITH CHECK (school_id = public.my_school_id() AND public.is_admin());

-- Teacher: school-wide + own class events; write own
CREATE POLICY "events: teacher read"
  ON public.events FOR SELECT
  USING (
    school_id = public.my_school_id() AND (
      class_id IS NULL OR
      class_id IN (
        SELECT DISTINCT class_id FROM public.lessons
        WHERE teacher_id = auth.uid() AND school_id = public.my_school_id()
      )
    )
  );

CREATE POLICY "events: teacher write"
  ON public.events FOR INSERT
  WITH CHECK (
    school_id = public.my_school_id() AND
    public.is_teacher() AND
    created_by = auth.uid()
  );

-- Student: school-wide + own class
CREATE POLICY "events: student read"
  ON public.events FOR SELECT
  USING (
    school_id = public.my_school_id() AND (
      class_id IS NULL OR
      class_id IN (SELECT class_id FROM public.students WHERE id = auth.uid())
    )
  );

-- Parent: school-wide + children's classes
CREATE POLICY "events: parent read"
  ON public.events FOR SELECT
  USING (
    school_id = public.my_school_id() AND (
      class_id IS NULL OR
      class_id IN (
        SELECT s.class_id FROM public.students s
        JOIN public.student_parents sp ON sp.student_id = s.id
        WHERE sp.parent_id = auth.uid()
      )
    )
  );

-- =============================================================================
-- ANNOUNCEMENTS
-- =============================================================================
CREATE POLICY "announcements: super_admin full"
  ON public.announcements FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "announcements: admin full in school"
  ON public.announcements FOR ALL
  USING (school_id = public.my_school_id() AND public.is_admin())
  WITH CHECK (school_id = public.my_school_id() AND public.is_admin());

CREATE POLICY "announcements: teacher read"
  ON public.announcements FOR SELECT
  USING (
    school_id = public.my_school_id() AND (
      class_id IS NULL OR
      class_id IN (
        SELECT DISTINCT class_id FROM public.lessons
        WHERE teacher_id = auth.uid() AND school_id = public.my_school_id()
      )
    )
  );

CREATE POLICY "announcements: teacher write"
  ON public.announcements FOR INSERT
  WITH CHECK (
    school_id = public.my_school_id() AND
    public.is_teacher() AND
    created_by = auth.uid()
  );

CREATE POLICY "announcements: student read"
  ON public.announcements FOR SELECT
  USING (
    school_id = public.my_school_id() AND (
      class_id IS NULL OR
      class_id IN (SELECT class_id FROM public.students WHERE id = auth.uid())
    )
  );

CREATE POLICY "announcements: parent read"
  ON public.announcements FOR SELECT
  USING (
    school_id = public.my_school_id() AND (
      class_id IS NULL OR
      class_id IN (
        SELECT s.class_id FROM public.students s
        JOIN public.student_parents sp ON sp.student_id = s.id
        WHERE sp.parent_id = auth.uid()
      )
    )
  );
