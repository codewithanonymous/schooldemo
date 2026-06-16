-- =============================================================================
-- SCHOOL MANAGEMENT SAAS — SERVER-SIDE USER PROVISIONING FUNCTIONS v3.1
-- =============================================================================
-- Run AFTER schema.sql.
--
-- Security model
-- ──────────────
-- Every SECURITY DEFINER function must be hostile-input-safe:
--   • auth.uid() can be NULL (unauthenticated, broken JWT, anon key).
--     NULL comparisons in PL/pgSQL IF-branches evaluate to NULL (not TRUE/FALSE).
--     We treat a NULL caller as an unauthenticated stranger and RAISE immediately.
--   • Helper functions (is_super_admin, is_admin…) always return BOOLEAN,
--     never NULL — they coalesce to FALSE when auth.uid() is NULL.
--   • bootstrap_school_admin is locked down to service_role only (not
--     authenticated). The zero-admin check alone is not safe because an attacker
--     controls p_school_id and could pass a school they just created or one
--     whose admin was deleted.
--   • promote_user explicitly checks v_caller_role IS NOT NULL before ANY
--     branching so a NULL auth context always raises immediately.
--
-- Call flow for creating a new user
-- ──────────────────────────────────
--   1. React calls the "create-user" Edge Function (service_role key only).
--   2. Edge Function calls supabase.auth.admin.createUser().
--   3. on_auth_user_created trigger fires → inserts profile (role='student', school_id=NULL).
--   4. Edge Function calls public.set_user_profile() RPC to assign real role + school.
--
-- Functions
-- ─────────
--   A. set_user_profile()       — assign role + school; create teacher/parent row
--   B. promote_user()           — change an existing user's role
--   C. bootstrap_school_admin() — one-time first-admin setup (service_role only)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- SAFETY: coerce is_super_admin / is_admin / is_teacher to always return
-- a concrete boolean, never NULL, even when auth.uid() is NULL.
-- These replace the versions in schema.sql with null-safe equivalents.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  -- COALESCE(EXISTS(...), false) is redundant because EXISTS never returns NULL,
  -- but we add it explicitly as documentation of intent and defence-in-depth.
  SELECT COALESCE(
    (SELECT role = 'super_admin'
     FROM   public.profiles
     WHERE  id = auth.uid()),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role = 'admin'
     FROM   public.profiles
     WHERE  id = auth.uid()),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role = 'teacher'
     FROM   public.profiles
     WHERE  id = auth.uid()),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_super()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role IN ('admin', 'super_admin')
     FROM   public.profiles
     WHERE  id = auth.uid()),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.my_school_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  -- Returns NULL for super_admin (intentional) or unauthenticated callers.
  -- RLS policies must treat NULL school_id as "no access" not "all access".
  SELECT school_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.my_role()
