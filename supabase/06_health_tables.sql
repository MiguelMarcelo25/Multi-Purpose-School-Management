-- supabase/06_health_tables.sql
-- Re-applies the three health tables from 03_roles_and_health.sql which were
-- never created on the live database. Idempotent — safe to re-run.
-- Definitions copied verbatim from 03_roles_and_health.sql lines 21-73.

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
  bmi_category    text,
  blood_type      text,
  allergies       text,
  medical_conditions text,
  vision          text,
  hearing         text,
  notes           text,
  recorded_by     uuid references public.profiles(id) on delete set null,
  created_at      timestamptz default now()
);
create index if not exists health_records_student_idx on public.health_records(student_id, measured_on desc);

create table if not exists public.immunizations (
  id           serial primary key,
  student_id   uuid not null references public.students(id) on delete cascade,
  vaccine      text not null,
  dose_number  int default 1,
  administered_on date,
  status       text default 'completed' check (status in ('completed','pending','overdue','exempt')),
  notes        text,
  recorded_by  uuid references public.profiles(id) on delete set null,
  created_at   timestamptz default now()
);
create index if not exists immunizations_student_idx on public.immunizations(student_id);

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
