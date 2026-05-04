# Bagong Ilog ES — Backend Smoke Test Report

**Date:** 2026-05-04
**Project:** `xvwnuqlxttwhkwdmtlqu` (`https://xvwnuqlxttwhkwdmtlqu.supabase.co`)
**Test runner:** `scripts/smoke-test.js`

---

## Headline finding

The premise that "RLS policies are NOT YET APPLIED" is **wrong**. RLS is **enabled and enforcing** on every base table — anon SELECTs return 0 rows and anon INSERTs into `subjects`, `alerts`, and `students` all fail with `new row violates row-level security policy`. The seeded migrations 02 / 03 / 04 are applied.

The real, visible problem is the opposite: the React app is wired to read with the **anon key only** (no signed-in user) for `fetchTeachers` and `fetchAlerts`, so those calls now return **0 rows for every visitor**. `fetchStudents` only works because it reads through the `v_student_overview` view, which inherits the seed-time owner's privileges and bypasses table RLS.

---

## 1) Schema integrity — PASS

All 12 base tables exist. Health-tier tables from migration `03_roles_and_health.sql` are **missing**.

| Table | Row count (service role) |
|---|---:|
| `profiles` | 1 |
| `subjects` | 7 |
| `sections` | 12 |
| `teachers` | 8 |
| `teacher_sections` | **0** (never seeded) |
| `students` | 382 |
| `enrollments` | 382 |
| `grades` | 10,696 |
| `attendance` | 11,460 |
| `predictions` | 382 |
| `interventions` | **0** (never seeded) |
| `alerts` | 20 |
| `health_records` | MISSING (relation does not exist) |
| `immunizations` | MISSING |
| `clinic_visits` | MISSING |

**Views:** `v_student_overview` returns **382 rows** with all 16 expected columns (`id, lrn, full_name, gender, age, household_income, parent_involvement, grade_level, section_name, attendance_pct, tardiness_count, average_grade, risk_score, risk_level, projected_average, failing_subjects`). Sample row spot-check: `Allan Rosario` / LRN `BIES-1210`, grade 4 Mahogany, attendance 70%, average 90.07, risk Low (22). `v_enrollment` exists and is queryable.

**Conclusion:** schema is consistent with `01_schema.sql` and `03_roles_and_health.sql` — except migration 03's three tables (`health_records`, `immunizations`, `clinic_visits`) are **NOT created**. Migration 03 was only partially applied: the `profiles.role` constraint expansion and helper functions are present (signUp with `role:'teacher'` succeeded), but the health-records DDL did not run.

## 2) `dataService.js` round-trip — PARTIAL FAIL

Tested with the publishable anon key (browser config). All four functions execute without errors but row counts diverge from what the UI expects.

| Function | Rows | Expected | Status |
|---|---:|---|---|
| `fetchStudents()` | 382 | 382 | OK (reads view, bypasses RLS) |
| `fetchTeachers()` | **0** | 8 | BROKEN for unauthenticated users |
| `fetchAlerts()` | **0** | 20 | BROKEN for unauthenticated users |
| `fetchSchoolMetrics()` | total=382, avgAttendance=83.7, avgGrade=83.2, highRisk=57, mediumRisk=120, lowRisk=205, dropoutRiskPct=14.9 | populated | OK |

`fetchTeachers` and `fetchAlerts` query base tables directly (`teachers`, `alerts`) and are subject to RLS. With no session, `auth.role()` is `'anon'`, no policy permits anon SELECT, so 0 rows come back. `DataContext.jsx` runs all four calls in `Promise.all` on app mount before any sign-in — the Dashboard, Teachers, and Alerts views will display empty until a user authenticates.

**Sample shape from `fetchStudents`** matches the React app contract: keys map cleanly through the `dataService.fetchStudents` reshape (line 33–63 of `src/services/dataService.js`).

## 3) RLS state — PASS (different from prompt)

Inferred via anon vs service-role row-count comparison (direct PG was unreachable — `DATABASE_URL` password in `.env` is rotated/invalid, see "Notes" below).

