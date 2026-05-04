# Bagong Ilog ES Dashboard v2 — Design Spec

**Date:** 2026-05-04
**Status:** Approved (Tier 1 + Tier 2)
**Author:** Brainstormed with the user via superpowers/brainstorming
**Implementation:** To be planned via superpowers/writing-plans

---

## 1. Context & Problem

The repo at this commit has a working but incomplete React + Supabase school dashboard:

- **Stack:** Vite + React 18 + Tailwind 3 + Recharts + Supabase JS 2.45 + lucide-react
- **Data:** 382 students, 8 teachers, 10,696 grades, 11,460 attendance rows, 382 risk predictions, 20 alerts (seeded by `scripts/seed.js`)
- **Deployed:** Vercel project `miguelicous-projects/multi-purpose-school-management`, GitHub `MiguelMarcelo25/Multi-Purpose-School-Management`
- **Database:** Supabase project `xvwnuqlxttwhkwdmtlqu` (ap-southeast-2), schema applied 01–04, RLS enabled

A backend smoke test (`scripts/smoke-test.js`, report at `docs/smoke-test-report.md`) found three categories of issue:

1. **One critical security leak**: `v_student_overview` view bypasses RLS and exposes full student PII (name, LRN, age, household income, risk score) to anyone with the publishable key, including unauthenticated visitors to the public Vercel URL.
2. **One missing migration**: `health_records`, `immunizations`, `clinic_visits` tables from `03_roles_and_health.sql` were never applied.
3. **Six views still using mock data** instead of the live Supabase service: Teachers, Alerts, Predictive, Academics, Attendance, HealthRecords. Two more views (Reports, Settings) are cosmetic stubs.

The user also reports the existing UI is "boring" and asked for a professional but warm redesign suitable for principals and teachers using the dashboard for hours per day.

## 2. Decisions

### 2.1 Visual style — "warm education, refined"

Selected from a 4-option visual companion comparison: minimal SaaS (A), polished premium (B), government/serious (C), warm education (D). User picked **D**, then immediately flagged eye strain on the saturated yellow/orange palette, so D was iterated to a refined version: warm character carried by hue (warm off-whites, warm grays, terracotta accent) rather than saturation (no yellow surfaces, no gradients).

**Reference look-and-feel:** Substack, Things 3, Craft.do, Are.na — warm and humane, not loud.

### 2.2 Layout — sidebar + KPI grid

Selected from a 2-option visual companion comparison: classic sidebar (1) vs hero + quick actions (2). User picked **1** in the refined palette. Familiar admin pattern: persistent 200px white left nav with grouped sections, content area starts with a 4-card KPI row, then a 2:1 chart-to-list row.

### 2.3 Scope tier — Tier 1 + Tier 2

User approved combined T1 (required) + T2 (important). T3 (polish) is explicitly out of scope for this spec.

### 2.4 Implementation strategy — five parallel agents

User explicitly requested multi-agent execution. Work is split so dependencies fan out: SECURITY and DESIGN-SYS agents run first with no React dependencies; once DESIGN-SYS finishes, three VIEWS agents wire/restyle the 11 views in parallel using the shared components.

---

## 3. Visual System

### 3.1 Color tokens

```css
:root {
  /* Surfaces */
  --bi-bg:        #faf9f6;  /* page background — warm off-white */
  --bi-card:      #ffffff;  /* card surfaces */
  --bi-tint:      #f5f1ea;  /* section tints, active nav, hover */
  --bi-border:    #e8e4dc;  /* all borders */

  /* Text */
  --bi-text:      #1c1917;  /* primary — warm near-black */
  --bi-text-soft: #57534e;  /* secondary */
  --bi-text-mute: #a8a29e;  /* tertiary, labels */
  --bi-text-on-primary: #ffffff;

  /* Brand accent (terracotta — warm, low fatigue) */
  --bi-primary:      #b45309;
  --bi-primary-hover:#92400e;
  --bi-primary-soft: #fed7aa;  /* peach for subtle bg fills */

  /* Semantic */
  --bi-good:      #15803d;  /* positive trend */
  --bi-good-soft: #d1fae5;
  --bi-warn:      #b45309;  /* warning (reuses brand) */
  --bi-warn-soft: #fef3c7;
  --bi-bad:       #b91c1c;  /* danger / risk */
  --bi-bad-soft:  #fee2e2;
}
```

