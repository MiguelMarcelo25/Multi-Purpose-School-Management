-- =====================================================================
-- supabase/08_apply_policies.sql
-- Self-contained, idempotent re-application of every RLS policy needed
-- by the dashboard. Created 2026-05-04 after the audit discovered that
-- 02_policies.sql and 04_policies_new_roles.sql were never fully applied
-- to the live database — RLS was enabled but no admin/principal/teacher
-- policies existed, so signed-in admins saw 0 rows on every table.
--
-- HOW TO RUN: Paste the entire file into Supabase Dashboard → SQL Editor
-- → New query → Run. Safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0) Backfill missing schema additions from 03_roles_and_health.sql
--    (audit found students.profile_id was never added, so the
--    my_student_id() helper below would error otherwise).
-- ---------------------------------------------------------------------
alter table public.students add column if not exists profile_id uuid references public.profiles(id) on delete set null;
create index if not exists students_profile_id_idx on public.students(profile_id);

-- Expand profiles.role check to allow the new roles (idempotent).
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('admin','principal','teacher','nurse','parent','student'));

-- ---------------------------------------------------------------------
-- 1) Enable RLS on every table the dashboard reads
-- ---------------------------------------------------------------------
alter table public.profiles         enable row level security;
alter table public.subjects         enable row level security;
alter table public.sections         enable row level security;
alter table public.teachers         enable row level security;
alter table public.teacher_sections enable row level security;
alter table public.students         enable row level security;
alter table public.enrollments      enable row level security;
alter table public.grades           enable row level security;
alter table public.attendance       enable row level security;
alter table public.predictions      enable row level security;
alter table public.interventions    enable row level security;
alter table public.alerts           enable row level security;
alter table public.health_records   enable row level security;
alter table public.immunizations    enable row level security;
alter table public.clinic_visits    enable row level security;

-- ---------------------------------------------------------------------
-- 2) Helper functions (re-create idempotently — security definer so
--    they can read public.profiles even when called from a policy that
--    is filtering public.profiles itself)
-- ---------------------------------------------------------------------
create or replace function public.is_admin() returns boolean as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false);
$$ language sql stable security definer;

create or replace function public.is_teacher() returns boolean as $$
  select coalesce((select role = 'teacher' from public.profiles where id = auth.uid()), false);
$$ language sql stable security definer;

create or replace function public.is_principal() returns boolean as $$
  select coalesce((select role = 'principal' from public.profiles where id = auth.uid()), false);
$$ language sql stable security definer;

create or replace function public.is_nurse() returns boolean as $$
  select coalesce((select role = 'nurse' from public.profiles where id = auth.uid()), false);
$$ language sql stable security definer;

create or replace function public.is_admin_or_principal() returns boolean as $$
  select coalesce((select role in ('admin','principal') from public.profiles where id = auth.uid()), false);
$$ language sql stable security definer;

create or replace function public.my_student_id() returns uuid as $$
  select id from public.students where profile_id = auth.uid() limit 1;
$$ language sql stable security definer;

create or replace function public.my_section_ids() returns setof int as $$
  select ts.section_id
  from public.teacher_sections ts
  join public.teachers t on t.id = ts.teacher_id
  where t.profile_id = auth.uid();
$$ language sql stable security definer;

-- ---------------------------------------------------------------------
-- 3) Drop+recreate every policy. Using DROP IF EXISTS keeps it idempotent
--    and avoids "already exists" errors when this file is re-run.
-- ---------------------------------------------------------------------

-- profiles ------------------------------------------------------------
drop policy if exists profiles_self_read   on public.profiles;
drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_self_read on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy profiles_admin_write on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- subjects ------------------------------------------------------------
drop policy if exists subjects_read  on public.subjects;
drop policy if exists subjects_admin on public.subjects;
create policy subjects_read  on public.subjects for select using (auth.role() = 'authenticated');
create policy subjects_admin on public.subjects for all using (public.is_admin()) with check (public.is_admin());

-- sections ------------------------------------------------------------
drop policy if exists sections_read  on public.sections;
drop policy if exists sections_admin on public.sections;
create policy sections_read  on public.sections for select using (auth.role() = 'authenticated');
create policy sections_admin on public.sections for all using (public.is_admin()) with check (public.is_admin());

