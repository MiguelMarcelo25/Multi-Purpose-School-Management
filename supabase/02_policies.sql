-- =====================================================================
-- Row Level Security (RLS) policies
-- Roles: admin (full access), teacher (own sections), parent (own child)
-- Run AFTER 01_schema.sql
-- =====================================================================

-- Enable RLS on all tables
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

-- ---------------------------------------------------------------------
-- Helper function: returns the role of the current user
-- ---------------------------------------------------------------------
create or replace function public.current_role() returns text as $$
  select role from public.profiles where id = auth.uid();
$$ language sql stable security definer;

create or replace function public.is_admin() returns boolean as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false);
$$ language sql stable security definer;

create or replace function public.is_teacher() returns boolean as $$
  select coalesce((select role = 'teacher' from public.profiles where id = auth.uid()), false);
$$ language sql stable security definer;

-- Returns section IDs the calling teacher handles
create or replace function public.my_section_ids() returns setof int as $$
  select ts.section_id
  from public.teacher_sections ts
  join public.teachers t on t.id = ts.teacher_id
  where t.profile_id = auth.uid();
$$ language sql stable security definer;

-- ---------------------------------------------------------------------
-- profiles : everyone can read their own; admin reads all
-- ---------------------------------------------------------------------
create policy "profiles_self_read" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

create policy "profiles_admin_write" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- Reference tables (subjects, sections) : readable by anyone authenticated
-- ---------------------------------------------------------------------
create policy "subjects_read" on public.subjects for select using (auth.role() = 'authenticated');
create policy "sections_read" on public.sections for select using (auth.role() = 'authenticated');
create policy "subjects_admin" on public.subjects for all using (public.is_admin()) with check (public.is_admin());
create policy "sections_admin" on public.sections for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- teachers : readable by all authenticated; writable by admin
-- ---------------------------------------------------------------------
create policy "teachers_read"  on public.teachers for select using (auth.role() = 'authenticated');
create policy "teachers_admin" on public.teachers for all using (public.is_admin()) with check (public.is_admin());

create policy "ts_read"  on public.teacher_sections for select using (auth.role() = 'authenticated');
create policy "ts_admin" on public.teacher_sections for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- students : admin all, teacher reads own sections, parent reads own child
-- ---------------------------------------------------------------------
create policy "students_admin" on public.students for all using (public.is_admin()) with check (public.is_admin());

create policy "students_teacher_read" on public.students for select using (
  public.is_teacher() and exists (
    select 1 from public.enrollments e
    where e.student_id = students.id and e.section_id in (select public.my_section_ids())
  )
);

create policy "students_parent_read" on public.students for select using (
  parent_id = auth.uid()
);

-- ---------------------------------------------------------------------
-- enrollments : same access pattern as students
-- ---------------------------------------------------------------------
create policy "enrollments_admin" on public.enrollments for all using (public.is_admin()) with check (public.is_admin());

create policy "enrollments_teacher_read" on public.enrollments for select using (
  public.is_teacher() and section_id in (select public.my_section_ids())
);

create policy "enrollments_parent_read" on public.enrollments for select using (
  exists (select 1 from public.students s where s.id = enrollments.student_id and s.parent_id = auth.uid())
);

-- ---------------------------------------------------------------------
-- grades : admin all; teacher read+write for own sections; parent read own child
-- ---------------------------------------------------------------------
create policy "grades_admin" on public.grades for all using (public.is_admin()) with check (public.is_admin());

create policy "grades_teacher_read" on public.grades for select using (
  public.is_teacher() and exists (
    select 1 from public.enrollments e
    where e.student_id = grades.student_id and e.section_id in (select public.my_section_ids())
  )
);

create policy "grades_teacher_write" on public.grades for insert with check (
  public.is_teacher() and exists (
    select 1 from public.enrollments e
    where e.student_id = grades.student_id and e.section_id in (select public.my_section_ids())
  )
);

create policy "grades_teacher_update" on public.grades for update using (
  public.is_teacher() and exists (
    select 1 from public.enrollments e
    where e.student_id = grades.student_id and e.section_id in (select public.my_section_ids())
  )
);

create policy "grades_parent_read" on public.grades for select using (
  exists (select 1 from public.students s where s.id = grades.student_id and s.parent_id = auth.uid())
);

-- ---------------------------------------------------------------------
-- attendance : same pattern as grades
-- ---------------------------------------------------------------------
create policy "attendance_admin" on public.attendance for all using (public.is_admin()) with check (public.is_admin());

create policy "attendance_teacher_read" on public.attendance for select using (
  public.is_teacher() and exists (
    select 1 from public.enrollments e
    where e.student_id = attendance.student_id and e.section_id in (select public.my_section_ids())
  )
);

create policy "attendance_teacher_write" on public.attendance for insert with check (
  public.is_teacher() and exists (
    select 1 from public.enrollments e
    where e.student_id = attendance.student_id and e.section_id in (select public.my_section_ids())
  )
);

create policy "attendance_teacher_update" on public.attendance for update using (
  public.is_teacher() and exists (
    select 1 from public.enrollments e
    where e.student_id = attendance.student_id and e.section_id in (select public.my_section_ids())
  )
);

create policy "attendance_parent_read" on public.attendance for select using (
  exists (select 1 from public.students s where s.id = attendance.student_id and s.parent_id = auth.uid())
);

-- ---------------------------------------------------------------------
-- predictions : admin all; teacher read own sections; parent read own child
-- ---------------------------------------------------------------------
create policy "predictions_admin" on public.predictions for all using (public.is_admin()) with check (public.is_admin());

create policy "predictions_teacher_read" on public.predictions for select using (
  public.is_teacher() and exists (
    select 1 from public.enrollments e
    where e.student_id = predictions.student_id and e.section_id in (select public.my_section_ids())
  )
);

create policy "predictions_parent_read" on public.predictions for select using (
  exists (select 1 from public.students s where s.id = predictions.student_id and s.parent_id = auth.uid())
);

-- ---------------------------------------------------------------------
-- interventions
-- ---------------------------------------------------------------------
create policy "interventions_admin" on public.interventions for all using (public.is_admin()) with check (public.is_admin());

create policy "interventions_teacher_read" on public.interventions for select using (
  public.is_teacher() and exists (
    select 1 from public.enrollments e
    where e.student_id = interventions.student_id and e.section_id in (select public.my_section_ids())
  )
);

-- ---------------------------------------------------------------------
-- alerts
-- ---------------------------------------------------------------------
create policy "alerts_admin" on public.alerts for all using (public.is_admin()) with check (public.is_admin());

create policy "alerts_teacher_read" on public.alerts for select using (
  public.is_teacher() and exists (
    select 1 from public.enrollments e
    where e.student_id = alerts.student_id and e.section_id in (select public.my_section_ids())
  )
);

create policy "alerts_parent_read" on public.alerts for select using (
  exists (select 1 from public.students s where s.id = alerts.student_id and s.parent_id = auth.uid())
);