These will be added to `tailwind.config.js` as theme extensions so existing `bg-`, `text-`, `border-` utilities work with the new palette.

### 3.2 Typography

- **Family:** Inter (already loaded in `index.html`). No second family.
- **Scale:**

| Class | Size | Line | Weight | Use |
|---|---|---|---|---|
| `text-xs` | 11px | 16px | 500–600 | labels, meta |
| `text-sm` | 12px | 18px | 500 | body small, button |
| `text-base` | 13px | 20px | 500 | default body |
| `text-lg` | 16px | 22px | 600 | section heading |
| `text-xl` | 18px | 24px | 700 | page subtitle |
| `text-2xl` | 22px | 28px | 700 | KPI value |
| `text-3xl` | 28px | 32px | 700 | page title |

Letter spacing: `-0.01em` on text-lg+, `-0.02em` on text-2xl+.
Numbers (KPI values, table cells) get `tabular-nums` for vertical alignment.

### 3.3 Spacing & shape

- **Radii:** 6px buttons, 8–10px cards, 99px pills/badges, 4px inputs.
- **Shadows:** none on default state. Hover: `0 1px 2px rgba(0,0,0,0.04)`. Modals only get larger shadows.
- **Spacing scale:** Tailwind defaults (4/8/12/16/20/24/32). Card padding: 14–18px. Grid gaps: 10–12px.
- **Borders:** all 1px solid `--bi-border`. The single visible accent in the system is the **3px left stripe** on the sidebar's active nav item and the dashboard hero — this is the brand signature.

### 3.4 Iconography

- Continue using `lucide-react` (already a dependency). No emoji in the production UI; emoji were only used in the brainstorm mockups.
- Icon sizes: 14px (inline), 16px (nav), 20px (KPI/header), 28px (empty state hero).
- Icon color: inherit text color by default. `--bi-primary` on accent icons.

---

## 4. Component Library (new, shared)

These ship in `src/components/ui/` and are the only way the views render their pieces. Built once by the DESIGN-SYS agent, reused by all VIEWS agents.

### 4.1 `KPICard`
```tsx
<KPICard
  label="Students"
  value={382}
  trend={{ direction: "up", text: "↑ 4.2% term", tone: "good" }}
  icon={Users}
  emphasis="default" | "danger"
/>
```
- 12px padding, white card, 1px border. Label is `text-xs` uppercase mute. Value is `text-2xl` semibold. Trend is `text-xs`.
- `emphasis="danger"` makes the value `--bi-bad`.

### 4.2 `ChartCard`
```tsx
<ChartCard title="Attendance · last 30 days" subtitle="Daily present rate">
  <BarChart data={...} />  {/* recharts */}
</ChartCard>
```
- 14px padding, white card. Recharts uses `--bi-primary-soft` and `--bi-primary` for bars.

### 4.3 `AlertItem`
```tsx
<AlertItem
  severity="High" | "Medium" | "Low"
  studentName="Allan Rosario"
  type="Attendance"
  detectedAt="2026-05-02"
  onClick={() => ...}
/>
```
- Inline row: severity pill (8px tall, color from semantic palette), name, type. Hover: tint background.

### 4.4 `NavItem`
```tsx
<NavItem icon={Home} label="Dashboard" active onClick={...} />
```
- Active gets the 3px terracotta left stripe and tint background. Inactive: plain.

### 4.5 `PageHeader`
```tsx
<PageHeader title="Student Management" subtitle="Browse and review individual records" actions={...} />
```
- Uses `text-3xl` title. Optional right-aligned action buttons.