-- teachers ------------------------------------------------------------
drop policy if exists teachers_read  on public.teachers;
drop policy if exists teachers_admin on public.teachers;
create policy teachers_read  on public.teachers for select using (auth.role() = 'authenticated');
create policy teachers_admin on public.teachers for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists ts_read  on public.teacher_sections;
drop policy if exists ts_admin on public.teacher_sections;
create policy ts_read  on public.teacher_sections for select using (auth.role() = 'authenticated');
create policy ts_admin on public.teacher_sections for all using (public.is_admin()) with check (public.is_admin());

-- students ------------------------------------------------------------
drop policy if exists students_admin             on public.students;
drop policy if exists students_teacher_read      on public.students;
drop policy if exists students_parent_read       on public.students;
drop policy if exists nurse_read_students        on public.students;
drop policy if exists principal_read_students    on public.students;
drop policy if exists students_self_read         on public.students;
create policy students_admin             on public.students for all    using (public.is_admin()) with check (public.is_admin());
create policy principal_read_students    on public.students for select using (public.is_principal());
create policy nurse_read_students        on public.students for select using (public.is_nurse());
create policy students_teacher_read      on public.students for select using (
  public.is_teacher() and exists (
    select 1 from public.enrollments e
    where e.student_id = students.id and e.section_id in (select public.my_section_ids())
  )
);
create policy students_parent_read       on public.students for select using (parent_id = auth.uid());
create policy students_self_read         on public.students for select using (id = public.my_student_id());

-- enrollments ---------------------------------------------------------
drop policy if exists enrollments_admin            on public.enrollments;
drop policy if exists enrollments_teacher_read     on public.enrollments;
drop policy if exists enrollments_parent_read      on public.enrollments;
drop policy if exists principal_read_enrollments   on public.enrollments;
drop policy if exists enrollments_student_read     on public.enrollments;
create policy enrollments_admin            on public.enrollments for all    using (public.is_admin()) with check (public.is_admin());
create policy principal_read_enrollments   on public.enrollments for select using (public.is_principal());
create policy enrollments_teacher_read     on public.enrollments for select using (
  public.is_teacher() and section_id in (select public.my_section_ids())
);
create policy enrollments_parent_read      on public.enrollments for select using (
  exists (select 1 from public.students s where s.id = enrollments.student_id and s.parent_id = auth.uid())
);
create policy enrollments_student_read     on public.enrollments for select using (student_id = public.my_student_id());

-- grades --------------------------------------------------------------
drop policy if exists grades_admin            on public.grades;
drop policy if exists grades_teacher_read     on public.grades;
drop policy if exists grades_teacher_write    on public.grades;
drop policy if exists grades_teacher_update   on public.grades;
drop policy if exists grades_parent_read      on public.grades;
drop policy if exists principal_read_grades   on public.grades;
drop policy if exists grades_student_read     on public.grades;
create policy grades_admin            on public.grades for all    using (public.is_admin()) with check (public.is_admin());
create policy principal_read_grades   on public.grades for select using (public.is_principal());
create policy grades_teacher_read     on public.grades for select using (
  public.is_teacher() and exists (
    select 1 from public.enrollments e
    where e.student_id = grades.student_id and e.section_id in (select public.my_section_ids())
  )
);
create policy grades_teacher_write    on public.grades for insert with check (
  public.is_teacher() and exists (
    select 1 from public.enrollments e
    where e.student_id = grades.student_id and e.section_id in (select public.my_section_ids())
  )
);
create policy grades_teacher_update   on public.grades for update using (
  public.is_teacher() and exists (
    select 1 from public.enrollments e
    where e.student_id = grades.student_id and e.section_id in (select public.my_section_ids())
  )
);
create policy grades_parent_read      on public.grades for select using (
  exists (select 1 from public.students s where s.id = grades.student_id and s.parent_id = auth.uid())
);
create policy grades_student_read     on public.grades for select using (student_id = public.my_student_id());

