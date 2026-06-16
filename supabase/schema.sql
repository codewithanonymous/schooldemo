-- =============================================================================
-- SCHOOL MANAGEMENT SAAS — PRODUCTION SCHEMA v3
-- =============================================================================
-- Source of truth. Run in Supabase SQL Editor in this order:
--   1. schema.sql          ← this file
--   2. rls_policies.sql
--   3. seed.sql            ← demo / initial data only
--
-- Compatibility notes:
--   • Supabase manages auth.* completely — we never touch auth.users directly.
--   • auth.users rows are created via the Supabase Dashboard or the
--     "create-user" Edge Function (supabase/functions/create-user/index.ts).
--   • The on_auth_user_created trigger populates public.profiles automatically.
--   • All public tables carry school_id for multi-tenant isolation.
--   • Role enum includes super_admin (platform), admin (school), teacher,
--     student, parent.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. EXTENSIONS
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- fast ILIKE on names

-- ---------------------------------------------------------------------------
-- 1. ENUM TYPES  (idempotent — safe to re-run)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM (
    'super_admin',
    'admin',
    'teacher',
    'student',
    'parent'
  );
EXCEPTION WHEN duplicate_object THEN
  -- Backfill super_admin if the enum was created before v3
  ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'super_admin' BEFORE 'admin';
END $$;

DO $$ BEGIN
  CREATE TYPE public.sex_type AS ENUM ('MALE', 'FEMALE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.day_of_week AS ENUM (
    'MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.blood_type AS ENUM (
    'A+','A-','B+','B-','AB+','AB-','O+','O-'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.fee_status AS ENUM (
    'pending','paid','partial','overdue','waived'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.fee_type AS ENUM (
    'tuition','exam','transport','library','sports','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 2. SCHOOLS  (platform-level, one row per tenant)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.schools (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  slug       text        NOT NULL UNIQUE,
  address    text,
  phone      text,
  email      text,
  logo_url   text,
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 3. ACADEMIC YEARS  (scoped per school)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.academic_years (
  id         serial      PRIMARY KEY,
  school_id  uuid        NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  label      text        NOT NULL,
  start_date date        NOT NULL,
  end_date   date        NOT NULL,
  is_current boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, label),
  CHECK (end_date > start_date)
);

-- Only one active year per school
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_current_year_per_school
  ON public.academic_years (school_id)
  WHERE is_current = true;

-- ---------------------------------------------------------------------------
-- 4. PROFILES  (auth bridge — one row per auth.users row)
--    NEVER insert here directly from the client; the trigger does it.
--    Admins promote/assign roles via set_user_profile() RPC.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id         uuid             PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      text,
  role       public.user_role NOT NULL DEFAULT 'student',
  school_id  uuid             REFERENCES public.schools(id) ON DELETE SET NULL,
  -- super_admin: school_id = NULL (platform-wide)
  -- all other roles MUST have school_id
  created_at timestamptz      NOT NULL DEFAULT now(),
  updated_at timestamptz      NOT NULL DEFAULT now(),
  CONSTRAINT profile_school_required CHECK (
    role = 'super_admin' OR school_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_profiles_school_id   ON public.profiles(school_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role        ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_school_role ON public.profiles(school_id, role);

-- ---------------------------------------------------------------------------
-- 5. HELPER FUNCTIONS  (SECURITY DEFINER — safe for RLS policies)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.my_school_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT school_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.my_role()
RETURNS public.user_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'teacher'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_super()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  );
$$;

-- Backward-compat alias used by some frontend code
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- 6. TENANT-SCOPED REFERENCE TABLES
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.grades (
  id         serial      PRIMARY KEY,
  school_id  uuid        NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  level      integer     NOT NULL CHECK (level > 0 AND level <= 13),
  label      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, level)
);

CREATE TABLE IF NOT EXISTS public.subjects (
  id         serial      PRIMARY KEY,
  school_id  uuid        NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name       text        NOT NULL,
  code       text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, name)
);

-- ---------------------------------------------------------------------------
-- 7. PEOPLE TABLES  (all tenant-scoped via school_id)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.teachers (
  id         uuid              PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  school_id  uuid              NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  username   text              NOT NULL,
  name       text              NOT NULL,
  surname    text              NOT NULL,
  email      text,
  phone      text,
  address    text,
  img        text,
  blood_type public.blood_type,
  sex        public.sex_type   NOT NULL DEFAULT 'MALE',
  birthday   date,
  created_at timestamptz       NOT NULL DEFAULT now(),
  UNIQUE (school_id, username),
  UNIQUE (school_id, email)
);

CREATE TABLE IF NOT EXISTS public.parents (
  id         uuid        PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  school_id  uuid        NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  username   text        NOT NULL,
  name       text        NOT NULL,
  surname    text        NOT NULL,
  email      text,
  phone      text        NOT NULL DEFAULT '',
  address    text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, username)
);

