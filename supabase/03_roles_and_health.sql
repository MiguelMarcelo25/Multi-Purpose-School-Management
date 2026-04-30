-- =====================================================================
-- Migration 03 — Add principal/nurse/student roles, health records,
-- enrollment helpers, and link profiles to students.
-- Run AFTER 01_schema.sql and 02_policies.sql.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Expand role check on profiles
-- ---------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('admin','principal','teacher','nurse','parent','student'));

-- Allow a student account to be linked to a student record
alter table public.students add column if not exists profile_id uuid references public.profiles(id) on delete set null;
create index if not exists students_profile_id_idx on public.students(profile_id);

-- ---------------------------------------------------------------------
-- health_records : one row per student, updated as nurse re-measures
-- ---------------------------------------------------------------------
create table if not exists public.health_records (
  id              serial primary key,
  student_id      uuid not null references public.students(id) on delete cascade,
  measured_on     date not null default current_date,
  height_cm       numeric(5,2),
  weight_kg       numeric(5,2),
  bmi             numeric(5,2) generated always as (
                    case when height_cm is null or height_cm = 0 then null
                         else round((weight_kg / ((height_cm/100.0) * (height_cm/100.0)))::numeric, 2)
                    end
                  ) stored,
  bmi_category    text,                       -- e.g., 'Normal','Wasted','Overweight'
  blood_type      text,
  allergies       text,
  medical_conditions text,
  vision          text,                        -- e.g., '20/20'
  hearing         text,
  notes           text,
  recorded_by     uuid references public.profiles(id) on delete set null,
  created_at      timestamptz default now()
);
create index if not exists health_records_student_idx on public.health_records(student_id, measured_on desc);

-- ---------------------------------------------------------------------
-- immunizations : DepEd-required vaccines per student
-- ---------------------------------------------------------------------
create table if not exists public.immunizations (
  id           serial primary key,
  student_id   uuid not null references public.students(id) on delete cascade,
  vaccine      text not null,             -- e.g., 'BCG','MMR','HPV','COVID-19'
  dose_number  int default 1,
  administered_on date,
  status       text default 'completed' check (status in ('completed','pending','overdue','exempt')),
  notes        text,
  recorded_by  uuid references public.profiles(id) on delete set null,
  created_at   timestamptz default now()
);
create index if not exists immunizations_student_idx on public.immunizations(student_id);

-- ---------------------------------------------------------------------
-- clinic_visits : log of visits to the school clinic
-- ---------------------------------------------------------------------
create table if not exists public.clinic_visits (
  id           serial primary key,
  student_id   uuid not null references public.students(id) on delete cascade,
  visit_date   timestamptz not null default now(),
  reason       text not null,
  treatment    text,
  sent_home    boolean default false,
  notes        text,
  recorded_by  uuid references public.profiles(id) on delete set null
);
create index if not exists clinic_visits_student_idx on public.clinic_visits(student_id, visit_date desc);

-- ---------------------------------------------------------------------
-- Helper view: enrollment overview for the Enrollment screen
-- ---------------------------------------------------------------------
create or replace view public.v_enrollment as
select
  e.id            as enrollment_id,
  e.school_year,
  s.id            as student_id,
  s.lrn,
  s.full_name,
  s.gender,
  s.age,
  sec.id          as section_id,
  sec.grade_level,
  sec.name        as section_name,
  s.enrolled_year,
  s.active
from public.enrollments e
join public.students s on s.id = e.student_id
join public.sections sec on sec.id = e.section_id;

-- ---------------------------------------------------------------------
-- Helper functions for new roles
-- ---------------------------------------------------------------------
create or replace function public.is_principal() returns boolean as $$
  select coalesce((select role = 'principal' from public.profiles where id = auth.uid()), false);
$$ language sql stable security definer;

create or replace function public.is_nurse() returns boolean as $$
  select coalesce((select role = 'nurse' from public.profiles where id = auth.uid()), false);
$$ language sql stable security definer;

create or replace function public.is_student() returns boolean as $$
  select coalesce((select role = 'student' from public.profiles where id = auth.uid()), false);
$$ language sql stable security definer;

-- Returns the student.id linked to the calling student account
create or replace function public.my_student_id() returns uuid as $$
  select id from public.students where profile_id = auth.uid() limit 1;
$$ language sql stable security definer;

-- Returns true for any role that should see administrative read access
-- (admin or principal). Useful for shared "read all" policies.
create or replace function public.is_admin_or_principal() returns boolean as $$
  select coalesce((select role in ('admin','principal') from public.profiles where id = auth.uid()), false);
$$ language sql stable security definer;