| Table | svc rows | anon rows | Verdict |
|---|---:|---:|---|
| `profiles` | 1 | 0 | PROTECTED |
| `subjects` | 7 | 0 | PROTECTED |
| `sections` | 12 | 0 | PROTECTED |
| `teachers` | 8 | 0 | PROTECTED |
| `teacher_sections` | 0 | 0 | ambiguous (table empty) |
| `students` | 382 | 0 | PROTECTED |
| `enrollments` | 382 | 0 | PROTECTED |
| `grades` | 10,696 | 0 | PROTECTED |
| `attendance` | 11,460 | 0 | PROTECTED |
| `predictions` | 382 | 0 | PROTECTED |
| `interventions` | 0 | 0 | ambiguous (table empty) |
| `alerts` | 20 | 0 | PROTECTED |

Anon INSERT attempts on `subjects`, `alerts`, `students` all returned PostgREST error `42501 — new row violates row-level security policy`. Confirmed: RLS is ON and INSERT/UPDATE/DELETE policies for anon are absent (correct behavior).

`v_student_overview` is the only **leak**: it returns all 382 rows to anon. Postgres views default to running with the privileges of the view owner unless created `with (security_invoker = on)`. The view definition in `01_schema.sql` (lines 181–218) does not set `security_invoker`, so anon reads through it with the owner's role, sidestepping the RLS policies on the underlying `students`, `enrollments`, `attendance`, `grades`, `predictions` tables.

## 4) Anon-key data exposure — MIXED

- **Direct table SELECTs (anon):** all return 0 rows. Properly protected.
- **`v_student_overview` (anon):** returns the full 382-student dataset. **Entire student PII roster is publicly readable** with just the publishable key. Includes LRNs, gender, age, household income, parent involvement, grade, section, attendance %, tardiness, average grade, risk score, risk level, projected average, failing subjects.
- **Anon INSERT/UPDATE/DELETE:** blocked everywhere tested.

This is the actual security hole: the publishable key in `.env` (line 20) plus the view's missing `security_invoker` flag means anyone who loads the React bundle in a browser gets the full student roster.

## 5) Auth flow — PASS

Signup via the anon key hit `email rate limit exceeded` on the project — fell back to `auth.admin.createUser` (service role) for the rest of the test. End-to-end behavior verified:

- `auth.admin.createUser({ email_confirm: true, user_metadata: { full_name: 'Smoke Tester', role: 'teacher' } })` → user `85eebc0d-917a-4653-b3dd-6e457b90f314` created.
- `handle_new_user` trigger **fired** within 250ms — created `profiles` row with `full_name='Smoke Tester'`, `role='teacher'`, `email='smoke.test.<ts>@gmail.com'`. Both fields correct.
- `signInWithPassword` with the new credentials returned a session.
- `getSession` confirmed the session.
- `auth.admin.deleteUser` cleaned up the user; the `on delete cascade` on `profiles.id` removed the profile row.

The trigger correctly accepts `role='teacher'` (one of the expanded values from migration 03), so the role-check constraint expansion was applied even though the health tables weren't.

## 6) Performance — PASS

Cold-cache timings from Manila→AWS ap-southeast-2 over PostgREST.

| Query | Time |
|---|---:|
| `v_student_overview` (full table, service role) | 381–471 ms |
| `fetchStudents()` (anon, view, 382 rows) | 386–627 ms |
| `fetchTeachers()` (anon, joined select, 0 rows due to RLS) | 214–433 ms |
| `fetchAlerts()` (anon, nested join, 0 rows) | 217–337 ms |

`fetchStudents` is the only call that brushes the 500 ms threshold and only on the cold first hit. After warm-up it sits ~390 ms. No query exceeded 700 ms across two runs.

## 7) Email confirmation — UNDETERMINED

Could not measure cleanly — the project's email rate limit was already exhausted before the test ran (`email rate limit exceeded` on the very first signUp). That implies confirmation emails ARE being dispatched (rate limiting only counts emails actually queued), so confirmation is most likely **enabled**. Confirm in the dashboard at **Auth → Settings → "Confirm email"**. If it's on, your AuthScreen needs to handle the post-signup empty-session state and show "check your inbox" — `AuthContext.signUp` (line 102–112) currently doesn't differentiate.

