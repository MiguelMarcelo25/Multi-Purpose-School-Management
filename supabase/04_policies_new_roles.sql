-- =====================================================================
-- Migration 04 — RLS policies for principal, nurse, student roles
-- and for new health tables.
-- Run AFTER 03_roles_and_health.sql.
-- =====================================================================

-- Enable RLS on the new tables
alter table public.health_records enable row level security;
alter table public.immunizations  enable row level security;
alter table public.clinic_visits  enable row level security;

-- ---------------------------------------------------------------------
-- PRINCIPAL — read all academic + operational data, no destructive writes
-- ---------------------------------------------------------------------
create policy "principal_read_students"     on public.students     for select using (public.is_principal());
create policy "principal_read_enrollments"  on public.enrollments  for select using (public.is_principal());
create policy "principal_read_grades"       on public.grades       for select using (public.is_principal());
create policy "principal_read_attendance"   on public.attendance   for select using (public.is_principal());
create policy "principal_read_predictions"  on public.predictions  for select using (public.is_principal());
create policy "principal_read_alerts"       on public.alerts       for select using (public.is_principal());
create policy "principal_read_interventions"on public.interventions for select using (public.is_principal());
create policy "principal_resolve_alerts"    on public.alerts       for update using (public.is_principal())
  with check (public.is_principal());

-- ---------------------------------------------------------------------
-- NURSE — read all students (basic), full CRUD on health tables
-- ---------------------------------------------------------------------
create policy "nurse_read_students" on public.students for select using (public.is_nurse());

create policy "health_records_admin_read"  on public.health_records for select using (public.is_admin_or_principal());
create policy "health_records_nurse_all"   on public.health_records for all
  using (public.is_nurse()) with check (public.is_nurse());
create policy "health_records_parent_read" on public.health_records for select using (
  exists (select 1 from public.students s where s.id = health_records.student_id and s.parent_id = auth.uid())
);
create policy "health_records_student_read" on public.health_records for select using (
  student_id = public.my_student_id()
);

create policy "immunizations_admin_read"  on public.immunizations for select using (public.is_admin_or_principal());
create policy "immunizations_nurse_all"   on public.immunizations for all
  using (public.is_nurse()) with check (public.is_nurse());
create policy "immunizations_parent_read" on public.immunizations for select using (
  exists (select 1 from public.students s where s.id = immunizations.student_id and s.parent_id = auth.uid())
);
create policy "immunizations_student_read" on public.immunizations for select using (
  student_id = public.my_student_id()
);

create policy "clinic_admin_read"  on public.clinic_visits for select using (public.is_admin_or_principal());
create policy "clinic_nurse_all"   on public.clinic_visits for all
  using (public.is_nurse()) with check (public.is_nurse());
create policy "clinic_parent_read" on public.clinic_visits for select using (
  exists (select 1 from public.students s where s.id = clinic_visits.student_id and s.parent_id = auth.uid())
);
create policy "clinic_student_read" on public.clinic_visits for select using (
  student_id = public.my_student_id()
);

-- ---------------------------------------------------------------------
-- STUDENT — read only own data
-- ---------------------------------------------------------------------
create policy "students_self_read" on public.students for select using (
  id = public.my_student_id()
);

create policy "enrollments_student_read" on public.enrollments for select using (
  student_id = public.my_student_id()
);

create policy "grades_student_read" on public.grades for select using (
  student_id = public.my_student_id()
);

create policy "attendance_student_read" on public.attendance for select using (
  student_id = public.my_student_id()
);

create policy "predictions_student_read" on public.predictions for select using (
  student_id = public.my_student_id()
);

create policy "alerts_student_read" on public.alerts for select using (
  student_id = public.my_student_id()
);