RETURNS public.user_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- A. set_user_profile
-- ---------------------------------------------------------------------------
-- Called by the create-user Edge Function AFTER auth.admin.createUser().
-- Enforces:
--   • auth.uid() is not NULL (fails on anon / broken JWT)
--   • Caller must be admin of the exact target school, or super_admin
--   • Admin cannot create super_admin accounts
--   • p_school_id must exist in public.schools (FK check via INSERT)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_user_profile(
  p_user_id   uuid,
  p_email     text,
  p_role      public.user_role,
  p_school_id uuid,
  p_name      text,
  p_surname   text,
  p_username  text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caller_id        uuid             := auth.uid();
  v_caller_role      public.user_role;
  v_caller_school_id uuid;
BEGIN
  -- ── Guard 0: must be authenticated ───────────────────────────────────────
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated'
      USING ERRCODE = '42501';
  END IF;

  -- ── Guard 1: load caller identity ────────────────────────────────────────
  SELECT role, school_id
  INTO   v_caller_role, v_caller_school_id
  FROM   public.profiles
  WHERE  id = v_caller_id;

  -- Profile missing entirely (should not happen, but be explicit)
  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'Caller has no profile — cannot provision users'
      USING ERRCODE = '42501';
  END IF;

  -- ── Guard 2: only admin or super_admin may provision ─────────────────────
  IF v_caller_role = 'super_admin' THEN
    NULL; -- super_admin can provision in any school; skip school check

  ELSIF v_caller_role = 'admin' THEN
    -- Admin may only create users inside their own school.
    -- Both sides must be non-NULL and equal; IS NOT DISTINCT FROM handles NULLs.
    IF v_caller_school_id IS NULL THEN
      RAISE EXCEPTION 'Admin caller has no school_id — account misconfigured'
        USING ERRCODE = '42501';
    END IF;
    IF p_school_id IS DISTINCT FROM v_caller_school_id THEN
      RAISE EXCEPTION 'Permission denied: you can only create users in your own school'
        USING ERRCODE = '42501';
    END IF;

  ELSE
    RAISE EXCEPTION 'Permission denied: role "%" cannot provision users', v_caller_role
      USING ERRCODE = '42501';
  END IF;

  -- ── Guard 3: admin cannot create super_admin accounts ────────────────────
  IF p_role = 'super_admin' AND v_caller_role != 'super_admin' THEN
    RAISE EXCEPTION 'Permission denied: only super_admin can create super_admin accounts'
      USING ERRCODE = '42501';
  END IF;

  -- ── Guard 4: non-super_admin roles must have a school ────────────────────
  IF p_role != 'super_admin' AND p_school_id IS NULL THEN
    RAISE EXCEPTION 'school_id is required for role "%"', p_role
      USING ERRCODE = '22023';
  END IF;

  -- ── Action: upsert profile ───────────────────────────────────────────────
  -- The on_auth_user_created trigger already inserted a stub row.
  -- We promote it to the real role and school.
  INSERT INTO public.profiles (id, email, role, school_id)
  VALUES (p_user_id, p_email, p_role, p_school_id)
  ON CONFLICT (id) DO UPDATE
    SET role       = EXCLUDED.role,
        school_id  = EXCLUDED.school_id,
        email      = EXCLUDED.email,
        updated_at = now();

  -- ── Action: create role-specific row ─────────────────────────────────────
  CASE p_role
    WHEN 'teacher' THEN
      INSERT INTO public.teachers (id, school_id, username, name, surname, email)
      VALUES (p_user_id, p_school_id, p_username, p_name, p_surname, p_email)
      ON CONFLICT (id) DO UPDATE
        SET name     = EXCLUDED.name,
            surname  = EXCLUDED.surname,
            email    = EXCLUDED.email,
            username = EXCLUDED.username;

    WHEN 'parent' THEN
      INSERT INTO public.parents (id, school_id, username, name, surname, email, phone)
      VALUES (p_user_id, p_school_id, p_username, p_name, p_surname, p_email, '')
      ON CONFLICT (id) DO UPDATE
        SET name     = EXCLUDED.name,
            surname  = EXCLUDED.surname,
            email    = EXCLUDED.email,
            username = EXCLUDED.username;

    WHEN 'student' THEN
      -- Student row requires class_id — not available at provisioning time.
      -- Caller inserts/updates public.students separately after this call.
      NULL;

    WHEN 'admin' THEN
      NULL; -- admin identity lives only in profiles

    ELSE
      NULL;
  END CASE;

  RETURN jsonb_build_object('user_id', p_user_id, 'role', p_role);
END;
$$;

REVOKE ALL   ON FUNCTION public.set_user_profile FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_user_profile TO authenticated;

-- ---------------------------------------------------------------------------
-- B. promote_user
-- ---------------------------------------------------------------------------
-- Changes an existing user's role. Enforces:
--   • auth.uid() is not NULL
--   • Caller role is loaded and checked BEFORE any branching
--   • Admin can only promote within own school, never to super_admin
--   • Admin cannot demote/promote themselves
--   • super_admin can promote anyone
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.promote_user(
  p_user_id   uuid,
  p_new_role  public.user_role,
  p_school_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caller_id        uuid             := auth.uid();
  v_caller_role      public.user_role;
  v_caller_school_id uuid;
  v_resolved_school  uuid;
BEGIN
  -- ── Guard 0: must be authenticated ───────────────────────────────────────
  -- This check MUST come before any IF-branch that reads v_caller_role.
  -- Without it, a NULL auth.uid() causes both role checks below to be skipped.
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated'
      USING ERRCODE = '42501';
  END IF;

  -- ── Guard 1: load and validate caller identity ───────────────────────────
  SELECT role, school_id
  INTO   v_caller_role, v_caller_school_id
  FROM   public.profiles
  WHERE  id = v_caller_id;

  -- v_caller_role IS NULL means the caller has no profile row at all.
  -- Without this explicit check, every IF/ELSIF below evaluates to NULL
  -- (not TRUE), causing the function to fall through to the UPDATE silently.
  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'Caller has no profile — cannot promote users'
      USING ERRCODE = '42501';
  END IF;

  -- ── Guard 2: role-based permission ───────────────────────────────────────
  IF v_caller_role = 'super_admin' THEN
    -- super_admin can promote anyone to any role in any school
    v_resolved_school := COALESCE(p_school_id, (
      SELECT school_id FROM public.profiles WHERE id = p_user_id
    ));

  ELSIF v_caller_role = 'admin' THEN
    -- Admin school must be known
    IF v_caller_school_id IS NULL THEN
      RAISE EXCEPTION 'Admin caller has no school_id — account misconfigured'
        USING ERRCODE = '42501';
    END IF;
    -- Admin cannot promote to super_admin
    IF p_new_role = 'super_admin' THEN
      RAISE EXCEPTION 'Permission denied: admin cannot promote to super_admin'
        USING ERRCODE = '42501';
    END IF;
    -- Admin can only promote within their own school
    v_resolved_school := COALESCE(p_school_id, v_caller_school_id);
    IF v_resolved_school IS DISTINCT FROM v_caller_school_id THEN
      RAISE EXCEPTION 'Permission denied: cannot promote users outside your school'
        USING ERRCODE = '42501';
    END IF;
    -- Admin cannot promote themselves (privilege escalation via self-assign)
    IF p_user_id = v_caller_id THEN
      RAISE EXCEPTION 'Permission denied: admin cannot change their own role'
        USING ERRCODE = '42501';
    END IF;

  ELSE
    -- Any other role (teacher, student, parent) is denied outright
    RAISE EXCEPTION 'Permission denied: role "%" cannot promote users', v_caller_role
      USING ERRCODE = '42501';
  END IF;

  -- ── Action ────────────────────────────────────────────────────────────────
  UPDATE public.profiles
  SET    role       = p_new_role,
         school_id  = v_resolved_school,
         updated_at = now()
  WHERE  id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target user % not found', p_user_id
      USING ERRCODE = '02000';
  END IF;

  RETURN jsonb_build_object('user_id', p_user_id, 'new_role', p_new_role);
END;
$$;

REVOKE ALL   ON FUNCTION public.promote_user FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.promote_user TO authenticated;

-- ---------------------------------------------------------------------------
-- C. bootstrap_school_admin
-- ---------------------------------------------------------------------------
-- Elevates a user to school admin for first-time setup.
--
-- SECURITY CHANGE from v3.0:
--   The old version was GRANT-ed to `authenticated`, protected only by
--   a zero-admin count for the *caller-supplied* school_id. This was unsafe:
--   an attacker could pass any school_id that currently has no admin
--   (newly created schools, schools with deleted admins) to self-promote.
--
--   This version is now REVOKED from `authenticated` and GRANTED only to
--   `service_role`. It must be called from your Edge Function or the Supabase
--   Dashboard — never from client-side React code.
--
-- Why service_role is safe here:
--   service_role bypasses RLS entirely and is never exposed to the browser.
--   Your Edge Function should verify the request comes from a known admin
--   setup flow before calling this RPC.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bootstrap_school_admin(
  p_user_id   uuid,
  p_school_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_admin_count   integer;
  v_school_exists boolean;
BEGIN
  -- ── Guard 1: target school must exist ────────────────────────────────────
  SELECT EXISTS(SELECT 1 FROM public.schools WHERE id = p_school_id)
  INTO   v_school_exists;

  IF NOT v_school_exists THEN
    RAISE EXCEPTION 'School % does not exist', p_school_id
      USING ERRCODE = '02000';
  END IF;

  -- ── Guard 2: target user must exist ──────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User % has no profile — create auth user first', p_user_id
      USING ERRCODE = '02000';
  END IF;

  -- ── Guard 3: school must have zero admins (one-time bootstrap) ───────────
  SELECT COUNT(*) INTO v_admin_count
  FROM   public.profiles
  WHERE  school_id = p_school_id AND role = 'admin';

  IF v_admin_count > 0 THEN
    RAISE EXCEPTION 'School % already has % admin(s). Use promote_user() instead.',
      p_school_id, v_admin_count
      USING ERRCODE = '42501';
  END IF;

  -- ── Action ────────────────────────────────────────────────────────────────
  UPDATE public.profiles
  SET    role       = 'admin',
         school_id  = p_school_id,
         updated_at = now()
  WHERE  id = p_user_id;

  RETURN jsonb_build_object('bootstrapped', true, 'user_id', p_user_id, 'school_id', p_school_id);
END;
$$;

-- !! CRITICAL: REVOKE from authenticated — callable from service_role ONLY !!
-- Authenticated users (including admins) must NOT be able to call this.
-- Call it from your Edge Function using the service_role key.
REVOKE ALL   ON FUNCTION public.bootstrap_school_admin FROM PUBLIC;
REVOKE ALL   ON FUNCTION public.bootstrap_school_admin FROM authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_school_admin TO service_role;