The two `parent` and `student` roles in `handle_new_user`'s default literal would also need new email templates to make sense for a school context.

## 8) Backend Gaps (data layer vs UI demand)

`dataService.js` exposes only four functions: `fetchStudents`, `fetchTeachers`, `fetchAlerts`, `fetchSchoolMetrics`. Mapping them to the 13 views:

| View | Data source today | Gap |
|---|---|---|
| `Dashboard.jsx` | `useData()` → metrics, alerts, charts | charts are **static mock arrays** in `chartData` (`src/services/dataService.js` lines 166–172) |
| `Students.jsx` | `useData().students` | OK |
| `Teachers.jsx` | imports `TEACHERS` mock directly (`src/views/Teachers.jsx:2`) | **Not wired to live `fetchTeachers`** even though the function exists |
| `Alerts.jsx` | imports `ALERTS, STUDENTS_WITH_RISK` mocks (`src/views/Alerts.jsx:2`) | **Not wired to live `fetchAlerts`** |
| `Predictive.jsx` | imports `STUDENTS_WITH_RISK, recommendInterventions` mocks (`src/views/Predictive.jsx:7`) | needs `fetchPredictions` + `fetchInterventions`; table `interventions` is empty (0 rows seeded) |
| `Academics.jsx` | imports `SUBJECT_PERFORMANCE, GRADE_PERFORMANCE, STUDENTS_WITH_RISK` mocks | needs aggregated `fetchSubjectPerformance`/`fetchGradePerformance` from real `grades` |
| `Attendance.jsx` | imports `ATTENDANCE_BY_MONTH, STUDENTS_WITH_RISK, SCHOOL_METRICS` mocks | needs `fetchAttendanceByMonth` from real `attendance` (11,460 rows are sitting unused) |
| `Enrollment.jsx` | `useData().students` | partial; the `v_enrollment` view exists but no `fetchEnrollments` consumes it |
| `HealthRecords.jsx` | imports `HEALTH_RECORDS, IMMUNIZATIONS, CLINIC_VISITS` mocks (`src/views/HealthRecords.jsx:10`) | **tables don't exist** in DB — migration 03's CREATE TABLE statements weren't applied. Need to run `03_roles_and_health.sql` again, then build `fetchHealthRecords`, `fetchImmunizations`, `fetchClinicVisits` |
| `MyProgress.jsx` | imports `HEALTH_RECORDS, IMMUNIZATIONS` mocks + `useData().students` | same as HealthRecords + needs per-student lookup using `my_student_id()` |
| `Reports.jsx` | no data source — only icon imports (`src/views/Reports.jsx:1`) | **purely cosmetic stub** — needs export logic (CSV/PDF generators) |
| `Settings.jsx` | local `useState` only | **purely cosmetic stub** — Save button does nothing; needs persistence to `profiles` / app settings table |
| `AuthScreen.jsx` | `useAuth()` | OK |

**Missing `fetchX` functions** the UI would need before mocks can be retired:
- `fetchInterventions(studentId?)`
- `fetchPredictions(studentId?)` (currently only embedded in the view)
- `fetchEnrollments(sectionId?)` (against the existing `v_enrollment` view)
- `fetchAttendanceByMonth()` (aggregation over `attendance`)
- `fetchSubjectPerformance()` / `fetchGradePerformance()` (aggregations over `grades`)
- `fetchHealthRecords(studentId)` + `fetchImmunizations(studentId)` + `fetchClinicVisits(studentId)`
- `fetchMyProfile()` for the student/parent self-views
- mutation helpers: `createIntervention`, `resolveAlert`, `upsertGrade`, `markAttendance` (the schema supports them; no UI writes anything yet)

Empty tables that need seed data before the UI is meaningful:
- `teacher_sections` — 0 rows; without these, no teacher will ever see students once RLS is enforced for them. The 8 teachers exist but aren't assigned to any of the 12 sections, so `my_section_ids()` returns an empty set for every teacher.
- `interventions` — 0 rows; the Predictive and Students views have nothing to display.
- The single seeded `profiles` row is presumably your own admin account; teachers/parents/students have no auth accounts so no one can actually log in.

---

