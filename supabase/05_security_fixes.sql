-- supabase/05_security_fixes.sql
-- Recreate v_student_overview with security_invoker = on so the view respects
-- the caller's RLS policies instead of the view-owner's privileges. Without this,
-- anon-key users can read all student PII via the view.

drop view if exists public.v_student_overview cascade;

create view public.v_student_overview
  with (security_invoker = on)
as
select
  s.id,
  s.lrn,
  s.full_name,
  s.gender,
  s.age,
  s.household_income,
  s.parent_involvement,
  sec.grade_level,
  sec.name as section_name,
  coalesce(att.attendance_pct, 0) as attendance_pct,
  coalesce(att.tardiness_count, 0) as tardiness_count,
  coalesce(g.average_grade, 0) as average_grade,
  p.risk_score,
  p.risk_level,
  p.projected_average,
  p.failing_subjects
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
