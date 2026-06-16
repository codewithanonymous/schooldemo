-- =============================================================================
-- SCHOOL MANAGEMENT SAAS — DEMO SEED DATA
-- =============================================================================
-- Run AFTER schema.sql + rls_policies.sql.
--
-- !! IMPORTANT — READ BEFORE RUNNING !!
-- -----------------------------------------------------------------------
-- This file seeds the *public schema only*.
-- The auth.users rows for these demo accounts must already exist in Supabase
-- Auth BEFORE you run this file, because profiles.id is a FK → auth.users.id.
--
-- Create the auth users first via one of these methods:
--   A) Supabase Dashboard → Authentication → Users → "Add user"
--   B) The create-user Edge Function
--   C) The Supabase CLI: supabase seed auth (requires seed.json)
--
-- Demo credentials (password: 12345678 for all):
--   admin@example.com    → role: admin
--   teacher@example.com  → role: teacher
--   student@example.com  → role: student
--   parent@example.com   → role: parent
--
-- The UUIDs below match the backup snapshot. If you create fresh auth users
-- they will have different UUIDs — update the uuid constants at the top of
-- this file to match.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- UUID constants — update these if your auth users have different IDs
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  -- Auth user IDs (must exist in auth.users before this runs)
  v_admin_id   uuid := 'a47dbc41-f303-45a8-ad0a-aa592cfbdcef';
  v_teacher_id uuid := 'cd332a11-15e7-42fe-a1c2-d57d1e28f117';
  v_parent_id  uuid := 'f9aeb76e-bd88-49ae-9a82-c3103a95290f';
  v_student_id uuid := '1435a3f7-f453-41dc-9331-15d98d592196';

  -- Generated IDs
  v_school_id       uuid;
  v_year_id         integer;
  v_grade_id        integer;
  v_subject_id      integer;
  v_class_id        integer;