CREATE TABLE IF NOT EXISTS public.classes (
  id               serial      PRIMARY KEY,
  school_id        uuid        NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year_id integer     NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
  name             text        NOT NULL,
  capacity         integer     NOT NULL CHECK (capacity > 0),
  supervisor_id    uuid        REFERENCES public.teachers(id) ON DELETE SET NULL,
  grade_id         integer     NOT NULL REFERENCES public.grades(id) ON DELETE RESTRICT,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, academic_year_id, name)
);

-- grade_id removed from students — derived via students.class_id → classes.grade_id (3NF)
CREATE TABLE IF NOT EXISTS public.students (
  id         uuid              PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  school_id  uuid              NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  username   text              NOT NULL,
  name       text              NOT NULL,
  surname    text              NOT NULL,
  email      text,
  phone      text,
  address    text,
  img        text,
  blood_type public.blood_type,
  sex        public.sex_type   NOT NULL DEFAULT 'MALE',
  birthday   date,
  class_id   integer           NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  created_at timestamptz       NOT NULL DEFAULT now(),
  UNIQUE (school_id, username)
);

-- Many-to-many: student ↔ parent
CREATE TABLE IF NOT EXISTS public.student_parents (
  student_id   uuid    NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  parent_id    uuid    NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  relationship text    NOT NULL DEFAULT 'parent',
  is_primary   boolean NOT NULL DEFAULT false,
  PRIMARY KEY (student_id, parent_id)
);

-- ---------------------------------------------------------------------------
-- 8. CURRICULUM TABLES
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.teacher_subjects (
  teacher_id uuid    NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  subject_id integer NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  school_id  uuid    NOT NULL REFERENCES public.schools(id)  ON DELETE CASCADE,
  PRIMARY KEY (teacher_id, subject_id)
);

