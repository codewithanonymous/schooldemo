# School Management SaaS — Production Architecture

## What Was Fixed

### Critical Security Issues Resolved

| # | Issue | Old Behavior | Fixed Behavior |
|---|-------|-------------|---------------|
| 1 | **Client role escalation** | `signUp({ options: { data: { role: 'admin' } } })` — anyone could sign up as admin | `admin_create_user` RPC verifies caller is admin in DB; role is NEVER from client payload |
| 2 | **Zero RLS on 14 tables** | All tables had RLS disabled by schemaComparator | Every table has RLS + full RBAC policies |
| 3 | **Mock session bypass** | `localStorage` mock session had no env gate on read path — trivial admin impersonation | Removed entirely. Only Supabase JWTs are trusted |
| 4 | **SELECT * everywhere** | All pages fetched every column with no filters | Explicit column lists + RLS-scoped queries |
| 5 | **No FK between profiles ↔ role tables** | Users existed in profiles but had no related row | schema.sql enforces FK: `teachers/students/parents.id → profiles(id)` |
| 6 | **Missing teacher_subjects join table** | UI had multi-select for subjects but no DB table | `teacher_subjects` join table added; Teachers page now saves correctly |
| 7 | **PascalCase table names** | `Teacher`, `Student`, `Class` etc. | All renamed to `snake_case` per Postgres convention |
| 8 | **Hardcoded default password** | `password \|\| '12345678'` | Password is required field, no fallback |

---

## Data Flow

```
Browser (React)
    │
    │  JWT (Supabase anon key)
    ▼
Supabase PostgREST API
    │
    │  auth.uid() checked per row
    ▼
Row Level Security Policies
    │
    ├── admin  → reads/writes everything
    ├── teacher → only own lessons, own class students
    ├── student → only own row, own class lessons/exams
    └── parent  → only own children's data
```

---

## Schema Overview

```
auth.users (Supabase managed)
    └── profiles (id FK→auth.users, role: enum)
            ├── teachers  (id FK→profiles)
            │       └── teacher_subjects (teacher_id, subject_id)
            ├── parents   (id FK→profiles)
            │       └── students (parent_id FK→parents)
            └── students  (id FK→profiles)
                    ├── class_id FK→classes
                    └── grade_id FK→grades

classes (grade_id FK→grades, supervisor_id FK→teachers)
subjects
lessons (subject_id, class_id, teacher_id)
    ├── exams       (lesson_id)
    ├── assignments (lesson_id)
    └── attendance  (lesson_id, student_id)

results (student_id, exam_id XOR assignment_id)
events        (class_id nullable = school-wide)
announcements (class_id nullable = school-wide)
```

---

## RBAC Policy Summary

| Table | admin | teacher | student | parent |
|-------|-------|---------|---------|--------|
| profiles | R/W all | read own | read own | read own |
| teachers | CRUD | read+update own | read (for schedule) | read (linked only) |
| parents | CRUD | read linked parents | — | read+update own |
| students | CRUD | read own class | read own | read own children |
| classes | CRUD | read all | read own class | read children's class |
| subjects | CRUD | read | read | read |
| lessons | CRUD | CRUD own | read own class | read children's class |
| exams | CRUD | CRUD own lessons | read own class | read children's class |
| assignments | CRUD | CRUD own lessons | read own class | read children's class |
| results | CRUD | CRUD own class students | read own | read children |
| attendance | CRUD | CRUD own lessons | read own | read children |
| events | CRUD | read+write own class | read own class | read children's class |
| announcements | CRUD | read+write own class | read own class | read children's class |

---

## Auth Flow

```
1. User goes to /login
2. LoginPage calls AuthContext.login(email, password)
3. supabase.auth.signInWithPassword() → returns JWT
4. onAuthStateChange fires → handleSession()
5. resolveProfile() queries profiles table (RLS: can only read own row)
6. role stored in AuthContext state
7. ProtectedRoute checks role → redirects to correct dashboard

User Creation (admin only):
1. Admin fills form → supabase.rpc('admin_create_user', {...})
2. DB function verifies caller profile.role = 'admin'
3. Inserts into auth.users + profiles atomically
4. Role is set inside the DB function — never from client payload
5. Admin then inserts into teachers/students/parents table with the returned user_id
```

---

## Deployment Checklist

### Supabase SQL Editor (run in order)
1. `supabase/schema.sql` — creates all tables, enums, trigger, enables RLS
2. `supabase/rls_policies.sql` — applies all RBAC policies
3. `supabase/functions/admin_create_user.sql` — creates secure user creation function

### First Admin User
Since the trigger defaults all new signups to `role='student'`, bootstrap the first admin manually:
```sql
-- Run in Supabase SQL Editor after your first signup
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'your-admin@email.com';
```

### Environment Variables (.env)
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```
The `service_role` key must NEVER be in the frontend `.env`. It stays server-side (Supabase Edge Functions or your backend API).

---

## Frontend Query Patterns

All queries now follow this pattern — let RLS do the filtering:

```js
// ✅ Correct — explicit columns, RLS scopes rows automatically
const { data } = await supabase
  .from('lessons')
  .select('id, name, start_time, end_time')
  // NO manual .eq('teacher_id', user.id) needed — RLS handles it

// ✅ Correct for admin — still explicit columns
const { data } = await supabase
  .from('teachers')
  .select('id, username, name, surname, email, phone')

// ❌ Never do this
const { data } = await supabase.from('Student').select('*')
```

---

## Folder Structure

```
src/
├── context/
│   └── AuthContext.jsx      ← Supabase-only auth, no mock sessions
├── lib/
│   ├── supabaseClient.js    ← Supabase anon client
│   └── adminUserService.js  ← RPC wrapper for user creation
├── components/
│   ├── ProtectedRoute.jsx   ← Frontend route guard (DB-backed role)
│   └── charts/              ← All use new lowercase table names
├── pages/
│   ├── admin/               ← CRUD pages, all use secure RPC for user creation
│   ├── teacher/             ← Schedule filtered via RLS
│   ├── student/             ← Self-data only via RLS
│   └── parent/              ← Children's data only via RLS
supabase/
├── schema.sql               ← Full production schema + enums + trigger
├── rls_policies.sql         ← Complete RBAC policies for all tables
└── functions/
    └── admin_create_user.sql ← Secure server-side user creation
```