## Security Hardening Steps (priority order)

1. **Patch the `v_student_overview` leak** — re-create the view with `with (security_invoker = on)`, e.g.
   ```sql
   create or replace view public.v_student_overview
     with (security_invoker = on) as
     select ... ;
   ```
   Same for `v_enrollment`. Until this is done the publishable key alone leaks the full 382-student PII roster (LRN + name + age + household income + risk score).
2. **Rotate the credentials in `.env`** — the security notice in the file (lines 5–13) flagged that they were pasted into a transcript. The `DATABASE_URL` password is already invalid (auth fails when pg connects), but `SUPABASE_SERVICE_ROLE_KEY` and the publishable key are still live. Reset password + rotate JWT secret in the Supabase dashboard.
3. **Seed `teacher_sections`** so the teacher RLS policies stop matching zero rows. Without this, signing in as a teacher is functionally identical to anon for the `students`, `grades`, `attendance` tables.
4. **Apply the missing pieces of migration 03** — the health table CREATE statements never ran. Run `03_roles_and_health.sql` again (the `if not exists` clauses make it idempotent), then `04_policies_new_roles.sql` for the health-table policies.
5. **Confirm email-confirmation policy in dashboard** — Auth → Settings. If on, update `AuthScreen.jsx` to surface "check your inbox" after `signUp`. If off, document that.
6. **Add an explicit `subjects` / `sections` read policy for `anon`** — these are reference data the UI needs before login (e.g., to render the section dropdown on AuthScreen sign-up). Currently anon gets 0 rows back, which means any pre-login UI that depends on them silently breaks. Either keep auth-required and gate those screens, or `create policy "subjects_anon_read" for select to anon using (true)`.
7. **Stop importing mock data in `Teachers.jsx`, `Alerts.jsx`, `Predictive.jsx`, `Academics.jsx`, `Attendance.jsx`, `HealthRecords.jsx`** — replace with `useData()` consumption. Today the production build still ships the 382-student mock and renders it instead of the live data for those views.
8. **Add error-boundary / empty-state UI** — when `fetchAlerts` returns `[]` because the user is anon, the dashboard currently silently renders nothing instead of prompting sign-in.

## Verified Working (do NOT redo)

- All 12 base tables present, columns match `01_schema.sql`, seed counts as expected (382/8/10696/11460/382/20).
- `v_student_overview` returns 382 sensibly-joined rows in 380–470 ms.
- `v_enrollment` view exists and is queryable.
- Migration `02_policies.sql` is applied: every base table has RLS enabled, anon INSERTs are blocked, anon table SELECTs return 0 rows.
- Migration 03's `profiles.role` check expansion + helper functions are applied (signup with `role:'teacher'` works).
- `handle_new_user` trigger fires correctly; `full_name` and `role` from `raw_user_meta_data` end up in the `profiles` row.
- `signInWithPassword` + `getSession` round-trip produces a valid session.
- `auth.admin.deleteUser` cleanly cascades and removes the matching `profiles` row.
- All `dataService.js` queries execute without PostgREST errors and within performance budget (no query > 700 ms).
- The four current `fetchX` functions return data shapes that match what `DataContext.jsx` and the views consuming `useData()` expect (`Students`, `Dashboard`, `Enrollment`, `MyProgress`, `HealthRecords`).

---

## Notes on test methodology

- `DATABASE_URL` in `.env` is **rotated/invalid** — direct Postgres connections (`pg.Client`) get `password authentication failed for user "postgres"` against both port 5432 and 6543 of the pooler. RLS state could not be queried directly from `pg_class`, so it was inferred from anon vs service-role row-count deltas. The conclusions are sound (anon=0 + svc=N + RLS-policy-error on insert is unambiguous), but if you want the literal `relrowsecurity` flag you'll need to rotate the DB password and re-run.
- `scripts/smoke-test.js` is idempotent; re-runs cleanly delete the test user. Email rate limit on the project is already exhausted (`email rate limit exceeded` on the first run), so the test now uses `auth.admin.createUser` as a fallback to keep validating the trigger + signIn flow.
- Service role calls in this script bypass RLS by design — they're how we measure the "true" row counts to compare against the anon view.
