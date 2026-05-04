-- supabase/07_health_rls_and_cache_reload.sql
-- Two fixes in one file:
--   1. Force PostgREST to reload its schema cache so the health tables
--      created by 06_health_tables.sql become visible to the API.
--   2. Enable RLS + add policies for health_records, immunizations,
--      clinic_visits (06 only created tables, no policies).

-- =====================================================================
-- 1) Enable Row Level Security (defaults to deny-all without policies)
-- =====================================================================
alter table public.health_records enable row level security;
alter table public.immunizations  enable row level security;
alter table public.clinic_visits  enable row level security;

-- =====================================================================
-- 2) Helper functions exist from 03_roles_and_health.sql:
--    is_admin_or_principal(), is_nurse(), is_student(), my_student_id()
--    Plus from 02_policies.sql: is_admin(), is_teacher(), is_parent(),
--    my_section_ids(), my_children_ids()
-- =====================================================================

-- ---------------------------------------------------------------------
-- health_records policies
-- ---------------------------------------------------------------------
drop policy if exists health_records_admin_all       on public.health_records;
drop policy if exists health_records_nurse_all       on public.health_records;
drop policy if exists health_records_teacher_read    on public.health_records;
drop policy if exists health_records_parent_read     on public.health_records;
drop policy if exists health_records_student_read    on public.health_records;

create policy health_records_admin_all on public.health_records
  for all using (public.is_admin_or_principal()) with check (public.is_admin_or_principal());

create policy health_records_nurse_all on public.health_records
  for all using (public.is_nurse()) with check (public.is_nurse());

create policy health_records_teacher_read on public.health_records
  for select using (
    public.is_teacher()
    and student_id in (
      select e.student_id from public.enrollments e
      where e.section_id = any(public.my_section_ids())
    )
  );

create policy health_records_parent_read on public.health_records
  for select using (
    public.is_parent()
    and student_id = any(public.my_children_ids())
  );

create policy health_records_student_read on public.health_records
  for select using (public.is_student() and student_id = public.my_student_id());

-- ---------------------------------------------------------------------
-- immunizations policies (same shape as health_records)
-- ---------------------------------------------------------------------
drop policy if exists immunizations_admin_all     on public.immunizations;
drop policy if exists immunizations_nurse_all     on public.immunizations;
drop policy if exists immunizations_teacher_read  on public.immunizations;
drop policy if exists immunizations_parent_read   on public.immunizations;
drop policy if exists immunizations_student_read  on public.immunizations;

create policy immunizations_admin_all on public.immunizations
  for all using (public.is_admin_or_principal()) with check (public.is_admin_or_principal());

create policy immunizations_nurse_all on public.immunizations
  for all using (public.is_nurse()) with check (public.is_nurse());

create policy immunizations_teacher_read on public.immunizations
  for select using (
    public.is_teacher()
    and student_id in (
      select e.student_id from public.enrollments e
      where e.section_id = any(public.my_section_ids())
    )
  );

create policy immunizations_parent_read on public.immunizations
  for select using (
    public.is_parent()
    and student_id = any(public.my_children_ids())
  );

create policy immunizations_student_read on public.immunizations
  for select using (public.is_student() and student_id = public.my_student_id());

-- ---------------------------------------------------------------------
-- clinic_visits policies (same shape)
-- ---------------------------------------------------------------------
drop policy if exists clinic_visits_admin_all     on public.clinic_visits;
drop policy if exists clinic_visits_nurse_all     on public.clinic_visits;
drop policy if exists clinic_visits_teacher_read  on public.clinic_visits;
drop policy if exists clinic_visits_parent_read   on public.clinic_visits;
drop policy if exists clinic_visits_student_read  on public.clinic_visits;

create policy clinic_visits_admin_all on public.clinic_visits
  for all using (public.is_admin_or_principal()) with check (public.is_admin_or_principal());

create policy clinic_visits_nurse_all on public.clinic_visits
  for all using (public.is_nurse()) with check (public.is_nurse());

create policy clinic_visits_teacher_read on public.clinic_visits
  for select using (
    public.is_teacher()
    and student_id in (
      select e.student_id from public.enrollments e
      where e.section_id = any(public.my_section_ids())
    )
  );

create policy clinic_visits_parent_read on public.clinic_visits
  for select using (
    public.is_parent()
    and student_id = any(public.my_children_ids())
  );

create policy clinic_visits_student_read on public.clinic_visits
  for select using (public.is_student() and student_id = public.my_student_id());

-- =====================================================================
-- 3) Reload PostgREST schema cache so the new tables become visible
--    via the REST API. (Supabase listens for this notification.)
-- =====================================================================
notify pgrst, 'reload schema';