### 4.6 `EmptyState`, `LoadingState`, `ErrorState`
- Centered, icon + message + optional action button.
- `LoadingState` uses skeleton boxes (not spinners) where the result will land — for KPI grids, table rows, etc.
- `ErrorState` shows `--bi-bad-soft` background, the error message, and a "Retry" button.

### 4.7 `DataTable`
```tsx
<DataTable
  columns={[
    { key: 'lrn', header: 'LRN' },
    { key: 'full_name', header: 'Name' },
    { key: 'risk', header: 'Risk', render: (r) => <RiskBadge level={r.risk.level} /> }
  ]}
  rows={students}
  onRowClick={(row) => ...}
  searchable
  pageSize={25}
/>
```
- Used by Students, Teachers, HealthRecords, Enrollment views.
- Sticky header, zebra-striping disabled (use border-bottom only), client-side search/sort/paginate.

### 4.8 `Sidebar`
- Replaces existing `src/components/Sidebar.jsx`. 200px wide, white background, grouped sections via the `NavItem` group label pattern.

**Group structure** (matches current ROLE_VIEWS in App.jsx):
```
Overview
  · Dashboard
  · Students
  · Predictive
Records
  · Academics
  · Attendance
  · Health
Manage
  · Enrollment
  · Teachers
  · Alerts
  · Reports
System
  · Settings
```
Items hidden per-role per the existing `ROLE_VIEWS` map in `App.jsx:37`. Group labels hide if all their children are hidden.

---

## 5. Layout System

### 5.1 App shell

```
┌──────────┬────────────────────────────────────────┐
│ Sidebar  │ TopBar (PageHeader)                    │
│ 200px    ├────────────────────────────────────────┤
│ white    │ <Page content>                         │
│          │   - KPI row (4 cards)                  │
│          │   - 2:1 row (chart : list)             │
│          │   - secondary content                  │
│          │                                        │
└──────────┴────────────────────────────────────────┘
```
Background: `--bi-bg`. Content area max-width: none (fluid). Padding: 22px 24px.

### 5.2 Mobile (Tier 2 #11)

Below 768px: sidebar collapses to a drawer (hamburger in TopBar). Content gets full width with 16px padding.

---

## 6. Backend Changes

### 6.1 SECURITY — `supabase/05_security_fixes.sql` (new file)

```sql
-- Recreate v_student_overview with security_invoker so it respects caller's RLS.
drop view if exists public.v_student_overview cascade;

create view public.v_student_overview
  with (security_invoker = on)
as
select
  s.id, s.lrn, s.full_name, s.gender, s.age,
  s.household_income, s.parent_involvement,
  sec.grade_level, sec.name as section_name,
  coalesce(att.attendance_pct, 0) as attendance_pct,
  coalesce(att.tardiness_count, 0) as tardiness_count,
  coalesce(g.average_grade, 0) as average_grade,
  p.risk_score, p.risk_level, p.projected_average, p.failing_subjects
from public.students s
left join public.enrollments e on e.student_id = s.id and e.school_year = '2025-2026'
left join public.sections sec on sec.id = e.section_id
left join lateral (
  select round(100.0 * count(*) filter (where status='present')::numeric / nullif(count(*),0), 1) as attendance_pct,
         count(*) filter (where status='tardy') as tardiness_count
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

-- Grant the view to authenticated and anon (RLS on underlying tables enforces access).
grant select on public.v_student_overview to anon, authenticated;
```

**Verification:** post-apply, `node scripts/smoke-test.js` should report anon SELECT on `v_student_overview` returns 0 rows.

### 6.2 MISSING TABLES — `supabase/06_health_tables.sql` (new file)

Re-extract from `03_roles_and_health.sql` the three CREATE TABLE statements that were never applied: `health_records`, `immunizations`, `clinic_visits`. Apply once. Idempotent via `create table if not exists`.

