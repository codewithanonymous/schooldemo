/**
 * Migration script v2 — handles existing DB state gracefully
 * Runs each SQL block in a transaction with explicit error handling.
 */
import pg from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const { Client } = pg
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

const DB_URL = 'postgresql://postgres.rgcevwcnzptwmxmqindg:srV7-UukaAVv+6C@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres'

function readSQL(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8')
}

async function exec(client, sql, label) {
  try {
    await client.query(sql)
    console.log(`  ✓ ${label}`)
  } catch (e) {
    console.error(`  ✗ ${label}: ${e.message}`)
    throw e
  }
}

async function execSafe(client, sql, label) {
  // Same as exec but swallows errors (used for optional operations)
  try {
    await client.query(sql)
    console.log(`  ✓ ${label}`)
  } catch (e) {
    console.warn(`  ~ ${label} (skipped): ${e.message.split('\n')[0]}`)
  }
}

async function main() {
  const client = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } })
  await client.connect()
  console.log('✓ Connected to Supabase PostgreSQL\n')

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 0 — Extensions + Enums (idempotent)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('=== PHASE 0: Extensions & Enums ===')

  await execSafe(client, `CREATE EXTENSION IF NOT EXISTS "pgcrypto"`, 'pgcrypto extension')
  await execSafe(client, `CREATE EXTENSION IF NOT EXISTS "pg_trgm"`, 'pg_trgm extension')

  // Add super_admin to existing user_role enum if it exists
  const enumCheck = await client.query(`SELECT typname FROM pg_type WHERE typname='user_role'`)
  if (enumCheck.rows.length > 0) {
    await execSafe(client,
      `ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'super_admin' BEFORE 'admin'`,
      'add super_admin to user_role enum'
    )
  } else {
    await exec(client, `
      CREATE TYPE public.user_role AS ENUM ('super_admin','admin','teacher','student','parent')
    `, 'create user_role enum')
  }

  // Other enums
  for (const [name, vals] of [
    ['sex_type', "'MALE','FEMALE'"],
    ['day_of_week', "'MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'"],
    ['blood_type', "'A+','A-','B+','B-','AB+','AB-','O+','O-'"],
    ['fee_status', "'pending','paid','partial','overdue','waived'"],
    ['fee_type', "'tuition','exam','transport','library','sports','other'"],
  ]) {
    await execSafe(client, `CREATE TYPE public.${name} AS ENUM (${vals})`, `create ${name} enum`)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 1 — Core platform tables
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n=== PHASE 1: Platform Tables ===')

  await exec(client, `
    CREATE TABLE IF NOT EXISTS public.schools (
      id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name       text NOT NULL,
      slug       text NOT NULL UNIQUE,
      address    text,
      phone      text,
      email      text,
      logo_url   text,
      is_active  boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `, 'CREATE TABLE schools')

  await exec(client, `
    CREATE TABLE IF NOT EXISTS public.academic_years (
      id           serial PRIMARY KEY,
      school_id    uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
      label        text NOT NULL,
      start_date   date NOT NULL,
      end_date     date NOT NULL,
      is_current   boolean NOT NULL DEFAULT false,
      created_at   timestamptz NOT NULL DEFAULT now(),
      UNIQUE (school_id, label),
      CHECK (end_date > start_date)
    )
  `, 'CREATE TABLE academic_years')

  await execSafe(client, `
    CREATE UNIQUE INDEX idx_one_current_year_per_school
    ON public.academic_years (school_id) WHERE is_current = true
  `, 'CREATE UNIQUE INDEX idx_one_current_year_per_school')

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 2 — Alter profiles to add school_id (existing table)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n=== PHASE 2: Alter profiles ===')

  // Check if school_id already exists
  const profileCols = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles'
  `)
  const existingCols = profileCols.rows.map(r => r.column_name)

  if (!existingCols.includes('school_id')) {
    await exec(client, `
      ALTER TABLE public.profiles
      ADD COLUMN school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL
    `, 'ADD COLUMN profiles.school_id')
  } else {
    console.log('  ~ profiles.school_id already exists — skipping')
  }

  if (!existingCols.includes('updated_at')) {
    await exec(client, `
      ALTER TABLE public.profiles ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now()
    `, 'ADD COLUMN profiles.updated_at')
  }

  // Drop old role column and recreate with new enum type
  // First check if old 'role' column is text type
  const roleColType = await client.query(`
    SELECT data_type, udt_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='role'
  `)
  if (roleColType.rows.length > 0 && roleColType.rows[0].udt_name !== 'user_role') {
    console.log('  ~ Migrating profiles.role from text to user_role enum...')`n    await exec(client, `ALTER TABLE public.profiles ALTER COLUMN role DROP DEFAULT`, 'DROP DEFAULT profiles.role')
    await exec(client, `
      ALTER TABLE public.profiles
        ALTER COLUMN role TYPE public.user_role
        USING CASE
          WHEN role = 'admin'       THEN 'admin'::public.user_role
          WHEN role = 'teacher'     THEN 'teacher'::public.user_role
          WHEN role = 'student'     THEN 'student'::public.user_role
          WHEN role = 'parent'      THEN 'parent'::public.user_role
          WHEN role = 'super_admin' THEN 'super_admin'::public.user_role
          ELSE 'student'::public.user_role
        END
    `, 'ALTER COLUMN profiles.role to enum')

    await exec(client, `
      ALTER TABLE public.profiles
        ALTER COLUMN role SET DEFAULT 'student'::public.user_role
    `, 'SET DEFAULT profiles.role')
  } else {
    console.log('  ~ profiles.role already correct type — skipping')
  }

  // Add constraint (drop first if exists)
  await execSafe(client, `
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profile_school_required
  `, 'DROP old profile_school_required constraint')

  // Note: we allow NULL school_id during migration — add constraint after data migration
  await exec(client, `ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY`, 'ENABLE RLS profiles')

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 3 — Seed school + academic year before migrating data
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n=== PHASE 3: Seed School ===')

  const schoolRes = await client.query(`
    INSERT INTO public.schools (name, slug, email)
    VALUES ('SchoolCMS', 'schoolcms', 'admin@schoolcms.app')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id, name
  `)
  const school = schoolRes.rows[0]
  console.log(`  ✓ School: ${school.name} | id: ${school.id}`)

  const yearRes = await client.query(`
    INSERT INTO public.academic_years (school_id, label, start_date, end_date, is_current)
    VALUES ($1, '2024-2025', '2024-09-01', '2025-07-31', true)
    ON CONFLICT (school_id, label) DO UPDATE SET is_current = true
    RETURNING id, label
  `, [school.id])
  const year = yearRes.rows[0]
  console.log(`  ✓ Academic Year: ${year.label} | id: ${year.id}`)

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 4 — New tenant tables (idempotent CREATE IF NOT EXISTS)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n=== PHASE 4: New Tables ===')

  await exec(client, `
    CREATE TABLE IF NOT EXISTS public.grades (
      id         serial PRIMARY KEY,
      school_id  uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
      level      integer NOT NULL CHECK (level > 0 AND level <= 13),
      label      text,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (school_id, level)
    )
  `, 'CREATE TABLE grades')

  await exec(client, `
    CREATE TABLE IF NOT EXISTS public.subjects (
      id         serial PRIMARY KEY,
      school_id  uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
      name       text NOT NULL,
      code       text,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (school_id, name)
    )
  `, 'CREATE TABLE subjects')

  await exec(client, `
    CREATE TABLE IF NOT EXISTS public.teachers (
      id          uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
      school_id   uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
      username    text NOT NULL,
      name        text NOT NULL,
      surname     text NOT NULL,
      email       text,
      phone       text,
      address     text,
      img         text,
      blood_type  public.blood_type,
      sex         public.sex_type NOT NULL DEFAULT 'MALE',
      birthday    date,
      created_at  timestamptz NOT NULL DEFAULT now(),
      UNIQUE (school_id, username)
    )
  `, 'CREATE TABLE teachers')

  await exec(client, `
    CREATE TABLE IF NOT EXISTS public.parents (
      id          uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
      school_id   uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
      username    text NOT NULL,
      name        text NOT NULL,
      surname     text NOT NULL,
      email       text,
      phone       text NOT NULL,
      address     text,
      created_at  timestamptz NOT NULL DEFAULT now(),
      UNIQUE (school_id, username)
    )
  `, 'CREATE TABLE parents')

  await exec(client, `
    CREATE TABLE IF NOT EXISTS public.classes (
      id               serial PRIMARY KEY,
      school_id        uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
      academic_year_id integer NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
      name             text NOT NULL,
      capacity         integer NOT NULL CHECK (capacity > 0),
      supervisor_id    uuid REFERENCES public.teachers(id) ON DELETE SET NULL,
      grade_id         integer NOT NULL REFERENCES public.grades(id) ON DELETE RESTRICT,
      created_at       timestamptz NOT NULL DEFAULT now(),
      UNIQUE (school_id, academic_year_id, name)
    )
  `, 'CREATE TABLE classes')

  await exec(client, `
    CREATE TABLE IF NOT EXISTS public.students (
      id          uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
      school_id   uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
      username    text NOT NULL,
      name        text NOT NULL,
      surname     text NOT NULL,
      email       text,
      phone       text,
      address     text,
      img         text,
      blood_type  public.blood_type,
      sex         public.sex_type NOT NULL DEFAULT 'MALE',
      birthday    date,
      class_id    integer NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
      created_at  timestamptz NOT NULL DEFAULT now(),
      UNIQUE (school_id, username)
    )
  `, 'CREATE TABLE students')

  await exec(client, `
    CREATE TABLE IF NOT EXISTS public.student_parents (
      student_id   uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
      parent_id    uuid NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
      relationship text NOT NULL DEFAULT 'parent',
      is_primary   boolean NOT NULL DEFAULT false,
      PRIMARY KEY (student_id, parent_id)
    )
  `, 'CREATE TABLE student_parents')

  await exec(client, `
    CREATE TABLE IF NOT EXISTS public.teacher_subjects (
      teacher_id   uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
      subject_id   integer NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
      school_id    uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
      PRIMARY KEY (teacher_id, subject_id)
    )
  `, 'CREATE TABLE teacher_subjects')

  await exec(client, `
    CREATE TABLE IF NOT EXISTS public.lessons (
      id               serial PRIMARY KEY,
      school_id        uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
      academic_year_id integer NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
      name             text NOT NULL,
      day              public.day_of_week NOT NULL,
      start_time       time NOT NULL,
      end_time         time NOT NULL,
      subject_id       integer NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
      class_id         integer NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
      teacher_id       uuid NOT NULL REFERENCES public.teachers(id) ON DELETE RESTRICT,
      created_at       timestamptz NOT NULL DEFAULT now(),
      CHECK (end_time > start_time)
    )
  `, 'CREATE TABLE lessons')

  await exec(client, `
    CREATE TABLE IF NOT EXISTS public.exams (
      id               serial PRIMARY KEY,
      school_id        uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
      academic_year_id integer NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
      title            text NOT NULL,
      start_time       timestamptz NOT NULL,
      end_time         timestamptz NOT NULL,
      max_score        numeric(5,2) NOT NULL DEFAULT 100,
      lesson_id        integer NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
      created_at       timestamptz NOT NULL DEFAULT now(),
      CHECK (end_time > start_time)
    )
  `, 'CREATE TABLE exams')

  await exec(client, `
    CREATE TABLE IF NOT EXISTS public.assignments (
      id          serial PRIMARY KEY,
      school_id   uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
      title       text NOT NULL,
      start_date  date NOT NULL,
      due_date    date NOT NULL,
      max_score   numeric(5,2) NOT NULL DEFAULT 100,
      lesson_id   integer NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
      created_at  timestamptz NOT NULL DEFAULT now(),
      CHECK (due_date >= start_date)
    )
  `, 'CREATE TABLE assignments')

  await exec(client, `
    CREATE TABLE IF NOT EXISTS public.results (
      id            serial PRIMARY KEY,
      school_id     uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
      score         numeric(5,2) NOT NULL CHECK (score >= 0),
      student_id    uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
      exam_id       integer REFERENCES public.exams(id) ON DELETE CASCADE,
      assignment_id integer REFERENCES public.assignments(id) ON DELETE CASCADE,
      graded_by     uuid REFERENCES public.teachers(id) ON DELETE SET NULL,
      remarks       text,
      created_at    timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT result_source_check CHECK (
        (exam_id IS NOT NULL AND assignment_id IS NULL) OR
        (exam_id IS NULL AND assignment_id IS NOT NULL)
      )
    )
  `, 'CREATE TABLE results')

  await exec(client, `
    CREATE TABLE IF NOT EXISTS public.attendance (
      id          serial PRIMARY KEY,
      school_id   uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
      date        date NOT NULL,
      present     boolean NOT NULL DEFAULT false,
      remarks     text,
      student_id  uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
      lesson_id   integer NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
      marked_by   uuid REFERENCES public.teachers(id) ON DELETE SET NULL,
      created_at  timestamptz NOT NULL DEFAULT now(),
      UNIQUE (student_id, lesson_id, date)
    )
  `, 'CREATE TABLE attendance')

  await exec(client, `
    CREATE TABLE IF NOT EXISTS public.fee_templates (
      id               serial PRIMARY KEY,
      school_id        uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
      academic_year_id integer NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
      title            text NOT NULL,
      fee_type         public.fee_type NOT NULL DEFAULT 'tuition',
      amount           numeric(10,2) NOT NULL CHECK (amount > 0),
      due_date         date NOT NULL,
      description      text,
      created_at       timestamptz NOT NULL DEFAULT now()
    )
  `, 'CREATE TABLE fee_templates')

  await exec(client, `
    CREATE TABLE IF NOT EXISTS public.fees (
      id              serial PRIMARY KEY,
      school_id       uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
      student_id      uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
      fee_template_id integer NOT NULL REFERENCES public.fee_templates(id) ON DELETE RESTRICT,
      amount_due      numeric(10,2) NOT NULL CHECK (amount_due > 0),
      amount_paid     numeric(10,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
      status          public.fee_status NOT NULL DEFAULT 'pending',
      due_date        date NOT NULL,
      paid_at         timestamptz,
      payment_ref     text,
      notes           text,
      created_at      timestamptz NOT NULL DEFAULT now(),
      updated_at      timestamptz NOT NULL DEFAULT now(),
      UNIQUE (student_id, fee_template_id)
    )
  `, 'CREATE TABLE fees')

  await exec(client, `
    CREATE TABLE IF NOT EXISTS public.events (
      id          serial PRIMARY KEY,
      school_id   uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
      title       text NOT NULL,
      description text,
      start_time  timestamptz NOT NULL,
      end_time    timestamptz NOT NULL,
      class_id    integer REFERENCES public.classes(id) ON DELETE SET NULL,
      created_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
      created_at  timestamptz NOT NULL DEFAULT now(),
      CHECK (end_time > start_time)
    )
  `, 'CREATE TABLE events')

  await exec(client, `
    CREATE TABLE IF NOT EXISTS public.announcements (
      id          serial PRIMARY KEY,
      school_id   uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
      title       text NOT NULL,
      description text NOT NULL,
      date        date NOT NULL DEFAULT CURRENT_DATE,
      class_id    integer REFERENCES public.classes(id) ON DELETE SET NULL,
      created_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
      created_at  timestamptz NOT NULL DEFAULT now()
    )
  `, 'CREATE TABLE announcements')

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 5 — Indexes
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n=== PHASE 5: Indexes ===')

  const indexes = [
    ['idx_profiles_school_role',     'public.profiles(school_id, role)'],
    ['idx_teachers_school',          'public.teachers(school_id)'],
    ['idx_parents_school',           'public.parents(school_id)'],
    ['idx_students_school',          'public.students(school_id)'],
    ['idx_students_class',           'public.students(class_id)'],
    ['idx_student_parents_student',  'public.student_parents(student_id)'],
    ['idx_student_parents_parent',   'public.student_parents(parent_id)'],
    ['idx_classes_school_year',      'public.classes(school_id, academic_year_id)'],
    ['idx_grades_school',            'public.grades(school_id)'],
    ['idx_subjects_school',          'public.subjects(school_id)'],
    ['idx_teacher_subjects_teacher', 'public.teacher_subjects(teacher_id)'],
    ['idx_lessons_school',           'public.lessons(school_id)'],
    ['idx_lessons_teacher',          'public.lessons(teacher_id)'],
    ['idx_lessons_class',            'public.lessons(class_id)'],
    ['idx_exams_school',             'public.exams(school_id)'],
    ['idx_exams_lesson',             'public.exams(lesson_id)'],
    ['idx_assignments_school',       'public.assignments(school_id)'],
    ['idx_assignments_lesson',       'public.assignments(lesson_id)'],
    ['idx_results_student',          'public.results(student_id)'],
    ['idx_results_school',           'public.results(school_id)'],
    ['idx_attendance_student',       'public.attendance(student_id)'],
    ['idx_attendance_lesson',        'public.attendance(lesson_id)'],
    ['idx_attendance_school_date',   'public.attendance(school_id, date)'],
    ['idx_fees_student',             'public.fees(student_id)'],
    ['idx_fees_school',              'public.fees(school_id)'],
    ['idx_fee_templates_school',     'public.fee_templates(school_id)'],
    ['idx_events_school',            'public.events(school_id)'],
    ['idx_announcements_school',     'public.announcements(school_id)'],
  ]

  for (const [name, cols] of indexes) {
    await execSafe(client, `CREATE INDEX IF NOT EXISTS ${name} ON ${cols}`, `INDEX ${name}`)
  }

  // GIN indexes need pg_trgm — try but skip if extension missing
  await execSafe(client,
    `CREATE INDEX IF NOT EXISTS idx_teachers_name_trgm ON public.teachers USING gin(name gin_trgm_ops)`,
    'GIN INDEX teachers.name'
  )
  await execSafe(client,
    `CREATE INDEX IF NOT EXISTS idx_students_name_trgm ON public.students USING gin(name gin_trgm_ops)`,
    'GIN INDEX students.name'
  )

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 6 — Helper functions + trigger
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n=== PHASE 6: Functions & Trigger ===')

  await exec(client, `
    CREATE OR REPLACE FUNCTION public.set_updated_at()
    RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN NEW.updated_at = now(); RETURN NEW; END;
    $$
  `, 'FUNCTION set_updated_at')

  await exec(client, `
    CREATE OR REPLACE FUNCTION public.my_school_id()
    RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
    AS $$ SELECT school_id FROM public.profiles WHERE id = auth.uid(); $$
  `, 'FUNCTION my_school_id')

  await exec(client, `
    CREATE OR REPLACE FUNCTION public.my_role()
    RETURNS public.user_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
    AS $$ SELECT role FROM public.profiles WHERE id = auth.uid(); $$
  `, 'FUNCTION my_role')

  await exec(client, `
    CREATE OR REPLACE FUNCTION public.is_super_admin()
    RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
    AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'); $$
  `, 'FUNCTION is_super_admin')

  await exec(client, `
    CREATE OR REPLACE FUNCTION public.is_admin()
    RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
    AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'); $$
  `, 'FUNCTION is_admin')

  await exec(client, `
    CREATE OR REPLACE FUNCTION public.is_teacher()
    RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
    AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher'); $$
  `, 'FUNCTION is_teacher')

  await exec(client, `
    CREATE OR REPLACE FUNCTION public.is_admin_or_super()
    RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
    AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin')); $$
  `, 'FUNCTION is_admin_or_super')

  await exec(client, `
    CREATE OR REPLACE FUNCTION public.current_user_role()
    RETURNS public.user_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
    AS $$ SELECT role FROM public.profiles WHERE id = auth.uid(); $$
  `, 'FUNCTION current_user_role (compat alias)')

  await exec(client, `
    CREATE OR REPLACE FUNCTION public.set_user_profile(
      p_user_id   uuid,
      p_email     text,
      p_role      public.user_role,
      p_school_id uuid,
      p_name      text,
      p_surname   text,
      p_username  text
    )
    RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
    AS $$
    DECLARE
      v_caller_role      public.user_role;
      v_caller_school_id uuid;
    BEGIN
      SELECT role, school_id INTO v_caller_role, v_caller_school_id
      FROM public.profiles WHERE id = auth.uid();

      IF v_caller_role = 'super_admin' THEN NULL;
      ELSIF v_caller_role = 'admin' THEN
        IF v_caller_school_id IS DISTINCT FROM p_school_id THEN
          RAISE EXCEPTION 'Permission denied: you can only create users in your own school' USING ERRCODE = '42501';
        END IF;
      ELSE
        RAISE EXCEPTION 'Permission denied: only admin or super_admin can create users (role=%)' , v_caller_role USING ERRCODE = '42501';
      END IF;

      IF p_role = 'super_admin' AND v_caller_role != 'super_admin' THEN
        RAISE EXCEPTION 'Permission denied: only super_admin can create super_admin accounts' USING ERRCODE = '42501';
      END IF;

      INSERT INTO public.profiles (id, email, role, school_id)
      VALUES (p_user_id, p_email, p_role, p_school_id)
      ON CONFLICT (id) DO UPDATE
        SET role = EXCLUDED.role, school_id = EXCLUDED.school_id,
            email = EXCLUDED.email, updated_at = now();

      CASE p_role
        WHEN 'teacher' THEN
          INSERT INTO public.teachers (id, school_id, username, name, surname, email)
          VALUES (p_user_id, p_school_id, p_username, p_name, p_surname, p_email)
          ON CONFLICT (id) DO UPDATE
            SET name = EXCLUDED.name, surname = EXCLUDED.surname,
                email = EXCLUDED.email, username = EXCLUDED.username;
        WHEN 'parent' THEN
          INSERT INTO public.parents (id, school_id, username, name, surname, email, phone)
          VALUES (p_user_id, p_school_id, p_username, p_name, p_surname, p_email, '')
          ON CONFLICT (id) DO UPDATE
            SET name = EXCLUDED.name, surname = EXCLUDED.surname,
                email = EXCLUDED.email, username = EXCLUDED.username;
        ELSE NULL;
      END CASE;

      RETURN jsonb_build_object('user_id', p_user_id, 'role', p_role);
    END;
    $$
  `, 'FUNCTION set_user_profile')

  await exec(client, `
    CREATE OR REPLACE FUNCTION public.promote_user(
      p_user_id   uuid,
      p_new_role  public.user_role,
      p_school_id uuid DEFAULT NULL
    )
    RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
    AS $$
    DECLARE v_caller_role public.user_role; v_caller_school_id uuid;
    BEGIN
      SELECT role, school_id INTO v_caller_role, v_caller_school_id
      FROM public.profiles WHERE id = auth.uid();
      IF v_caller_role = 'admin' THEN
        IF v_caller_school_id IS DISTINCT FROM COALESCE(p_school_id, v_caller_school_id) THEN
          RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501';
        END IF;
        IF p_new_role = 'super_admin' THEN
          RAISE EXCEPTION 'admin cannot promote to super_admin' USING ERRCODE = '42501';
        END IF;
      ELSIF v_caller_role != 'super_admin' THEN
        RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501';
      END IF;
      UPDATE public.profiles
      SET role = p_new_role, school_id = COALESCE(p_school_id, school_id), updated_at = now()
      WHERE id = p_user_id;
      RETURN jsonb_build_object('user_id', p_user_id, 'new_role', p_new_role);
    END;
    $$
  `, 'FUNCTION promote_user')

  await exec(client, `
    CREATE OR REPLACE FUNCTION public.bootstrap_school_admin(
      p_user_id   uuid,
      p_school_id uuid
    )
    RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
    AS $$
    DECLARE v_admin_count integer;
    BEGIN
      IF NOT public.is_super_admin() THEN
        SELECT COUNT(*) INTO v_admin_count
        FROM public.profiles WHERE school_id = p_school_id AND role = 'admin';
        IF v_admin_count > 0 THEN
          RAISE EXCEPTION 'School already has an admin.' USING ERRCODE = '42501';
        END IF;
      END IF;
      UPDATE public.profiles
      SET role = 'admin', school_id = p_school_id, updated_at = now()
      WHERE id = p_user_id;
      RETURN jsonb_build_object('bootstrapped', true, 'user_id', p_user_id);
    END;
    $$
  `, 'FUNCTION bootstrap_school_admin')

  await exec(client, `
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
    AS $$
    BEGIN
      INSERT INTO public.profiles (id, email, role, school_id)
      VALUES (NEW.id, NEW.email, 'student', NULL)
      ON CONFLICT (id) DO NOTHING;
      RETURN NEW;
    END;
    $$
  `, 'FUNCTION handle_new_user (updated)')

  await exec(client, `
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users
  `, 'DROP old trigger')

  await exec(client, `
    CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user()
  `, 'CREATE TRIGGER on_auth_user_created')

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 7 — Enable RLS on all new tables
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n=== PHASE 7: Enable RLS ===')

  const rlsTables = [
    'schools','academic_years','profiles','grades','subjects',
    'teachers','parents','classes','students','student_parents',
    'teacher_subjects','lessons','exams','assignments','results',
    'attendance','fee_templates','fees','events','announcements'
  ]
  for (const t of rlsTables) {
    await execSafe(client, `ALTER TABLE public.${t} ENABLE ROW LEVEL SECURITY`, `RLS ON ${t}`)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 8 — Data migration from old tables
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n=== PHASE 8: Migrate Old Data ===')

  // Check which old tables exist
  const oldTablesRes = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('Grade','Subject','Teacher','Parent','Class','Student',
                         '_SubjectToTeacher','Lesson','Exam','Assignment','Result',
                         'Attendance','Event','Announcement')
  `)
  const oldTables = oldTablesRes.rows.map(r => r.table_name)
  console.log(`  Old tables found: ${oldTables.join(', ') || 'none'}`)

  if (oldTables.includes('Grade')) {
    await execSafe(client, `
      INSERT INTO public.grades (id, school_id, level, label)
      SELECT id, '${school.id}', level, 'Grade ' || level FROM public."Grade"
      ON CONFLICT (school_id, level) DO NOTHING
    `, 'Migrate grades')
  }

  if (oldTables.includes('Subject')) {
    await execSafe(client, `
      INSERT INTO public.subjects (id, school_id, name)
      SELECT id, '${school.id}', name FROM public."Subject"
      ON CONFLICT (school_id, name) DO NOTHING
    `, 'Migrate subjects')
  }

  // Assign school_id to existing profiles
  await execSafe(client, `
    UPDATE public.profiles
    SET school_id = '${school.id}'
    WHERE school_id IS NULL AND role != 'super_admin'
  `, 'Assign school_id to existing profiles')

  if (oldTables.includes('Teacher')) {
    await execSafe(client, `
      INSERT INTO public.teachers (id, school_id, username, name, surname, email, phone, address, img, sex, birthday)
      SELECT
        t.id::uuid,
        '${school.id}',
        t.username,
        t.name,
        t.surname,
        t.email,
        t.phone,
        t.address,
        t.img,
        CASE WHEN t.sex::text = 'MALE' THEN 'MALE'::public.sex_type ELSE 'FEMALE'::public.sex_type END,
        t.birthday::date
      FROM public."Teacher" t
      WHERE EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = t.id::uuid)
      ON CONFLICT (id) DO NOTHING
    `, 'Migrate teachers')
  }

  if (oldTables.includes('Parent')) {
    await execSafe(client, `
      INSERT INTO public.parents (id, school_id, username, name, surname, email, phone, address)
      SELECT
        p.id::uuid,
        '${school.id}',
        p.username,
        p.name,
        p.surname,
        p.email,
        COALESCE(NULLIF(p.phone,''), 'unknown'),
        p.address
      FROM public."Parent" p
      WHERE EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = p.id::uuid)
      ON CONFLICT (id) DO NOTHING
    `, 'Migrate parents')
  }

  if (oldTables.includes('Class')) {
    await execSafe(client, `
      INSERT INTO public.classes (id, school_id, academic_year_id, name, capacity, grade_id)
      SELECT
        c.id,
        '${school.id}',
        ${year.id},
        c.name,
        c.capacity,
        c."gradeId"
      FROM public."Class" c
      WHERE EXISTS (SELECT 1 FROM public.grades g WHERE g.id = c."gradeId")
      ON CONFLICT DO NOTHING
    `, 'Migrate classes (without supervisor — set after teachers are migrated)')

    // Update supervisor_id now that teachers exist
    await execSafe(client, `
      UPDATE public.classes c
      SET supervisor_id = old."supervisorId"::uuid
      FROM public."Class" old
      WHERE c.id = old.id
        AND old."supervisorId" IS NOT NULL
        AND EXISTS (SELECT 1 FROM public.teachers t WHERE t.id = old."supervisorId"::uuid)
    `, 'Update class supervisors')
  }

  if (oldTables.includes('Student')) {
    await execSafe(client, `
      INSERT INTO public.students (id, school_id, username, name, surname, email, phone, address, img, sex, birthday, class_id)
      SELECT
        s.id::uuid,
        '${school.id}',
        s.username,
        s.name,
        s.surname,
        s.email,
        s.phone,
        s.address,
        s.img,
        CASE WHEN s.sex::text = 'MALE' THEN 'MALE'::public.sex_type ELSE 'FEMALE'::public.sex_type END,
        s.birthday::date,
        s."classId"
      FROM public."Student" s
      WHERE EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = s.id::uuid)
        AND EXISTS (SELECT 1 FROM public.classes c WHERE c.id = s."classId")
      ON CONFLICT (id) DO NOTHING
    `, 'Migrate students')

    // student_parents
    if (oldTables.includes('Parent')) {
      await execSafe(client, `
        INSERT INTO public.student_parents (student_id, parent_id, relationship, is_primary)
        SELECT s.id::uuid, s."parentId"::uuid, 'parent', true
        FROM public."Student" s
        WHERE s."parentId" IS NOT NULL
          AND EXISTS (SELECT 1 FROM public.students st WHERE st.id = s.id::uuid)
          AND EXISTS (SELECT 1 FROM public.parents p WHERE p.id = s."parentId"::uuid)
        ON CONFLICT DO NOTHING
      `, 'Migrate student_parents')
    }
  }

  if (oldTables.includes('_SubjectToTeacher')) {
    await execSafe(client, `
      INSERT INTO public.teacher_subjects (teacher_id, subject_id, school_id)
      SELECT ts."A"::uuid, ts."B", '${school.id}'
      FROM public."_SubjectToTeacher" ts
      WHERE EXISTS (SELECT 1 FROM public.teachers WHERE id = ts."A"::uuid)
        AND EXISTS (SELECT 1 FROM public.subjects WHERE id = ts."B")
      ON CONFLICT DO NOTHING
    `, 'Migrate teacher_subjects')
  }

  if (oldTables.includes('Lesson')) {
    await execSafe(client, `
      INSERT INTO public.lessons (id, school_id, academic_year_id, name, day, start_time, end_time, subject_id, class_id, teacher_id)
      SELECT
        l.id, '${school.id}', ${year.id}, l.name,
        l.day::public.day_of_week,
        l."startTime"::time,
        l."endTime"::time,
        l."subjectId",
        l."classId",
        l."teacherId"::uuid
      FROM public."Lesson" l
      WHERE EXISTS (SELECT 1 FROM public.classes WHERE id = l."classId")
        AND EXISTS (SELECT 1 FROM public.teachers WHERE id = l."teacherId"::uuid)
        AND EXISTS (SELECT 1 FROM public.subjects WHERE id = l."subjectId")
      ON CONFLICT DO NOTHING
    `, 'Migrate lessons')
  }

  if (oldTables.includes('Exam')) {
    await execSafe(client, `
      INSERT INTO public.exams (id, school_id, academic_year_id, title, start_time, end_time, lesson_id)
      SELECT e.id, '${school.id}', ${year.id}, e.title, e."startTime", e."endTime", e."lessonId"
      FROM public."Exam" e
      WHERE EXISTS (SELECT 1 FROM public.lessons WHERE id = e."lessonId")
      ON CONFLICT DO NOTHING
    `, 'Migrate exams')
  }

  if (oldTables.includes('Assignment')) {
    await execSafe(client, `
      INSERT INTO public.assignments (id, school_id, title, start_date, due_date, lesson_id)
      SELECT a.id, '${school.id}', a.title, a."startDate"::date, a."dueDate"::date, a."lessonId"
      FROM public."Assignment" a
      WHERE EXISTS (SELECT 1 FROM public.lessons WHERE id = a."lessonId")
      ON CONFLICT DO NOTHING
    `, 'Migrate assignments')
  }

  if (oldTables.includes('Result')) {
    await execSafe(client, `
      INSERT INTO public.results (id, school_id, score, student_id, exam_id, assignment_id)
      SELECT r.id, '${school.id}', r.score, r."studentId"::uuid, r."examId", r."assignmentId"
      FROM public."Result" r
      WHERE EXISTS (SELECT 1 FROM public.students WHERE id = r."studentId"::uuid)
      ON CONFLICT DO NOTHING
    `, 'Migrate results')
  }

  if (oldTables.includes('Attendance')) {
    await execSafe(client, `
      INSERT INTO public.attendance (id, school_id, date, present, student_id, lesson_id)
      SELECT a.id, '${school.id}', a.date::date, a.present, a."studentId"::uuid, a."lessonId"
      FROM public."Attendance" a
      WHERE EXISTS (SELECT 1 FROM public.students WHERE id = a."studentId"::uuid)
        AND EXISTS (SELECT 1 FROM public.lessons WHERE id = a."lessonId")
      ON CONFLICT DO NOTHING
    `, 'Migrate attendance')
  }

  if (oldTables.includes('Event')) {
    await execSafe(client, `
      INSERT INTO public.events (id, school_id, title, description, start_time, end_time, class_id)
      SELECT e.id, '${school.id}', e.title, e.description, e."startTime", e."endTime", e."classId"
      FROM public."Event" e
      ON CONFLICT DO NOTHING
    `, 'Migrate events')
  }

  if (oldTables.includes('Announcement')) {
    await execSafe(client, `
      INSERT INTO public.announcements (id, school_id, title, description, date, class_id)
      SELECT a.id, '${school.id}', a.title, a.description, a.date::date, a."classId"
      FROM public."Announcement" a
      ON CONFLICT DO NOTHING
    `, 'Migrate announcements')
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 9 — RLS policies
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n=== PHASE 9: RLS Policies ===')

  const rlsSql = fs.readFileSync(path.join(ROOT, 'supabase/rls_policies.sql'), 'utf8')
  await exec(client, rlsSql, 'rls_policies.sql')

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 10 — Grants
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n=== PHASE 10: Grants ===')

  const grantTables = [
    ['SELECT', 'schools'],
    ['SELECT, INSERT, UPDATE', 'academic_years'],
    ['SELECT, UPDATE', 'profiles'],
    ['SELECT, INSERT, UPDATE, DELETE', 'grades'],
    ['SELECT, INSERT, UPDATE, DELETE', 'subjects'],
    ['SELECT, INSERT, UPDATE, DELETE', 'teachers'],
    ['SELECT, INSERT, UPDATE, DELETE', 'parents'],
    ['SELECT, INSERT, UPDATE, DELETE', 'classes'],
    ['SELECT, INSERT, UPDATE, DELETE', 'students'],
    ['SELECT, INSERT, UPDATE, DELETE', 'student_parents'],
    ['SELECT, INSERT, UPDATE, DELETE', 'teacher_subjects'],
    ['SELECT, INSERT, UPDATE, DELETE', 'lessons'],
    ['SELECT, INSERT, UPDATE, DELETE', 'exams'],
    ['SELECT, INSERT, UPDATE, DELETE', 'assignments'],
    ['SELECT, INSERT, UPDATE, DELETE', 'results'],
    ['SELECT, INSERT, UPDATE, DELETE', 'attendance'],
    ['SELECT, INSERT, UPDATE, DELETE', 'fee_templates'],
    ['SELECT', 'fees'],
    ['SELECT, INSERT, UPDATE, DELETE', 'events'],
    ['SELECT, INSERT, UPDATE, DELETE', 'announcements'],
  ]

  for (const [perms, tbl] of grantTables) {
    await execSafe(client,
      `GRANT ${perms} ON public.${tbl} TO authenticated`,
      `GRANT ${tbl}`
    )
  }

  await execSafe(client,
    `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated`,
    'GRANT sequences'
  )

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 11 — Final verification
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n=== PHASE 11: Verification ===')

  const finalCount = await client.query(`
    SELECT
      (SELECT COUNT(*) FROM public.schools)         as schools,
      (SELECT COUNT(*) FROM public.academic_years)  as academic_years,
      (SELECT COUNT(*) FROM public.profiles)        as profiles,
      (SELECT COUNT(*) FROM public.grades)          as grades,
      (SELECT COUNT(*) FROM public.subjects)        as subjects,
      (SELECT COUNT(*) FROM public.teachers)        as teachers,
      (SELECT COUNT(*) FROM public.parents)         as parents,
      (SELECT COUNT(*) FROM public.classes)         as classes,
      (SELECT COUNT(*) FROM public.students)        as students,
      (SELECT COUNT(*) FROM public.student_parents) as student_parents,
      (SELECT COUNT(*) FROM public.lessons)         as lessons,
      (SELECT COUNT(*) FROM public.exams)           as exams,
      (SELECT COUNT(*) FROM public.events)          as events,
      (SELECT COUNT(*) FROM public.announcements)   as announcements
  `)

  console.log('\n  Row counts in new schema:')
  Object.entries(finalCount.rows[0]).forEach(([k, v]) => console.log(`   ${k.padEnd(20)}: ${v}`))

  // Check RLS enabled
  const rlsCheck = await client.query(`
    SELECT relname, relrowsecurity
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
      AND relname IN ('teachers','students','parents','profiles','classes','lessons')
    ORDER BY relname
  `)
  console.log('\n  RLS status:')
  rlsCheck.rows.forEach(r => console.log(`   ${r.relname.padEnd(15)}: RLS=${r.relrowsecurity}`))

  // Print school ID for use in bootstrap
  console.log(`\n  SCHOOL ID (save this): ${school.id}`)
  console.log(`  Use this to bootstrap your admin:`)
  console.log(`  SELECT public.bootstrap_school_admin('<your-user-uuid>', '${school.id}');`)

  await client.end()
  console.log('\n✅ All done! Migration successful.')
}

main().catch(e => {
  console.error('\n❌ FAILED:', e.message)
  console.error(e.stack)
  process.exit(1)
})

