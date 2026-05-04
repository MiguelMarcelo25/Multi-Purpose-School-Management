-- supabase/07_health_rls_and_cache_reload.sql
-- Self-contained — does NOT depend on 02_policies.sql or 03_roles_and_health.sql
-- having been applied (audit revealed those helper functions are missing on
-- the live DB even though those files exist in the repo).
--
-- This file:
--   1. Defines the two helper functions we actually need (idempotent).
--   2. Enables RLS on the three health tables created by 06.
--   3. Adds admin-only policies (sufficient until non-admin roles are in use).
--   4. Reloads PostgREST schema cache so the new tables and functions become
--      visible to the REST API.

-- =====================================================================
-- 1) Helper functions (idempotent — safe to re-run)
-- =====================================================================
create or replace function public.is_admin() returns boolean as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false);
$$ language sql stable security definer;

create or replace function public.is_admin_or_principal() returns boolean as $$
  select coalesce((select role in ('admin','principal') from public.profiles where id = auth.uid()), false);
$$ language sql stable security definer;

-- =====================================================================
-- 2) Enable Row Level Security (deny-all by default — only policies grant access)
-- =====================================================================
alter table public.health_records enable row level security;
alter table public.immunizations  enable row level security;
alter table public.clinic_visits  enable row level security;

-- =====================================================================
-- 3) Admin/principal full-access policies
-- =====================================================================
drop policy if exists health_records_admin_all on public.health_records;
create policy health_records_admin_all on public.health_records
  for all using (public.is_admin_or_principal()) with check (public.is_admin_or_principal());

drop policy if exists immunizations_admin_all on public.immunizations;
create policy immunizations_admin_all on public.immunizations
  for all using (public.is_admin_or_principal()) with check (public.is_admin_or_principal());

drop policy if exists clinic_visits_admin_all on public.clinic_visits;
create policy clinic_visits_admin_all on public.clinic_visits
  for all using (public.is_admin_or_principal()) with check (public.is_admin_or_principal());

-- =====================================================================
-- 4) Reload PostgREST schema cache
-- =====================================================================
notify pgrst, 'reload schema';
