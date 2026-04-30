-- =====================================================================
-- Bagong Ilog Elementary School — Database Schema
-- Run this in the Supabase SQL Editor (SQL Editor → New query → paste → Run)
-- =====================================================================

-- Drop existing (safe to re-run during development)
drop table if exists public.alerts          cascade;
drop table if exists public.interventions   cascade;
drop table if exists public.predictions     cascade;
drop table if exists public.attendance      cascade;
drop table if exists public.grades          cascade;
drop table if exists public.enrollments     cascade;
drop table if exists public.students        cascade;
drop table if exists public.teachers        cascade;
drop table if exists public.subjects        cascade;
drop table if exists public.sections        cascade;
drop table if exists public.profiles        cascade;

-- ---------------------------------------------------------------------
-- profiles : extends auth.users with role
-- ---------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  role        text not null check (role in ('admin','teacher','parent')),
  email       text unique,
  created_at  timestamptz default now()
);

-- ---------------------------------------------------------------------
-- subjects (Filipino, English, Math, Science, AralPan, MAPEH, ESP)
-- ---------------------------------------------------------------------
create table public.subjects (
  id    serial primary key,
  code  text unique not null,
  name  text not null
);

-- ---------------------------------------------------------------------
-- sections (Grade 1 — Sampaguita, etc.)
-- ---------------------------------------------------------------------
create table public.sections (
  id            serial primary key,
  grade_level   int not null check (grade_level between 1 and 6),
  name          text not null,
  school_year   text not null default '2025-2026',
  unique(grade_level, name, school_year)
);

-- ---------------------------------------------------------------------
-- teachers
-- ---------------------------------------------------------------------
create table public.teachers (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid references public.profiles(id) on delete set null,
  employee_no   text unique not null,
  full_name     text not null,
  primary_subject_id int references public.subjects(id),
  years_exp     int default 0,
  rating        numeric(3,2) default 0,
  created_at    timestamptz default now()
);

-- Many-to-many: a teacher handles many sections
create table public.teacher_sections (
  teacher_id  uuid references public.teachers(id) on delete cascade,
  section_id  int  references public.sections(id) on delete cascade,
  primary key (teacher_id, section_id)
);

-- ---------------------------------------------------------------------
-- students
-- ---------------------------------------------------------------------
create table public.students (
  id                 uuid primary key default gen_random_uuid(),
  lrn                text unique not null,            -- DepEd Learner Reference Number
  full_name          text not null,
  gender             char(1) check (gender in ('M','F')),
  birth_date         date,
  age                int,
  guardian_name      text,
  guardian_contact   text,
  address            text,
  household_income   text check (household_income in ('Low','Middle','High')),
  parent_involvement text check (parent_involvement in ('Low','Medium','High')),
  parent_id          uuid references public.profiles(id) on delete set null,
  enrolled_year      int default 2025,
  active             boolean default true,
  created_at         timestamptz default now()
);

-- ---------------------------------------------------------------------
-- enrollments : current/past section assignments
-- ---------------------------------------------------------------------
create table public.enrollments (
  id           serial primary key,
  student_id   uuid references public.students(id) on delete cascade,
  section_id   int  references public.sections(id) on delete cascade,
  school_year  text not null default '2025-2026',
  created_at   timestamptz default now(),
  unique(student_id, school_year)
);

-- ---------------------------------------------------------------------
-- grades : per student per subject per quarter
-- ---------------------------------------------------------------------
create table public.grades (
  id           serial primary key,
  student_id   uuid references public.students(id) on delete cascade,
  subject_id   int  references public.subjects(id) on delete cascade,
  quarter      int not null check (quarter between 1 and 4),
  school_year  text not null default '2025-2026',
  grade        numeric(5,2) not null check (grade between 0 and 100),
  recorded_by  uuid references public.teachers(id) on delete set null,
  created_at   timestamptz default now(),
  unique(student_id, subject_id, quarter, school_year)
);

-- ---------------------------------------------------------------------
-- attendance : daily records
-- ---------------------------------------------------------------------
create table public.attendance (
  id           serial primary key,
  student_id   uuid references public.students(id) on delete cascade,
  date         date not null,
  status       text not null check (status in ('present','absent','tardy','excused')),
  recorded_by  uuid references public.teachers(id) on delete set null,
  created_at   timestamptz default now(),
  unique(student_id, date)
);

-- ---------------------------------------------------------------------
-- predictions : risk scores produced by the model
-- ---------------------------------------------------------------------
create table public.predictions (
  id                  serial primary key,
  student_id          uuid references public.students(id) on delete cascade,
  risk_score          int not null check (risk_score between 0 and 100),
  risk_level          text not null check (risk_level in ('Low','Medium','High')),
  projected_average   numeric(5,2),
  failing_subjects    int default 0,
  model_version       text default 'v2.3',
  computed_at         timestamptz default now()
);
create index on public.predictions (student_id, computed_at desc);

-- ---------------------------------------------------------------------
-- interventions : counselor / teacher actions
-- ---------------------------------------------------------------------
create table public.interventions (
  id            serial primary key,
  student_id    uuid references public.students(id) on delete cascade,
  type          text not null,    -- e.g. 'Tutorial', 'Parent Meeting'
  description   text,
  status        text default 'pending' check (status in ('pending','active','completed','cancelled')),
  assigned_to   uuid references public.teachers(id) on delete set null,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz default now(),
  completed_at  timestamptz
);

-- ---------------------------------------------------------------------
-- alerts : AI-generated warnings
-- ---------------------------------------------------------------------
create table public.alerts (
  id           serial primary key,
  student_id   uuid references public.students(id) on delete cascade,
  type         text not null check (type in ('Attendance','Academic','Tardiness','Behavior')),
  severity     text not null check (severity in ('Low','Medium','High')),
  note         text,
  resolved     boolean default false,
  resolved_at  timestamptz,
  resolved_by  uuid references public.profiles(id) on delete set null,
  created_at   timestamptz default now()
);
create index on public.alerts (resolved, created_at desc);

-- ---------------------------------------------------------------------
-- Helpful aggregate view: latest prediction per student
-- ---------------------------------------------------------------------
create or replace view public.v_student_overview as
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

-- ---------------------------------------------------------------------
-- Auto-create profile row when a new auth user is created
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'parent')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Seed: subjects
insert into public.subjects (code, name) values
  ('FIL','Filipino'),
  ('ENG','English'),
  ('MAT','Math'),
  ('SCI','Science'),
  ('AP','AralPan'),
  ('MAPEH','MAPEH'),
  ('ESP','ESP')
on conflict (code) do nothing;

-- Seed: sections (12 sections, 2 per grade level)
insert into public.sections (grade_level, name, school_year) values
  (1,'Sampaguita','2025-2026'),(1,'Rosal','2025-2026'),
  (2,'Mabini','2025-2026'),(2,'Rizal','2025-2026'),
  (3,'Bonifacio','2025-2026'),(3,'Aguinaldo','2025-2026'),
  (4,'Mahogany','2025-2026'),(4,'Narra','2025-2026'),
  (5,'Saturn','2025-2026'),(5,'Jupiter','2025-2026'),
  (6,'Galileo','2025-2026'),(6,'Newton','2025-2026')
on conflict (grade_level, name, school_year) do nothing;