BEGIN
  -- -------------------------------------------------------------------------
  -- 1. SCHOOL
  -- -------------------------------------------------------------------------
  INSERT INTO public.schools (id, name, slug, address, phone, email, is_active)
  VALUES (
    gen_random_uuid(),
    'Demo School',
    'demo-school',
    '1 Demo Street, Demo City',
    '+1-555-0100',
    'info@demo-school.edu',
    true
  )
  ON CONFLICT (slug) DO NOTHING;

  SELECT id INTO v_school_id FROM public.schools WHERE slug = 'demo-school';

  -- -------------------------------------------------------------------------
  -- 2. ACADEMIC YEAR
  -- -------------------------------------------------------------------------
  INSERT INTO public.academic_years (school_id, label, start_date, end_date, is_current)
  VALUES (v_school_id, '2025-2026', '2025-09-01', '2026-06-30', true)
  ON CONFLICT (school_id, label) DO NOTHING;

  SELECT id INTO v_year_id
  FROM   public.academic_years
  WHERE  school_id = v_school_id AND label = '2025-2026';

  -- -------------------------------------------------------------------------
  -- 3. GRADE
  -- -------------------------------------------------------------------------
  INSERT INTO public.grades (school_id, level, label)
  VALUES (v_school_id, 5, 'Grade 5')
  ON CONFLICT (school_id, level) DO NOTHING;

  SELECT id INTO v_grade_id
  FROM   public.grades
  WHERE  school_id = v_school_id AND level = 5;

  -- -------------------------------------------------------------------------
  -- 4. SUBJECT
  -- -------------------------------------------------------------------------
  INSERT INTO public.subjects (school_id, name, code)
  VALUES (v_school_id, 'Mathematics', 'MATH101')
  ON CONFLICT (school_id, name) DO NOTHING;

  SELECT id INTO v_subject_id
  FROM   public.subjects
  WHERE  school_id = v_school_id AND name = 'Mathematics';

  -- -------------------------------------------------------------------------
  -- 5. PROFILES  (auth users must already exist for these inserts to succeed)
  -- -------------------------------------------------------------------------
  INSERT INTO public.profiles (id, email, role, school_id)
  VALUES
    (v_admin_id,   'admin@example.com',   'admin',   v_school_id),
    (v_teacher_id, 'teacher@example.com', 'teacher', v_school_id),
    (v_parent_id,  'parent@example.com',  'parent',  v_school_id),
    (v_student_id, 'student@example.com', 'student', v_school_id)
  ON CONFLICT (id) DO UPDATE
    SET role      = EXCLUDED.role,
        school_id = EXCLUDED.school_id,
        email     = EXCLUDED.email,
        updated_at = now();

  -- -------------------------------------------------------------------------
  -- 6. TEACHER ROW
  -- -------------------------------------------------------------------------
  INSERT INTO public.teachers (id, school_id, username, name, surname, email,
                                phone, address, sex, blood_type, birthday)
  VALUES (
    v_teacher_id, v_school_id, 'teacher',
    'Demo', 'Teacher', 'teacher@example.com',
    NULL, 'Demo Address', 'MALE', 'A+', '1980-01-01'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Teacher → Subject link
  INSERT INTO public.teacher_subjects (teacher_id, subject_id, school_id)
  VALUES (v_teacher_id, v_subject_id, v_school_id)
  ON CONFLICT (teacher_id, subject_id) DO NOTHING;

  -- -------------------------------------------------------------------------
  -- 7. PARENT ROW
  -- -------------------------------------------------------------------------
  INSERT INTO public.parents (id, school_id, username, name, surname, email, phone, address)
  VALUES (
    v_parent_id, v_school_id, 'parent',
    'Demo', 'Parent', 'parent@example.com',
    '123456789', 'Demo Address'
  )
  ON CONFLICT (id) DO NOTHING;

  -- -------------------------------------------------------------------------
  -- 8. CLASS  (requires grade + academic_year + school)
  -- -------------------------------------------------------------------------
  INSERT INTO public.classes (school_id, academic_year_id, name, capacity,
                               supervisor_id, grade_id)
  VALUES (v_school_id, v_year_id, '5A', 30, v_teacher_id, v_grade_id)
  ON CONFLICT (school_id, academic_year_id, name) DO NOTHING;

  SELECT id INTO v_class_id
  FROM   public.classes
  WHERE  school_id = v_school_id AND academic_year_id = v_year_id AND name = '5A';

  -- -------------------------------------------------------------------------
  -- 9. STUDENT ROW  (requires class_id)
  -- -------------------------------------------------------------------------
  INSERT INTO public.students (id, school_id, username, name, surname, email,
                                phone, address, sex, blood_type, birthday, class_id)
  VALUES (
    v_student_id, v_school_id, 'student',
    'Demo', 'Student', 'student@example.com',
    NULL, 'Demo Address', 'FEMALE', 'O-', '2015-01-01',
    v_class_id
  )
  ON CONFLICT (id) DO NOTHING;

  -- -------------------------------------------------------------------------
  -- 10. STUDENT ↔ PARENT LINK
  -- -------------------------------------------------------------------------
  INSERT INTO public.student_parents (student_id, parent_id, relationship, is_primary)
  VALUES (v_student_id, v_parent_id, 'parent', true)
  ON CONFLICT (student_id, parent_id) DO NOTHING;

  -- -------------------------------------------------------------------------
  -- 11. DEMO ANNOUNCEMENT
  -- -------------------------------------------------------------------------
  INSERT INTO public.announcements (school_id, title, description, date, class_id, created_by)
  VALUES (
    v_school_id,
    'Welcome to Demo School',
    'This is the demo school portal. Admin, teacher, student, and parent accounts are all set up and ready to explore.',
    CURRENT_DATE,
    NULL,
    v_admin_id
  );

  -- -------------------------------------------------------------------------
  -- 12. DEMO EVENT
  -- -------------------------------------------------------------------------
  INSERT INTO public.events (school_id, title, description, start_time, end_time, class_id, created_by)
  VALUES (
    v_school_id,
    'Open Day',
    'Annual open day for parents and prospective students.',
    now() + interval '7 days',
    now() + interval '7 days' + interval '3 hours',
    NULL,
    v_admin_id
  );

  RAISE NOTICE 'Seed complete. school_id=%, year_id=%, class_id=%',
    v_school_id, v_year_id, v_class_id;
END $$;
