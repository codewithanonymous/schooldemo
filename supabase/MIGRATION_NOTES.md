# Migration Notes — Backup → Clean Supabase Schema

## What was wrong with the original backup

### 1. psql meta-commands (hard syntax errors)
```
\restrict zKmrgfUVMg9HjyKtQiC0ZDYFamt2uACWak3bc2w5eVlFhtn6...
\connect ...
\copy ...
```
These are `psql` terminal directives, not SQL. The Supabase SQL Editor does not
understand them and will abort the entire script on line 1. **Removed entirely.**

### 2. Internal Supabase schema noise
The dump included `CREATE SCHEMA auth`, `CREATE SCHEMA extensions`,
`CREATE SCHEMA realtime`, `CREATE SCHEMA graphql`, `CREATE SCHEMA storage`,
and hundreds of functions/types inside those schemas (`auth.email()`,
`auth.uid()`, `realtime.apply_rls()`, `extensions.grant_pg_cron_access()`,
`pgbouncer.get_auth()`, etc.).

Supabase manages all of these automatically. Trying to re-create them fails
with "already exists" or permission errors. **Removed entirely.**

### 3. Direct `COPY auth.users ... FROM stdin` — FORBIDDEN
The backup contained raw `COPY` blocks that write directly to `auth.users`
and `auth.identities` with hashed passwords:
```sql
COPY auth.users (instance_id, id, aud, role, email, encrypted_password, ...) FROM stdin;
00000000-...\tadmin@example.com\t$2a$10$hQAx...
```
This is **not allowed** on Supabase managed projects because:
- Supabase now uses **argon2** hashing; bcrypt hashes from pg_dump won't verify.
- Direct auth.users writes bypass the Supabase Auth audit log.
- Direct auth.users writes bypass email confirmation, rate limiting, and bot
  protection pipelines.
- The `COPY` binary format is not accepted in the SQL Editor.

**Removed entirely.** Auth users must be created via:
- Supabase Dashboard → Authentication → Users
- `supabase.auth.admin.createUser()` from an Edge Function with service_role key

### 4. Old PascalCase Prisma schema (incompatible table names)
The backup contained the old Prisma-generated schema with tables like
`"Admin"`, `"Teacher"`, `"Student"`, `"Parent"`, `"Class"`, `"Grade"`,
`"Lesson"`, `"Exam"`, `"Subject"`, `"Result"`, `"Attendance"`, `"Event"`,
`"Announcement"`, `"_SubjectToTeacher"` with camelCase columns
(`"classId"`, `"bloodType"`, `"startTime"` etc.).

The current application code targets lowercase snake_case tables
(`teachers`, `students`, `classes`, `announcements`, etc.). Mixing both
schemas would cause FK constraint failures and confusing query errors.
**Replaced entirely** with the v3 snake_case schema that matches the app.

### 5. Profiles table — missing school_id column
The backup's `profiles` table had only `(id, email, role)` with no `school_id`.
This breaks the entire multi-tenant architecture: every RLS policy, every
`my_school_id()` call, and every admin operation relies on `profiles.school_id`.
**Fixed** — profiles now carries `school_id uuid REFERENCES schools(id)`.

### 6. `handle_new_user` trigger used wrong default role
Old version wrote `COALESCE(new.raw_user_meta_data->>'role', 'user')` —
allowing client metadata to set the role at sign-up. A malicious user could
register with `{ "role": "admin" }` and get admin access.
**Fixed** — new trigger always inserts `role = 'student'` regardless of
metadata. Role is only elevated by `set_user_profile()` or
`bootstrap_school_admin()`, both of which verify the caller's identity
server-side.

### 7. `admin_create_user` tried to INSERT into auth.users
The old `admin_create_user` function contained direct `INSERT INTO auth.users`
with `crypt(password, gen_salt('bf'))` (bcrypt). This fails on Supabase
because:
- Permission denied on `auth.users` for the `postgres` role in newer Supabase
  versions.
- Even if it worked, bcrypt hashes will not verify against the argon2 verifier.

**Fixed** — the function now delegates to the Edge Function pattern. It
validates permissions and then calls `set_user_profile()` to handle the
profile + role-specific row after the Edge Function creates the auth user.

### 8. `teacher_subjects.teacher_id` type mismatch
The backup had `teacher_subjects."A" uuid, "B" integer` (Prisma's
`_SubjectToTeacher`). The new schema correctly has `teacher_id uuid` (FK to
`teachers.id` which is uuid) and `subject_id integer` (FK to `subjects.id`
which is serial/integer).

### 9. `COPY public.profiles ... FROM stdin` — orphaned FKs
The backup seeded profiles rows:
```
a47dbc41-...  admin@example.com   admin
cd332a11-...  teacher@example.com teacher
```
These COPY rows would fail with `ERROR: insert or update on table "profiles"
violates foreign key constraint "profiles_id_fkey"` because the
corresponding auth.users rows don't exist in the new database.
**Replaced** with a safe `seed.sql` that uses `ON CONFLICT DO NOTHING` and
documents that auth users must be created first.

### 10. Missing `exec_sql` dangerous function
The backup contained `public.exec_sql(sql_query text)` — a SECURITY DEFINER
function that executes arbitrary SQL. This is a severe security hole
(SQL injection at superuser level). **Removed** from the clean schema.

---

## Run order for a fresh Supabase project

```
1. Supabase Dashboard → SQL Editor → paste schema.sql → Run
2. Supabase Dashboard → SQL Editor → paste rls_policies.sql → Run
3. Supabase Dashboard → SQL Editor → paste functions/admin_create_user.sql → Run
4. Create auth users manually (Dashboard or Edge Function)
5. Supabase Dashboard → SQL Editor → paste seed.sql → Run
   (update UUID constants at the top of seed.sql to match your new auth users)
```

## Files produced

| File | Purpose |
|------|---------|
| `supabase/schema.sql` | All tables, types, indexes, triggers, grants. Safe to re-run (idempotent). |
| `supabase/rls_policies.sql` | All RLS policies. Drops and recreates on each run. |
| `supabase/functions/admin_create_user.sql` | Server-side provisioning RPCs. |
| `supabase/seed.sql` | Demo data. Requires auth users to exist first. |
| `supabase/MIGRATION_NOTES.md` | This file. |