-- attendance ----------------------------------------------------------
drop policy if exists attendance_admin            on public.attendance;
drop policy if exists attendance_teacher_read     on public.attendance;
drop policy if exists attendance_teacher_write    on public.attendance;
drop policy if exists attendance_teacher_update   on public.attendance;
drop policy if exists attendance_parent_read      on public.attendance;
drop policy if exists principal_read_attendance   on public.attendance;
drop policy if exists attendance_student_read     on public.attendance;
create policy attendance_admin            on public.attendance for all    using (public.is_admin()) with check (public.is_admin());
create policy principal_read_attendance   on public.attendance for select using (public.is_principal());
create policy attendance_teacher_read     on public.attendance for select using (
  public.is_teacher() and exists (
    select 1 from public.enrollments e
    where e.student_id = attendance.student_id and e.section_id in (select public.my_section_ids())
  )
);
create policy attendance_teacher_write    on public.attendance for insert with check (
  public.is_teacher() and exists (
    select 1 from public.enrollments e
    where e.student_id = attendance.student_id and e.section_id in (select public.my_section_ids())
  )
);
create policy attendance_teacher_update   on public.attendance for update using (
  public.is_teacher() and exists (
    select 1 from public.enrollments e
    where e.student_id = attendance.student_id and e.section_id in (select public.my_section_ids())
  )
);
create policy attendance_parent_read      on public.attendance for select using (
  exists (select 1 from public.students s where s.id = attendance.student_id and s.parent_id = auth.uid())
);
create policy attendance_student_read     on public.attendance for select using (student_id = public.my_student_id());

-- predictions ---------------------------------------------------------
drop policy if exists predictions_admin           on public.predictions;
drop policy if exists predictions_teacher_read    on public.predictions;
drop policy if exists predictions_parent_read     on public.predictions;
drop policy if exists principal_read_predictions  on public.predictions;
drop policy if exists predictions_student_read    on public.predictions;
create policy predictions_admin           on public.predictions for all    using (public.is_admin()) with check (public.is_admin());
create policy principal_read_predictions  on public.predictions for select using (public.is_principal());
create policy predictions_teacher_read    on public.predictions for select using (
  public.is_teacher() and exists (
    select 1 from public.enrollments e
    where e.student_id = predictions.student_id and e.section_id in (select public.my_section_ids())
  )
);
create policy predictions_parent_read     on public.predictions for select using (
  exists (select 1 from public.students s where s.id = predictions.student_id and s.parent_id = auth.uid())
);
create policy predictions_student_read    on public.predictions for select using (student_id = public.my_student_id());

-- interventions -------------------------------------------------------
drop policy if exists interventions_admin           on public.interventions;
drop policy if exists interventions_teacher_read    on public.interventions;
drop policy if exists principal_read_interventions  on public.interventions;
create policy interventions_admin           on public.interventions for all    using (public.is_admin()) with check (public.is_admin());
create policy principal_read_interventions  on public.interventions for select using (public.is_principal());
create policy interventions_teacher_read    on public.interventions for select using (
  public.is_teacher() and exists (
    select 1 from public.enrollments e
    where e.student_id = interventions.student_id and e.section_id in (select public.my_section_ids())
  )
);

-- alerts --------------------------------------------------------------
drop policy if exists alerts_admin             on public.alerts;
drop policy if exists alerts_teacher_read      on public.alerts;
drop policy if exists alerts_parent_read       on public.alerts;
drop policy if exists principal_read_alerts    on public.alerts;
drop policy if exists principal_resolve_alerts on public.alerts;
drop policy if exists alerts_student_read      on public.alerts;
create policy alerts_admin             on public.alerts for all    using (public.is_admin()) with check (public.is_admin());
create policy principal_read_alerts    on public.alerts for select using (public.is_principal());
create policy principal_resolve_alerts on public.alerts for update using (public.is_principal()) with check (public.is_principal());
create policy alerts_teacher_read      on public.alerts for select using (
  public.is_teacher() and exists (
    select 1 from public.enrollments e
    where e.student_id = alerts.student_id and e.section_id in (select public.my_section_ids())
  )
);
create policy alerts_parent_read       on public.alerts for select using (
  exists (select 1 from public.students s where s.id = alerts.student_id and s.parent_id = auth.uid())
);
create policy alerts_student_read      on public.alerts for select using (student_id = public.my_student_id());