CREATE TABLE IF NOT EXISTS public.lessons (
  id               serial           PRIMARY KEY,
  school_id        uuid             NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year_id integer          NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
  name             text             NOT NULL,
  day              public.day_of_week NOT NULL,
  start_time       time             NOT NULL,
  end_time         time             NOT NULL,
  subject_id       integer          NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
  class_id         integer          NOT NULL REFERENCES public.classes(id)  ON DELETE CASCADE,
  teacher_id       uuid             NOT NULL REFERENCES public.teachers(id) ON DELETE RESTRICT,
  created_at       timestamptz      NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

CREATE TABLE IF NOT EXISTS public.exams (
  id               serial      PRIMARY KEY,
  school_id        uuid        NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year_id integer     NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
  title            text        NOT NULL,
  start_time       timestamptz NOT NULL,
  end_time         timestamptz NOT NULL,
  max_score        numeric(5,2) NOT NULL DEFAULT 100 CHECK (max_score > 0),
  lesson_id        integer     NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

CREATE TABLE IF NOT EXISTS public.assignments (
  id         serial       PRIMARY KEY,
  school_id  uuid         NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  title      text         NOT NULL,
  start_date date         NOT NULL,
  due_date   date         NOT NULL,
  max_score  numeric(5,2) NOT NULL DEFAULT 100 CHECK (max_score > 0),
  lesson_id  integer      NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  created_at timestamptz  NOT NULL DEFAULT now(),
  CHECK (due_date >= start_date)
);

CREATE TABLE IF NOT EXISTS public.results (
  id            serial       PRIMARY KEY,
  school_id     uuid         NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  score         numeric(5,2) NOT NULL CHECK (score >= 0),
  student_id    uuid         NOT NULL REFERENCES public.students(id)    ON DELETE CASCADE,
  exam_id       integer      REFERENCES public.exams(id)                ON DELETE CASCADE,
  assignment_id integer      REFERENCES public.assignments(id)          ON DELETE CASCADE,
  graded_by     uuid         REFERENCES public.teachers(id)             ON DELETE SET NULL,
  remarks       text,
  created_at    timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT result_source_check CHECK (
    (exam_id IS NOT NULL AND assignment_id IS NULL) OR
    (exam_id IS NULL     AND assignment_id IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.attendance (
  id         serial      PRIMARY KEY,
  school_id  uuid        NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  date       date        NOT NULL,
  present    boolean     NOT NULL DEFAULT false,
  remarks    text,
  student_id uuid        NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  lesson_id  integer     NOT NULL REFERENCES public.lessons(id)  ON DELETE CASCADE,
  marked_by  uuid        REFERENCES public.teachers(id)          ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, lesson_id, date)
);

-- ---------------------------------------------------------------------------
-- 9. FEES MODULE
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.fee_templates (
  id               serial          PRIMARY KEY,
  school_id        uuid            NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year_id integer         NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
  title            text            NOT NULL,
  fee_type         public.fee_type NOT NULL DEFAULT 'tuition',
  amount           numeric(10,2)   NOT NULL CHECK (amount > 0),
  due_date         date            NOT NULL,
  description      text,
  created_at       timestamptz     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fees (
  id              serial            PRIMARY KEY,
  school_id       uuid              NOT NULL REFERENCES public.schools(id)        ON DELETE CASCADE,
  student_id      uuid              NOT NULL REFERENCES public.students(id)       ON DELETE CASCADE,
  fee_template_id integer           NOT NULL REFERENCES public.fee_templates(id)  ON DELETE RESTRICT,
  amount_due      numeric(10,2)     NOT NULL CHECK (amount_due > 0),
  amount_paid     numeric(10,2)     NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  status          public.fee_status NOT NULL DEFAULT 'pending',
  due_date        date              NOT NULL,
  paid_at         timestamptz,
  payment_ref     text,
  notes           text,
  created_at      timestamptz       NOT NULL DEFAULT now(),
  updated_at      timestamptz       NOT NULL DEFAULT now(),
  UNIQUE (student_id, fee_template_id)
);

-- ---------------------------------------------------------------------------
-- 10. COMMUNICATION TABLES
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.events (
  id          serial      PRIMARY KEY,
  school_id   uuid        NOT NULL REFERENCES public.schools(id)   ON DELETE CASCADE,
  title       text        NOT NULL,
  description text,
  start_time  timestamptz NOT NULL,
  end_time    timestamptz NOT NULL,
  class_id    integer     REFERENCES public.classes(id)            ON DELETE SET NULL,
  created_by  uuid        REFERENCES public.profiles(id)           ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

CREATE TABLE IF NOT EXISTS public.announcements (
  id          serial      PRIMARY KEY,
  school_id   uuid        NOT NULL REFERENCES public.schools(id)   ON DELETE CASCADE,
  title       text        NOT NULL,
  description text        NOT NULL,
  date        date        NOT NULL DEFAULT CURRENT_DATE,
  class_id    integer     REFERENCES public.classes(id)            ON DELETE SET NULL,
  created_by  uuid        REFERENCES public.profiles(id)           ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 11. INDEXES
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_academic_years_school     ON public.academic_years(school_id);
CREATE INDEX IF NOT EXISTS idx_teachers_school           ON public.teachers(school_id);
CREATE INDEX IF NOT EXISTS idx_parents_school            ON public.parents(school_id);
CREATE INDEX IF NOT EXISTS idx_students_school           ON public.students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_class            ON public.students(class_id);
CREATE INDEX IF NOT EXISTS idx_student_parents_student   ON public.student_parents(student_id);
CREATE INDEX IF NOT EXISTS idx_student_parents_parent    ON public.student_parents(parent_id);
CREATE INDEX IF NOT EXISTS idx_classes_school_year       ON public.classes(school_id, academic_year_id);
CREATE INDEX IF NOT EXISTS idx_grades_school             ON public.grades(school_id);
CREATE INDEX IF NOT EXISTS idx_subjects_school           ON public.subjects(school_id);
CREATE INDEX IF NOT EXISTS idx_teacher_subjects_teacher  ON public.teacher_subjects(teacher_id);
CREATE INDEX IF NOT EXISTS idx_lessons_school            ON public.lessons(school_id);
CREATE INDEX IF NOT EXISTS idx_lessons_teacher           ON public.lessons(teacher_id);
CREATE INDEX IF NOT EXISTS idx_lessons_class             ON public.lessons(class_id);
CREATE INDEX IF NOT EXISTS idx_exams_school              ON public.exams(school_id);
CREATE INDEX IF NOT EXISTS idx_exams_lesson              ON public.exams(lesson_id);
CREATE INDEX IF NOT EXISTS idx_assignments_school        ON public.assignments(school_id);
CREATE INDEX IF NOT EXISTS idx_assignments_lesson        ON public.assignments(lesson_id);
CREATE INDEX IF NOT EXISTS idx_results_student           ON public.results(student_id);
CREATE INDEX IF NOT EXISTS idx_results_school            ON public.results(school_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student        ON public.attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_lesson         ON public.attendance(lesson_id);
CREATE INDEX IF NOT EXISTS idx_attendance_school_date    ON public.attendance(school_id, date);
CREATE INDEX IF NOT EXISTS idx_fees_student              ON public.fees(student_id);
CREATE INDEX IF NOT EXISTS idx_fees_school               ON public.fees(school_id);
CREATE INDEX IF NOT EXISTS idx_fees_status               ON public.fees(status);
CREATE INDEX IF NOT EXISTS idx_fee_templates_school      ON public.fee_templates(school_id);
CREATE INDEX IF NOT EXISTS idx_events_school             ON public.events(school_id);
CREATE INDEX IF NOT EXISTS idx_events_class              ON public.events(class_id);
CREATE INDEX IF NOT EXISTS idx_announcements_school      ON public.announcements(school_id);
CREATE INDEX IF NOT EXISTS idx_announcements_class       ON public.announcements(class_id);

-- Full-text trigram search on names
CREATE INDEX IF NOT EXISTS idx_teachers_name_trgm ON public.teachers USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_students_name_trgm ON public.students USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_parents_name_trgm  ON public.parents  USING gin(name gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- 12. UPDATED_AT TRIGGER
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DO $$ BEGIN
  CREATE TRIGGER trg_schools_updated_at
    BEFORE UPDATE ON public.schools
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_fees_updated_at
    BEFORE UPDATE ON public.fees
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 13. AUTH TRIGGER  (populates profiles on every new Supabase Auth sign-up)
-- ---------------------------------------------------------------------------
-- New users always start as role='student', school_id=NULL.
-- An admin or super_admin must call set_user_profile() to assign the correct
-- role and school after the auth user has been created.
-- This design prevents any client-side role escalation.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, school_id)
  VALUES (
    NEW.id,
    NEW.email,
    'student',   -- safe default; promoted by admin via set_user_profile()
    NULL
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 14. ROW LEVEL SECURITY — enable on ALL tables
-- ---------------------------------------------------------------------------
ALTER TABLE public.schools          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parents          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_parents  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_templates    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fees             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements    ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 15. GRANTS  (least-privilege; RLS enforces which rows)
-- ---------------------------------------------------------------------------
GRANT SELECT                              ON public.schools           TO authenticated;
GRANT SELECT, INSERT, UPDATE             ON public.academic_years    TO authenticated;
GRANT SELECT, UPDATE                     ON public.profiles          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE     ON public.grades            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE     ON public.subjects          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE     ON public.teachers          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE     ON public.parents           TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE     ON public.classes           TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE     ON public.students          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE     ON public.student_parents   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE     ON public.teacher_subjects  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE     ON public.lessons           TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE     ON public.exams             TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE     ON public.assignments       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE     ON public.results           TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE     ON public.attendance        TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE     ON public.fee_templates     TO authenticated;
GRANT SELECT                             ON public.fees              TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE     ON public.events            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE     ON public.announcements     TO authenticated;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