(Exact DDL is whatever `03_roles_and_health.sql` defines for those tables — the SECURITY agent will read the file and copy the relevant statements verbatim, wrapped in `if not exists`.)

### 6.3 SEED `teacher_sections` — `scripts/seed-teacher-sections.js` (new)

For each of the 8 seeded teachers, assign 1–2 sections by matching `teachers.primary_subject_id` to a sensible grade level. Insert into `teacher_sections`. This unblocks teacher logins (RLS uses `my_section_ids()` to scope teacher visibility).

---

## 7. Per-View Wiring Spec

**Definitions:**
- **Restyle** = replace inline JSX/Tailwind with the new components from §4 + tokens from §3. No behavior change. No data-source change.
- **Wire** = add a `fetchX` function to `dataService.js`, expose it via `DataContext.jsx`, replace the view's `import {...} from '../data/mockData.js'` with `useData()`, and route the same shape through the components.
- A view marked **Wire + Restyle** does both.

Each row: what the view needs, current state, what changes.

| View | File | Data needed | Currently | Action |
|---|---|---|---|---|
| Dashboard | `src/views/Dashboard.jsx` | KPIs, attendance trend, alerts list | Live | Restyle |
| Students | `src/views/Students.jsx` | `v_student_overview` rows | Live | Restyle (use `DataTable`) |
| Predictive | `src/views/Predictive.jsx` | predictions joined to students | **Mock** | Wire + Restyle |
| Academics | `src/views/Academics.jsx` | grades aggregated by subject/grade-level | **Mock** | Wire + Restyle |
| Attendance | `src/views/Attendance.jsx` | attendance % over time, by section | **Mock** | Wire + Restyle |
| Health | `src/views/HealthRecords.jsx` | `health_records`, `immunizations`, `clinic_visits` | **Mock + tables missing** | (SECURITY agent applies tables) → Wire + Restyle |
| Teachers | `src/views/Teachers.jsx` | teachers + sections + students taught | **Mock** | Wire + Restyle |
| Enrollment | `src/views/Enrollment.jsx` | enrollments + section rosters | Live | Restyle |
| Alerts | `src/views/Alerts.jsx` | alerts + student joins | **Mock** | Wire + Restyle |
| Reports | `src/views/Reports.jsx` | aggregated metrics for export | **Stub** | Build from scratch (T2 #7) |
| Settings | `src/views/Settings.jsx` | school profile, model config | **Stub** | Build from scratch (T2 #8) |
| MyProgress | `src/views/MyProgress.jsx` | logged-in student's own grades + attendance | Live | Restyle |
| AuthScreen | `src/views/AuthScreen.jsx` | n/a | Live | Restyle (T2 #9) |

For each view that wires new data: extend `src/services/dataService.js` with the corresponding `fetchX` function. Extend `src/context/DataContext.jsx` to expose it. Add empty/loading/error states using the new components.

---

## 8. Parallel Agent Plan

### 8.1 Wave 1 (no dependencies, run concurrently)

**Agent SECURITY** — backend safety
- Apply `05_security_fixes.sql` and `06_health_tables.sql` to Supabase
- Run `seed-teacher-sections.js`
- Re-run `scripts/smoke-test.js`, confirm zero anon-readable PII rows
- Reports back with: `docs/smoke-test-report-after.md`

**Agent DESIGN-SYS** — shared components
- Add color tokens to `tailwind.config.js`
- Create `src/components/ui/` with the 8 components in §4
- Stories/visual smoke tests in `src/components/ui/__previews__/` (a single `Preview.jsx` page renders one of each so we can eyeball them)
- Reports back with: list of created files + a screenshot URL of the preview page

### 8.2 Wave 2 (depends on DESIGN-SYS finishing)

**Agent VIEWS-A** — Teachers, Predictive, Academics
- For each view: add `fetchX` in `dataService.js`, expose in `DataContext.jsx`, replace mock import with `useData()`, restyle using new components
- Verify in dev server that data flows live

**Agent VIEWS-B** — Alerts, Attendance, HealthRecords
- Same pattern as VIEWS-A
- HealthRecords depends on SECURITY agent finishing the missing tables

**Agent VIEWS-C** — Dashboard, Students, Enrollment, MyProgress, AuthScreen
- Already wired to live data; just restyle
- AuthScreen restyle is T2 #9

### 8.3 Coordination

- All agents work on **separate files** to avoid merge conflicts: SECURITY only touches `supabase/` and `scripts/`; DESIGN-SYS only adds to `src/components/ui/` + `tailwind.config.js`; VIEWS-A/B/C touch separate views and only one shared file (`dataService.js` + `DataContext.jsx`).
- For `dataService.js` and `DataContext.jsx` (the only contention point): each VIEWS agent appends its `fetchX` function and context export at the end of the file, no rearranging. Conflicts get resolved manually if any.
- Each agent reports done with a short status. The coordinator (main session) integrates and re-runs smoke test + manual UI walkthrough.

### 8.4 Wave 3 (sequential — depends on Wave 2)

After all VIEWS agents land:
- T2 #10: pass empty/loading/error states everywhere
- T2 #11: mobile responsive sidebar drawer
- Final smoke test + Vercel deploy

---

## 9. Definition of Done

A T1+T2 release is "done" when:

1. ✅ `node scripts/smoke-test.js` passes 100% — anon reads 0 rows from sensitive tables, all expected tables exist, signup→login→fetch flow works.
2. ✅ Each of the 11 views renders with live Supabase data when signed in as Administrator.
3. ✅ Each view has empty/loading/error states.
4. ✅ Sidebar is grouped (Overview / Records / Manage / System) and respects ROLE_VIEWS.
5. ✅ Mobile (<768px) shows a drawer-nav.
6. ✅ `npm run build` produces a clean production bundle.
7. ✅ Vercel preview deploy of the branch loads without errors and matches local dev.
8. ✅ `git diff` against `main` is reviewable as a single PR (or 2–3 PRs split by agent if too large).

## 10. Out of Scope

Tier 3 items, intentionally deferred:

- Page transitions and micro-animations
- Full WCAG 2.1 AA accessibility audit (basic contrast and keyboard nav covered, formal audit deferred)
- Print-friendly Reports
- Internationalization (Tagalog/English toggle)
- Real ML model — risk scores still come from `computeRisk()` heuristic in `mockData.js`, just persisted to the `predictions` table

These can become Tier 3 spec(s) later.

---

## 11. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Multi-agent file conflicts on `dataService.js` / `DataContext.jsx` | Strict append-only contract per §8.3; coordinator resolves |
| Style D refined doesn't actually feel "warm" once applied at scale | DESIGN-SYS agent ships preview page first; user can veto before VIEWS agents kick off |
| Email rate limit on Supabase blocks new test users | Use `admin.createUser` (service_role) for any test accounts during dev |
| RLS policies break a view we haven't tested | Smoke test runs after each agent, not just at the end |
| Recharts color overrides fight the new tokens | DESIGN-SYS agent wraps recharts in `ChartCard` with explicit color props |

---

## 12. Sequence Recap

```
Now → Write implementation plan (writing-plans skill)
    → User approves plan
    → Wave 1: SECURITY + DESIGN-SYS in parallel (~15–20 min)
    → User reviews DESIGN-SYS preview page; vetoes or proceeds
    → Wave 2: VIEWS-A + VIEWS-B + VIEWS-C in parallel (~20–30 min)
    → Wave 3: empty/loading states + mobile responsive (~15 min, sequential)
    → Final smoke test, build, Vercel deploy (~5 min)
    → Done. Demo URL ready for the principal/teachers.
```

Estimated wall-clock: **60–90 min** with parallelism vs ~4 hours sequential.