-- health_records ------------------------------------------------------
drop policy if exists health_records_admin_all     on public.health_records;
drop policy if exists health_records_admin_read    on public.health_records;
drop policy if exists health_records_nurse_all     on public.health_records;
drop policy if exists health_records_parent_read   on public.health_records;
drop policy if exists health_records_student_read  on public.health_records;
create policy health_records_admin_all     on public.health_records for all    using (public.is_admin_or_principal()) with check (public.is_admin_or_principal());
create policy health_records_nurse_all     on public.health_records for all    using (public.is_nurse()) with check (public.is_nurse());
create policy health_records_parent_read   on public.health_records for select using (
  exists (select 1 from public.students s where s.id = health_records.student_id and s.parent_id = auth.uid())
);
create policy health_records_student_read  on public.health_records for select using (student_id = public.my_student_id());

-- immunizations -------------------------------------------------------
drop policy if exists immunizations_admin_all     on public.immunizations;
drop policy if exists immunizations_admin_read    on public.immunizations;
drop policy if exists immunizations_nurse_all     on public.immunizations;
drop policy if exists immunizations_parent_read   on public.immunizations;
drop policy if exists immunizations_student_read  on public.immunizations;
create policy immunizations_admin_all     on public.immunizations for all    using (public.is_admin_or_principal()) with check (public.is_admin_or_principal());
create policy immunizations_nurse_all     on public.immunizations for all    using (public.is_nurse()) with check (public.is_nurse());
create policy immunizations_parent_read   on public.immunizations for select using (
  exists (select 1 from public.students s where s.id = immunizations.student_id and s.parent_id = auth.uid())
);
create policy immunizations_student_read  on public.immunizations for select using (student_id = public.my_student_id());

-- clinic_visits -------------------------------------------------------
drop policy if exists clinic_visits_admin_all on public.clinic_visits;
drop policy if exists clinic_admin_read       on public.clinic_visits;
drop policy if exists clinic_nurse_all        on public.clinic_visits;
drop policy if exists clinic_parent_read      on public.clinic_visits;
drop policy if exists clinic_student_read     on public.clinic_visits;
create policy clinic_visits_admin_all on public.clinic_visits for all    using (public.is_admin_or_principal()) with check (public.is_admin_or_principal());
create policy clinic_nurse_all        on public.clinic_visits for all    using (public.is_nurse()) with check (public.is_nurse());
create policy clinic_parent_read      on public.clinic_visits for select using (
  exists (select 1 from public.students s where s.id = clinic_visits.student_id and s.parent_id = auth.uid())
);
create policy clinic_student_read     on public.clinic_visits for select using (student_id = public.my_student_id());

-- ---------------------------------------------------------------------
-- 4) Recreate v_student_overview with security_invoker so it respects
--    the caller's RLS instead of the view-owner's privileges.
-- ---------------------------------------------------------------------
drop view if exists public.v_student_overview cascade;
create view public.v_student_overview
  with (security_invoker = on)
as
select
  s.id, s.lrn, s.full_name, s.gender, s.age,
  s.household_income, s.parent_involvement,
  sec.grade_level, sec.name as section_name,
  coalesce(att.attendance_pct, 0)  as attendance_pct,
  coalesce(att.tardiness_count, 0) as tardiness_count,
  coalesce(g.average_grade, 0)     as average_grade,
  p.risk_score, p.risk_level, p.projected_average, p.failing_subjects
from public.students s
left join public.enrollments e on e.student_id = s.id and e.school_year = '2025-2026'
left join public.sections sec on sec.id = e.section_id
left join lateral (
  select
    round(100.0 * count(*) filter (where status = 'present')::numeric / nullif(count(*),0), 1) as attendance_pct,
    count(*) filter (where status = 'tardy') as tardiness_count
  from public.attendance a where a.student_id = s.id
) att on true
left join lateral (
  select round(avg(grade)::numeric, 2) as average_grade
  from public.grades g where g.student_id = s.id and g.school_year = '2025-2026'
) g on true
left join lateral (
  select * from public.predictions p2
  where p2.student_id = s.id
  order by p2.computed_at desc
  limit 1
) p on true
where s.active = true;

grant select on public.v_student_overview to anon, authenticated;

-- ---------------------------------------------------------------------
-- 5) Reload PostgREST schema cache so new policies and the recreated
--    view become visible to the REST API immediately.
-- ---------------------------------------------------------------------
notify pgrst, 'reload schema';
