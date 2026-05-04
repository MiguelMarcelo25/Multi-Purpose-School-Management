-- =====================================================================
-- supabase/09_fix_rls_recursion.sql
-- Breaks the infinite-recursion loop in RLS policies that 08 introduced.
--
-- THE BUG (caught at runtime by Postgres):
--   "infinite recursion detected in policy for relation 'enrollments'"
--
-- ROOT CAUSE: bidirectional table queries inside policies.
--   students_teacher_read   queries enrollments
--   enrollments_parent_read queries students
--   → evaluating one triggers RLS on the other → cycle.
--
-- FIX: wrap the cross-table checks in SECURITY DEFINER helper functions.
-- A security-definer function executes with the function-owner's privileges
-- (postgres, which has BYPASSRLS). Inside the function, the cross-table
-- query bypasses RLS, so the policy doesn't recurse back.
--
-- HOW TO RUN: Paste into Supabase Dashboard → SQL Editor → Run.
-- Idempotent and safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Recursion-safe helper functions
-- ---------------------------------------------------------------------

-- True iff the given student belongs to the calling user's children.
create or replace function public.is_my_child(child_id uuid) returns boolean as $$
  select exists (
    select 1 from public.students
    where id = child_id and parent_id = auth.uid()
  );
$$ language sql stable security definer;

-- True iff the given student is enrolled in any of the calling teacher's sections.
create or replace function public.student_in_my_sections(s_id uuid) returns boolean as $$
  select exists (
    select 1 from public.enrollments e
    where e.student_id = s_id
      and e.section_id in (
        select ts.section_id
        from public.teacher_sections ts
        join public.teachers t on t.id = ts.teacher_id
        where t.profile_id = auth.uid()
      )
  );
$$ language sql stable security definer;

-- ---------------------------------------------------------------------
-- 2) Replace every recursive policy with its non-recursive equivalent.
--    Using DROP IF EXISTS + CREATE so this is idempotent.
-- ---------------------------------------------------------------------

-- ---- students ------------------------------------------------------
drop policy if exists students_teacher_read on public.students;
create policy students_teacher_read on public.students for select using (
  public.is_teacher() and public.student_in_my_sections(students.id)
);

-- ---- enrollments ---------------------------------------------------
drop policy if exists enrollments_teacher_read on public.enrollments;
create policy enrollments_teacher_read on public.enrollments for select using (
  public.is_teacher() and section_id in (
    select ts.section_id
    from public.teacher_sections ts
    join public.teachers t on t.id = ts.teacher_id
    where t.profile_id = auth.uid()
  )
);

drop policy if exists enrollments_parent_read on public.enrollments;
create policy enrollments_parent_read on public.enrollments for select using (
  public.is_my_child(student_id)
);

-- ---- grades --------------------------------------------------------
drop policy if exists grades_teacher_read   on public.grades;
drop policy if exists grades_teacher_write  on public.grades;
drop policy if exists grades_teacher_update on public.grades;
drop policy if exists grades_parent_read    on public.grades;
create policy grades_teacher_read   on public.grades for select using (public.is_teacher() and public.student_in_my_sections(student_id));
create policy grades_teacher_write  on public.grades for insert with check (public.is_teacher() and public.student_in_my_sections(student_id));
create policy grades_teacher_update on public.grades for update using (public.is_teacher() and public.student_in_my_sections(student_id));
create policy grades_parent_read    on public.grades for select using (public.is_my_child(student_id));

-- ---- attendance ----------------------------------------------------
drop policy if exists attendance_teacher_read   on public.attendance;
drop policy if exists attendance_teacher_write  on public.attendance;
drop policy if exists attendance_teacher_update on public.attendance;
drop policy if exists attendance_parent_read    on public.attendance;
create policy attendance_teacher_read   on public.attendance for select using (public.is_teacher() and public.student_in_my_sections(student_id));
create policy attendance_teacher_write  on public.attendance for insert with check (public.is_teacher() and public.student_in_my_sections(student_id));
create policy attendance_teacher_update on public.attendance for update using (public.is_teacher() and public.student_in_my_sections(student_id));
create policy attendance_parent_read    on public.attendance for select using (public.is_my_child(student_id));

-- ---- predictions ---------------------------------------------------
drop policy if exists predictions_teacher_read on public.predictions;
drop policy if exists predictions_parent_read  on public.predictions;
create policy predictions_teacher_read on public.predictions for select using (public.is_teacher() and public.student_in_my_sections(student_id));
create policy predictions_parent_read  on public.predictions for select using (public.is_my_child(student_id));

-- ---- interventions -------------------------------------------------
drop policy if exists interventions_teacher_read on public.interventions;
create policy interventions_teacher_read on public.interventions for select using (public.is_teacher() and public.student_in_my_sections(student_id));

-- ---- alerts --------------------------------------------------------
drop policy if exists alerts_teacher_read on public.alerts;
drop policy if exists alerts_parent_read  on public.alerts;
create policy alerts_teacher_read on public.alerts for select using (public.is_teacher() and public.student_in_my_sections(student_id));
create policy alerts_parent_read  on public.alerts for select using (public.is_my_child(student_id));

-- ---- health_records ------------------------------------------------
drop policy if exists health_records_parent_read on public.health_records;
create policy health_records_parent_read on public.health_records for select using (public.is_my_child(student_id));

-- ---- immunizations -------------------------------------------------
drop policy if exists immunizations_parent_read on public.immunizations;
create policy immunizations_parent_read on public.immunizations for select using (public.is_my_child(student_id));

-- ---- clinic_visits -------------------------------------------------
drop policy if exists clinic_parent_read on public.clinic_visits;
create policy clinic_parent_read on public.clinic_visits for select using (public.is_my_child(student_id));

-- ---------------------------------------------------------------------
-- 3) Reload PostgREST schema cache.
-- ---------------------------------------------------------------------
notify pgrst, 'reload schema';
