# Bagong Ilog ES Dashboard v2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Tier 1 + Tier 2 of the dashboard redesign — fix the `v_student_overview` PII leak, apply missing migration, build a shared component library in the refined warm-education palette, wire 6 mock-data views to live Supabase, build out 2 stub views, and add empty/loading/error states + mobile drawer.

**Architecture:** Six phases. Phase 1 (backend hardening) and Phase 2 (design system) run in parallel — no dependencies between them. Phase 3 (data wiring) and Phase 4 (view migration) depend on Phase 2's component library. Phase 5 polishes empty/loading/error/mobile. Phase 6 verifies and ships.

**Tech Stack:** Vite 5, React 18, Tailwind 3, Supabase JS 2.45, lucide-react, recharts, pg (devDep, for migrations).

**Spec:** [docs/superpowers/specs/2026-05-04-bagong-ilog-dashboard-v2-design.md](../specs/2026-05-04-bagong-ilog-dashboard-v2-design.md)

**Verification approach:** This codebase has no unit-test infrastructure. The de facto integration test is `scripts/smoke-test.js` (backend) + visual inspection of the running dev server (UI). Each task ends with the appropriate verification — running smoke-test, checking the build, or eyeballing a specific URL.

---

## File Structure

**New files (13):**
| Path | Owner | Purpose |
|---|---|---|
| `supabase/05_security_fixes.sql` | Phase 1 | Recreate `v_student_overview` with `security_invoker = on` |
| `supabase/06_health_tables.sql` | Phase 1 | Idempotent CREATE TABLE for the 3 missing health tables |
| `scripts/seed-teacher-sections.js` | Phase 1 | Populate `teacher_sections` so teachers see their assignments |
| `src/components/ui/index.js` | Phase 2 | Re-exports all UI primitives |
| `src/components/ui/KPICard.jsx` | Phase 2 | KPI card primitive |
| `src/components/ui/ChartCard.jsx` | Phase 2 | Chart container primitive |
| `src/components/ui/AlertItem.jsx` | Phase 2 | Alert row primitive |
| `src/components/ui/NavItem.jsx` | Phase 2 | Sidebar nav item with grouping support |
| `src/components/ui/PageHeader.jsx` | Phase 2 | Page title + subtitle + actions |
| `src/components/ui/EmptyState.jsx` | Phase 2 | Empty result placeholder |
| `src/components/ui/LoadingState.jsx` | Phase 2 | Skeleton loader |
| `src/components/ui/ErrorState.jsx` | Phase 2 | Error display with retry |
| `src/components/ui/DataTable.jsx` | Phase 2 | Searchable, sortable, paginated table |
| `src/components/ui/RiskBadge.jsx` | Phase 2 | Reusable risk pill (Low/Medium/High) |
| `src/components/ui/__previews__/Preview.jsx` | Phase 2 | Visual smoke test page |

**Modified files (~15):**
| Path | Owner | Change |
|---|---|---|
| `tailwind.config.js` | Phase 2 | Add color tokens to theme.extend.colors |
| `src/index.css` | Phase 2 | Add CSS custom properties (--bi-*) |
| `src/services/dataService.js` | Phase 3 | Append fetchPredictions, fetchAcademics, fetchAttendance, fetchHealthRecords |
| `src/context/DataContext.jsx` | Phase 3 | Expose new fetches |
| `src/components/Sidebar.jsx` | Phase 4 | Rewrite using NavItem with grouped sections |
| `src/components/TopBar.jsx` | Phase 4 | Use PageHeader |
| `src/views/Dashboard.jsx` | Phase 4 | Restyle |
| `src/views/Students.jsx` | Phase 4 | Restyle, use DataTable |
| `src/views/Predictive.jsx` | Phase 4 | Wire + Restyle |
| `src/views/Academics.jsx` | Phase 4 | Wire + Restyle |
| `src/views/Attendance.jsx` | Phase 4 | Wire + Restyle |
| `src/views/HealthRecords.jsx` | Phase 4 | Wire + Restyle (depends on Phase 1 tables) |
| `src/views/Teachers.jsx` | Phase 4 | Wire + Restyle |
| `src/views/Enrollment.jsx` | Phase 4 | Restyle |
| `src/views/Alerts.jsx` | Phase 4 | Wire + Restyle |
| `src/views/Reports.jsx` | Phase 4 | Build from stub |
| `src/views/Settings.jsx` | Phase 4 | Build from stub |
| `src/views/MyProgress.jsx` | Phase 4 | Restyle |
| `src/views/AuthScreen.jsx` | Phase 4 | Restyle |
| `src/App.jsx` | Phase 5 | Add mobile drawer state |

---

## Phase 1 — Backend Hardening

**Owner:** SECURITY agent (single subagent, can run parallel to Phase 2).
**Estimated wall-clock:** 10-15 min.

### Task 1: Create the `v_student_overview` security fix migration

**Files:**
- Create: `supabase/05_security_fixes.sql`

- [ ] **Step 1: Write the migration**

```sql
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
```

- [ ] **Step 2: Commit (file only, not yet applied)**

```bash
git add supabase/05_security_fixes.sql
git commit -m "Add 05_security_fixes.sql to close v_student_overview RLS bypass"
```

### Task 2: Create the missing health tables migration

**Files:**
- Create: `supabase/06_health_tables.sql`

- [ ] **Step 1: Write the migration**

```sql
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
```

- [ ] **Step 2: Commit**

```bash
git add supabase/06_health_tables.sql
git commit -m "Add 06_health_tables.sql for missing health/immunization/clinic_visits tables"
```

### Task 3: Apply both migrations to Supabase

**Files:** none modified (runs against live DB).

**Prerequisite:** `DATABASE_URL` in `.env` was rotated and is currently invalid. Update it first.

- [ ] **Step 1: Update `.env` with the current database password**

Open Supabase Dashboard → Settings → Database → Connection String (URI tab) → copy the full URL with current password. Paste into `.env`'s `DATABASE_URL` line. Save.

If the user can't find or doesn't want to share the password, fall back to the SQL Editor: open both files and paste each into a new SQL Editor query, run each, confirm "Success. No rows returned." Skip to Task 4.

- [ ] **Step 2: Run apply-migrations.js (only files 05 and 06)**

```bash
# From project root
node -e "
import('./scripts/apply-migrations.js').catch(() => {});
" 2>&1
```

The existing `scripts/apply-migrations.js` runs ALL .sql files in `supabase/`. Since 01-04 have already been applied (and 01 contains DROPs), running it again would wipe data. Instead, run files 05 and 06 manually:

```bash
node -e "
import 'dotenv/config';
import pg from 'pg';
import { readFileSync } from 'node:fs';
const { Client } = pg;
const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
for (const f of ['supabase/05_security_fixes.sql', 'supabase/06_health_tables.sql']) {
  console.log('Applying', f);
  await c.query(readFileSync(f, 'utf8'));
  console.log('  OK');
}
await c.end();
" 2>&1
```

Expected: `Applying supabase/05_security_fixes.sql\n  OK\nApplying supabase/06_health_tables.sql\n  OK`

- [ ] **Step 3: Verify the security fix worked**

```bash
node -e "
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
const c = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const { data, error } = await c.from('v_student_overview').select('*').limit(5);
console.log('Anon read:', error ? error.message : (data?.length || 0) + ' rows (expected 0)');
" 2>&1
```

Expected: `Anon read: 0 rows (expected 0)`

If the result is anything other than `0 rows`, RLS is not yet protecting the view. Investigate before proceeding.

### Task 4: Create the teacher_sections seed script

**Files:**
- Create: `scripts/seed-teacher-sections.js`

- [ ] **Step 1: Write the script**

```js
// scripts/seed-teacher-sections.js
// Assigns each seeded teacher to 1-2 sections so RLS-scoped teacher logins
// can see their students/grades/attendance.
//
// Strategy: each teacher's primary_subject_id implies a grade band (e.g.
// MAPEH teachers handle multiple grades; ESP/Filipino tend to be per grade).
// We just round-robin teachers across the 12 sections, ensuring every
// section gets at least one teacher.

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const c = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const { data: teachers, error: tErr } = await c.from('teachers').select('id, employee_no, full_name');
if (tErr) throw tErr;
const { data: sections, error: sErr } = await c.from('sections').select('id, grade_level, name').order('grade_level');
if (sErr) throw sErr;

console.log(`Found ${teachers.length} teachers, ${sections.length} sections`);

// Clear existing assignments
await c.from('teacher_sections').delete().neq('teacher_id', '00000000-0000-0000-0000-000000000000');

// Round-robin: each section gets a teacher; teachers can repeat
const rows = sections.map((sec, i) => ({
  teacher_id: teachers[i % teachers.length].id,
  section_id: sec.id
}));

const { error: insErr } = await c.from('teacher_sections').insert(rows);
if (insErr) throw insErr;
console.log(`Seeded ${rows.length} teacher_section assignments`);
```

- [ ] **Step 2: Run the seed**

```bash
node scripts/seed-teacher-sections.js
```

Expected: `Found 8 teachers, 12 sections\nSeeded 12 teacher_section assignments`

- [ ] **Step 3: Verify**

```bash
node -e "
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
const c = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { count } = await c.from('teacher_sections').select('*', { count: 'exact', head: true });
console.log(count + ' teacher_section rows');
" 2>&1
```

Expected: `12 teacher_section rows`

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-teacher-sections.js
git commit -m "Seed teacher_sections so teacher RLS scopes resolve"
```

### Task 5: Re-run smoke test, verify backend is green

**Files:** none.

- [ ] **Step 1: Run the existing smoke test**

```bash
node scripts/smoke-test.js
```

Expected: All categories green. Specifically:
- `v_student_overview` accessible to authenticated, returns 0 to anon
- `health_records`, `immunizations`, `clinic_visits` exist
- `teacher_sections` has 12 rows
- All other findings from the original report should now be resolved or marked N/A

- [ ] **Step 2: Save updated report**

```bash
mv docs/smoke-test-report.md docs/smoke-test-report-before.md
node scripts/smoke-test.js > docs/smoke-test-report-after.md 2>&1
git add docs/smoke-test-report-before.md docs/smoke-test-report-after.md
git commit -m "Refresh smoke test report after Phase 1 backend fixes"
```

---

## Phase 2 — Design System

**Owner:** DESIGN-SYS agent (single subagent, can run parallel to Phase 1).
**Estimated wall-clock:** 25-35 min.
**Dependency:** none. Phases 3 and 4 depend on this finishing.

### Task 6: Add color tokens to Tailwind config

**Files:**
- Modify: `tailwind.config.js`

- [ ] **Step 1: Read the current `tailwind.config.js` to find the existing `theme.extend` block**

- [ ] **Step 2: Replace `theme.extend` with the new tokens**

```js
// tailwind.config.js — full file
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bi: {
          bg:        '#faf9f6',
          card:      '#ffffff',
          tint:      '#f5f1ea',
          border:    '#e8e4dc',
          text:      '#1c1917',
          'text-soft': '#57534e',
          'text-mute': '#a8a29e',
          primary:      '#b45309',
          'primary-hover': '#92400e',
          'primary-soft': '#fed7aa',
          good:      '#15803d',
          'good-soft': '#d1fae5',
          warn:      '#b45309',
          'warn-soft': '#fef3c7',
          bad:       '#b91c1c',
          'bad-soft': '#fee2e2'
        },
        // Keep brand-* aliases pointing to bi-primary so existing code doesn't break:
        brand: {
          50:  '#fff7ed',
          100: '#ffedd5',
          300: '#fdba74',
          600: '#b45309',
          700: '#92400e',
          800: '#78350f'
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif']
      }
    }
  },
  plugins: []
}
```

- [ ] **Step 3: Verify the build still compiles**

```bash
npm run build
```

Expected: `✓ built in N.NNs` with no errors. Bundle size may shift slightly.

- [ ] **Step 4: Commit**

```bash
git add tailwind.config.js
git commit -m "Add bi-* warm-education palette tokens to Tailwind"
```

### Task 7: Add CSS custom properties for non-Tailwind use

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Read the current `src/index.css`**

- [ ] **Step 2: Add `:root` block with CSS variables at the top of the file**

```css
/* Add to top of src/index.css, before any @tailwind directives */
:root {
  --bi-bg:        #faf9f6;
  --bi-card:      #ffffff;
  --bi-tint:      #f5f1ea;
  --bi-border:    #e8e4dc;
  --bi-text:      #1c1917;
  --bi-text-soft: #57534e;
  --bi-text-mute: #a8a29e;
  --bi-primary:      #b45309;
  --bi-primary-hover:#92400e;
  --bi-primary-soft: #fed7aa;
  --bi-good:      #15803d;
  --bi-good-soft: #d1fae5;
  --bi-warn:      #b45309;
  --bi-warn-soft: #fef3c7;
  --bi-bad:       #b91c1c;
  --bi-bad-soft:  #fee2e2;
}
body {
  background: var(--bi-bg);
  color: var(--bi-text);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "Expose bi-* tokens as CSS custom properties"
```

### Task 8: Build `KPICard` component

**Files:**
- Create: `src/components/ui/KPICard.jsx`

- [ ] **Step 1: Write the component**

```jsx
// src/components/ui/KPICard.jsx
import { TrendingUp, TrendingDown } from 'lucide-react'

export default function KPICard({ label, value, trend, icon: Icon, emphasis = 'default' }) {
  const valueColor = emphasis === 'danger' ? 'text-bi-bad' : 'text-bi-text'
  const trendColor = trend?.tone === 'good' ? 'text-bi-good' : trend?.tone === 'bad' ? 'text-bi-bad' : 'text-bi-text-mute'
  const TrendIcon = trend?.direction === 'up' ? TrendingUp : trend?.direction === 'down' ? TrendingDown : null

  return (
    <div className="bg-bi-card border border-bi-border rounded-[10px] p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-bi-text-mute uppercase tracking-wider">{label}</span>
        {Icon && <Icon className="w-4 h-4 text-bi-text-mute" />}
      </div>
      <div className={`text-2xl font-bold mt-1 tabular-nums tracking-tight ${valueColor}`}>{value}</div>
      {trend && (
        <div className={`text-xs font-medium mt-0.5 flex items-center gap-1 ${trendColor}`}>
          {TrendIcon && <TrendIcon className="w-3 h-3" />}
          {trend.text}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/KPICard.jsx
git commit -m "Add KPICard primitive"
```

### Task 9: Build `ChartCard` component

**Files:**
- Create: `src/components/ui/ChartCard.jsx`

- [ ] **Step 1: Write the component**

```jsx
// src/components/ui/ChartCard.jsx
export default function ChartCard({ title, subtitle, action, children, className = '' }) {
  return (
    <div className={`bg-bi-card border border-bi-border rounded-[10px] p-[14px] ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-bi-text">{title}</h3>
          {subtitle && <p className="text-xs text-bi-text-mute mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/ChartCard.jsx
git commit -m "Add ChartCard primitive"
```

### Task 10: Build `AlertItem` component

**Files:**
- Create: `src/components/ui/AlertItem.jsx`

- [ ] **Step 1: Write the component**

```jsx
// src/components/ui/AlertItem.jsx
const SEVERITY_STYLES = {
  High:   'bg-bi-bad-soft text-bi-bad',
  Medium: 'bg-bi-warn-soft text-bi-warn',
  Low:    'bg-bi-tint text-bi-text-soft'
}

export default function AlertItem({ severity, studentName, type, detectedAt, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-2 py-2 -mx-2 rounded hover:bg-bi-tint transition-colors text-left border-b border-bi-tint last:border-b-0"
    >
      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${SEVERITY_STYLES[severity] || SEVERITY_STYLES.Low}`}>
        {severity}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-bi-text truncate">{studentName}</div>
        <div className="text-xs text-bi-text-mute">{type}{detectedAt ? ` · ${detectedAt}` : ''}</div>
      </div>
    </button>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/AlertItem.jsx
git commit -m "Add AlertItem primitive"
```

### Task 11: Build `NavItem` and `NavGroup` components

**Files:**
- Create: `src/components/ui/NavItem.jsx`

- [ ] **Step 1: Write both components in one file**

```jsx
// src/components/ui/NavItem.jsx
export function NavGroup({ label, children }) {
  // If all children render null (no permitted items), hide the group label too
  const visibleChildren = Array.isArray(children) ? children.filter(Boolean) : children
  if (!visibleChildren || (Array.isArray(visibleChildren) && visibleChildren.length === 0)) return null
  return (
    <div className="mt-3">
      <div className="text-[10px] font-semibold text-bi-text-mute uppercase tracking-wider px-3 mb-1">
        {label}
      </div>
      {children}
    </div>
  )
}

export default function NavItem({ icon: Icon, label, active, onClick, hidden = false }) {
  if (hidden) return null
  return (
    <button
      onClick={onClick}
      className={`relative w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors text-left
        ${active
          ? 'bg-bi-tint text-bi-text font-semibold'
          : 'text-bi-text-soft hover:bg-bi-tint/60 font-medium'}`}
    >
      {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-bi-primary rounded-r" />}
      {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
      <span className="truncate">{label}</span>
    </button>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/NavItem.jsx
git commit -m "Add NavItem + NavGroup primitives"
```

### Task 12: Build `PageHeader` component

**Files:**
- Create: `src/components/ui/PageHeader.jsx`

- [ ] **Step 1: Write the component**

```jsx
// src/components/ui/PageHeader.jsx
export default function PageHeader({ title, subtitle, actions }) {
  return (
    <header className="flex items-start justify-between mb-5">
      <div>
        <h1 className="text-[28px] font-bold text-bi-text leading-tight tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-bi-text-soft mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </header>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/PageHeader.jsx
git commit -m "Add PageHeader primitive"
```

### Task 13: Build `EmptyState`, `LoadingState`, `ErrorState`

**Files:**
- Create: `src/components/ui/EmptyState.jsx`
- Create: `src/components/ui/LoadingState.jsx`
- Create: `src/components/ui/ErrorState.jsx`

- [ ] **Step 1: Write `EmptyState.jsx`**

```jsx
// src/components/ui/EmptyState.jsx
import { Inbox } from 'lucide-react'

export default function EmptyState({ icon: Icon = Inbox, title = 'Nothing here yet', message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-12 h-12 rounded-full bg-bi-tint flex items-center justify-center text-bi-text-mute mb-3">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-semibold text-bi-text">{title}</h3>
      {message && <p className="text-xs text-bi-text-soft mt-1 max-w-sm">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
```

- [ ] **Step 2: Write `LoadingState.jsx`**

```jsx
// src/components/ui/LoadingState.jsx
export default function LoadingState({ rows = 3, variant = 'rows' }) {
  if (variant === 'kpis') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-bi-card border border-bi-border rounded-[10px] p-3 animate-pulse">
            <div className="h-3 w-16 bg-bi-tint rounded" />
            <div className="h-7 w-20 bg-bi-tint rounded mt-2" />
            <div className="h-3 w-14 bg-bi-tint rounded mt-1" />
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 bg-bi-tint rounded animate-pulse" />
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Write `ErrorState.jsx`**

```jsx
// src/components/ui/ErrorState.jsx
import { AlertTriangle } from 'lucide-react'

export default function ErrorState({ title = 'Something went wrong', message, onRetry }) {
  return (
    <div className="bg-bi-bad-soft border border-bi-bad/20 rounded-[10px] p-4 flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-bi-bad flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <h3 className="text-sm font-semibold text-bi-bad">{title}</h3>
        {message && <p className="text-xs text-bi-bad/90 mt-1">{message}</p>}
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-3 text-xs font-semibold text-bi-bad hover:text-bi-primary-hover underline"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/EmptyState.jsx src/components/ui/LoadingState.jsx src/components/ui/ErrorState.jsx
git commit -m "Add EmptyState, LoadingState, ErrorState primitives"
```

### Task 14: Build `RiskBadge` component

**Files:**
- Create: `src/components/ui/RiskBadge.jsx`

- [ ] **Step 1: Write the component**

```jsx
// src/components/ui/RiskBadge.jsx
const STYLES = {
  Low:    'bg-bi-good-soft text-bi-good',
  Medium: 'bg-bi-warn-soft text-bi-warn',
  High:   'bg-bi-bad-soft text-bi-bad'
}

export default function RiskBadge({ level }) {
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded ${STYLES[level] || STYLES.Low}`}>
      {level}
    </span>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/RiskBadge.jsx
git commit -m "Add RiskBadge primitive"
```

### Task 15: Build `DataTable` component

**Files:**
- Create: `src/components/ui/DataTable.jsx`

- [ ] **Step 1: Write the component**

```jsx
// src/components/ui/DataTable.jsx
import { useMemo, useState } from 'react'
import { Search, ChevronUp, ChevronDown } from 'lucide-react'

export default function DataTable({ columns, rows, onRowClick, searchable = false, pageSize = 25, emptyMessage = 'No rows' }) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState({ key: null, dir: 'asc' })
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    if (!searchable || !search.trim()) return rows
    const q = search.toLowerCase()
    return rows.filter((r) => columns.some((c) => String(r[c.key] ?? '').toLowerCase().includes(q)))
  }, [rows, search, searchable, columns])

  const sorted = useMemo(() => {
    if (!sort.key) return filtered
    const sortedRows = [...filtered].sort((a, b) => {
      const av = a[sort.key], bv = b[sort.key]
      if (av == null) return 1
      if (bv == null) return -1
      if (av < bv) return sort.dir === 'asc' ? -1 : 1
      if (av > bv) return sort.dir === 'asc' ? 1 : -1
      return 0
    })
    return sortedRows
  }, [filtered, sort])

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const pageRows = sorted.slice(page * pageSize, (page + 1) * pageSize)

  function toggleSort(key) {
    setSort((s) => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })
  }

  return (
    <div className="bg-bi-card border border-bi-border rounded-[10px] overflow-hidden">
      {searchable && (
        <div className="p-3 border-b border-bi-border">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-2 text-bi-text-mute" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0) }}
              placeholder="Search..."
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-bi-bg border border-bi-border rounded focus:outline-none focus:border-bi-primary"
            />
          </div>
        </div>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-bi-border bg-bi-bg/50">
            {columns.map((c) => (
              <th key={c.key} className="text-left px-3 py-2 text-xs font-semibold text-bi-text-mute uppercase tracking-wider">
                <button onClick={() => toggleSort(c.key)} className="flex items-center gap-1 hover:text-bi-text">
                  {c.header}
                  {sort.key === c.key && (sort.dir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pageRows.length === 0 ? (
            <tr><td colSpan={columns.length} className="text-center text-bi-text-mute py-8 text-xs">{emptyMessage}</td></tr>
          ) : pageRows.map((r, i) => (
            <tr
              key={i}
              onClick={() => onRowClick?.(r)}
              className={`border-b border-bi-border last:border-b-0 ${onRowClick ? 'cursor-pointer hover:bg-bi-tint' : ''}`}
            >
              {columns.map((c) => (
                <td key={c.key} className="px-3 py-2 text-bi-text">
                  {c.render ? c.render(r) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {pages > 1 && (
        <div className="px-3 py-2 border-t border-bi-border flex items-center justify-between text-xs text-bi-text-mute">
          <span>Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, sorted.length)} of {sorted.length}</span>
          <div className="flex gap-1">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="px-2 py-1 rounded hover:bg-bi-tint disabled:opacity-40">Prev</button>
            <button onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} disabled={page === pages - 1} className="px-2 py-1 rounded hover:bg-bi-tint disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/DataTable.jsx
git commit -m "Add DataTable primitive (search, sort, paginate)"
```

### Task 16: Create the `index.js` barrel export

**Files:**
- Create: `src/components/ui/index.js`

- [ ] **Step 1: Write the re-exports**

```js
// src/components/ui/index.js
export { default as KPICard } from './KPICard.jsx'
export { default as ChartCard } from './ChartCard.jsx'
export { default as AlertItem } from './AlertItem.jsx'
export { default as NavItem, NavGroup } from './NavItem.jsx'
export { default as PageHeader } from './PageHeader.jsx'
export { default as EmptyState } from './EmptyState.jsx'
export { default as LoadingState } from './LoadingState.jsx'
export { default as ErrorState } from './ErrorState.jsx'
export { default as DataTable } from './DataTable.jsx'
export { default as RiskBadge } from './RiskBadge.jsx'
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/index.js
git commit -m "Add ui/index.js barrel"
```

### Task 17: Build the preview page (visual smoke test)

**Files:**
- Create: `src/components/ui/__previews__/Preview.jsx`

- [ ] **Step 1: Write the preview**

```jsx
// src/components/ui/__previews__/Preview.jsx
// Visual smoke test for the new design system. Mount this temporarily by
// editing src/main.jsx to render <Preview /> instead of <App />, then visit
// http://localhost:5173/ and inspect each component.
import { Users, Calendar, BookOpen, AlertTriangle, Home } from 'lucide-react'
import { KPICard, ChartCard, AlertItem, NavItem, NavGroup, PageHeader, EmptyState, LoadingState, ErrorState, DataTable, RiskBadge } from '../index.js'

export default function Preview() {
  return (
    <div className="min-h-screen bg-bi-bg p-8 max-w-6xl mx-auto space-y-8">
      <PageHeader title="Design System Preview" subtitle="One of every primitive — for visual smoke testing" />

      <section>
        <h2 className="text-xs font-semibold text-bi-text-mute uppercase tracking-wider mb-3">KPI Cards</h2>
        <div className="grid grid-cols-4 gap-2.5">
          <KPICard label="Students" value="382" trend={{ direction: 'up', text: '↑ 4.2% term', tone: 'good' }} icon={Users} />
          <KPICard label="Attendance" value="87%" trend={{ direction: 'up', text: '↑ 1.1%', tone: 'good' }} icon={Calendar} />
          <KPICard label="Avg Grade" value="82.4" trend={{ direction: 'up', text: '↑ 0.8', tone: 'good' }} icon={BookOpen} />
          <KPICard label="At Risk" value="20" emphasis="danger" trend={{ direction: 'down', text: '3 fewer', tone: 'good' }} icon={AlertTriangle} />
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2.5">
        <ChartCard title="Sample chart" subtitle="Last 30 days" className="col-span-2">
          <div className="h-32 bg-bi-tint rounded flex items-center justify-center text-bi-text-mute text-xs">recharts goes here</div>
        </ChartCard>
        <ChartCard title="Recent alerts">
          <AlertItem severity="High" studentName="Allan Rosario" type="Attendance" detectedAt="2026-05-02" />
          <AlertItem severity="Medium" studentName="Maria Cruz" type="Academic" detectedAt="2026-05-01" />
          <AlertItem severity="Low" studentName="Juan Dela Cruz" type="Tardiness" detectedAt="2026-04-30" />
        </ChartCard>
      </section>

      <section className="grid grid-cols-3 gap-4">
        <ChartCard title="Empty state"><EmptyState message="No alerts in the last 7 days." /></ChartCard>
        <ChartCard title="Loading state"><LoadingState rows={3} /></ChartCard>
        <ChartCard title="Error state"><ErrorState message="Could not load students." onRetry={() => alert('retry')} /></ChartCard>
      </section>

      <section className="grid grid-cols-2 gap-4">
        <div>
          <h2 className="text-xs font-semibold text-bi-text-mute uppercase tracking-wider mb-3">Nav (sidebar preview)</h2>
          <div className="bg-bi-card border border-bi-border rounded-[10px] p-3 w-56">
            <NavGroup label="Overview">
              <NavItem icon={Home} label="Dashboard" active />
              <NavItem icon={Users} label="Students" />
            </NavGroup>
            <NavGroup label="Records">
              <NavItem icon={Calendar} label="Attendance" />
              <NavItem icon={BookOpen} label="Academics" />
            </NavGroup>
          </div>
        </div>
        <div>
          <h2 className="text-xs font-semibold text-bi-text-mute uppercase tracking-wider mb-3">Risk badges</h2>
          <div className="flex gap-2"><RiskBadge level="Low" /><RiskBadge level="Medium" /><RiskBadge level="High" /></div>
        </div>
      </section>

      <section>
        <h2 className="text-xs font-semibold text-bi-text-mute uppercase tracking-wider mb-3">DataTable</h2>
        <DataTable
          searchable
          pageSize={5}
          columns={[
            { key: 'lrn', header: 'LRN' },
            { key: 'name', header: 'Name' },
            { key: 'grade', header: 'Grade' },
            { key: 'risk', header: 'Risk', render: (r) => <RiskBadge level={r.risk} /> }
          ]}
          rows={[
            { lrn: 'BIES-1001', name: 'Allan Rosario', grade: 'G4 Mahogany', risk: 'High' },
            { lrn: 'BIES-1002', name: 'Maria Cruz', grade: 'G5 Saturn', risk: 'Medium' },
            { lrn: 'BIES-1003', name: 'Juan Dela Cruz', grade: 'G6 Newton', risk: 'Low' }
          ]}
        />
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Visually verify**

Temporarily edit `src/main.jsx`: replace the `<App />` import with `<Preview />`, save, visit `http://localhost:5173/`. Inspect every component. Note any visual issues.

- [ ] **Step 3: Restore `src/main.jsx`** (revert the Preview swap)

- [ ] **Step 4: Commit the preview file**

```bash
git add src/components/ui/__previews__/Preview.jsx
git commit -m "Add design system preview page for visual smoke testing"
```

**🚦 CHECKPOINT: User reviews the preview before Phase 4 starts.** If any component looks wrong, fix it now — restyling 11 views with a broken primitive is much more expensive than fixing the primitive.

---

## Phase 3 — Data Wiring

**Owner:** Single subagent (operates on `dataService.js` + `DataContext.jsx` only).
**Estimated wall-clock:** 15-20 min.
**Dependency:** Phase 1 finished (so health tables exist for fetchHealthRecords).

### Task 18: Add `fetchPredictions` to dataService.js

**Files:**
- Modify: `src/services/dataService.js`

- [ ] **Step 1: Append the function before the `chartData` export**

```js
// Append in src/services/dataService.js, before `export const chartData = ...`

// ---------------------------------------------------------------------
// Predictions (with student joins for the predictive view)
// ---------------------------------------------------------------------
export async function fetchPredictions() {
  if (!isSupabaseConfigured) return MOCK_STUDENTS.map((s) => ({ ...computeRisk(s), studentName: s.name, lrn: s.id }))

  const { data, error } = await supabase
    .from('predictions')
    .select(`
      id, risk_score, risk_level, projected_average, failing_subjects, computed_at,
      student:students(lrn, full_name, gender, age,
        enrollments(section:sections(grade_level, name))
      )
    `)
    .order('risk_score', { ascending: false })

  if (error) throw error
  return data.map((p) => ({
    id: p.id,
    riskScore: p.risk_score,
    riskLevel: p.risk_level,
    projectedAverage: Number(p.projected_average) || 0,
    failingSubjects: p.failing_subjects,
    computedAt: p.computed_at?.slice(0, 10),
    studentName: p.student?.full_name,
    lrn: p.student?.lrn,
    grade: p.student?.enrollments?.[0]?.section?.grade_level,
    section: p.student?.enrollments?.[0]?.section?.name
  }))
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/dataService.js
git commit -m "Add fetchPredictions to dataService"
```

### Task 19: Add `fetchAcademics` to dataService.js

**Files:**
- Modify: `src/services/dataService.js`

- [ ] **Step 1: Append before `chartData`**

```js
// ---------------------------------------------------------------------
// Academics (grade aggregates by subject + grade level)
// ---------------------------------------------------------------------
export async function fetchAcademics() {
  if (!isSupabaseConfigured) return { bySubject: SUBJECT_PERFORMANCE, byGrade: GRADE_PERFORMANCE, honorRoll: [] }

  const { data, error } = await supabase
    .from('grades')
    .select(`
      grade, quarter,
      subject:subjects(name),
      student:students(full_name, lrn,
        enrollments(section:sections(grade_level, name))
      )
    `)
  if (error) throw error

  // Aggregate by subject
  const bySubjectMap = {}
  for (const g of data) {
    const subj = g.subject?.name || 'Unknown'
    bySubjectMap[subj] ??= { subject: subj, sum: 0, count: 0 }
    bySubjectMap[subj].sum += Number(g.grade)
    bySubjectMap[subj].count++
  }
  const bySubject = Object.values(bySubjectMap).map((s) => ({ subject: s.subject, average: Math.round((s.sum / s.count) * 10) / 10 }))

  // Aggregate by grade level
  const byGradeMap = {}
  for (const g of data) {
    const gl = g.student?.enrollments?.[0]?.section?.grade_level
    if (!gl) continue
    byGradeMap[gl] ??= { grade: `Grade ${gl}`, sum: 0, count: 0 }
    byGradeMap[gl].sum += Number(g.grade)
    byGradeMap[gl].count++
  }
  const byGrade = Object.values(byGradeMap).sort((a, b) => a.grade.localeCompare(b.grade))
    .map((g) => ({ grade: g.grade, average: Math.round((g.sum / g.count) * 10) / 10 }))

  // Honor roll: students whose average across all subjects >= 90
  const studentMap = {}
  for (const g of data) {
    const name = g.student?.full_name
    if (!name) continue
    studentMap[name] ??= { name, lrn: g.student.lrn, sum: 0, count: 0 }
    studentMap[name].sum += Number(g.grade)
    studentMap[name].count++
  }
  const honorRoll = Object.values(studentMap)
    .map((s) => ({ name: s.name, lrn: s.lrn, average: Math.round((s.sum / s.count) * 10) / 10 }))
    .filter((s) => s.average >= 90)
    .sort((a, b) => b.average - a.average)

  return { bySubject, byGrade, honorRoll }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/dataService.js
git commit -m "Add fetchAcademics with subject/grade aggregates and honor roll"
```

### Task 20: Add `fetchAttendance` to dataService.js

**Files:**
- Modify: `src/services/dataService.js`

- [ ] **Step 1: Append**

```js
// ---------------------------------------------------------------------
// Attendance (daily aggregates and per-section breakdown)
// ---------------------------------------------------------------------
export async function fetchAttendance() {
  if (!isSupabaseConfigured) return { byDay: ATTENDANCE_BY_MONTH, bySection: [] }

  const { data, error } = await supabase
    .from('attendance')
    .select(`date, status, student:students(enrollments(section:sections(grade_level, name)))`)
    .gte('date', new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10))
  if (error) throw error

  // Daily aggregates
  const byDayMap = {}
  for (const a of data) {
    byDayMap[a.date] ??= { date: a.date, present: 0, total: 0 }
    byDayMap[a.date].total++
    if (a.status === 'present') byDayMap[a.date].present++
  }
  const byDay = Object.values(byDayMap).sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({ date: d.date, attendance_pct: Math.round((d.present / d.total) * 100 * 10) / 10 }))

  // Section aggregates
  const bySectionMap = {}
  for (const a of data) {
    const sec = a.student?.enrollments?.[0]?.section
    if (!sec) continue
    const key = `Grade ${sec.grade_level} ${sec.name}`
    bySectionMap[key] ??= { section: key, present: 0, total: 0 }
    bySectionMap[key].total++
    if (a.status === 'present') bySectionMap[key].present++
  }
  const bySection = Object.values(bySectionMap)
    .map((s) => ({ section: s.section, attendance_pct: Math.round((s.present / s.total) * 100 * 10) / 10 }))
    .sort((a, b) => a.section.localeCompare(b.section))

  return { byDay, bySection }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/dataService.js
git commit -m "Add fetchAttendance with daily and section aggregates"
```

### Task 21: Add `fetchHealthRecords` to dataService.js

**Files:**
- Modify: `src/services/dataService.js`

- [ ] **Step 1: Append. (Health tables come from Phase 1.)**

```js
// ---------------------------------------------------------------------
// Health records (BMI, immunizations, clinic visits)
// ---------------------------------------------------------------------
export async function fetchHealthRecords() {
  if (!isSupabaseConfigured) return { records: [], visits: [] }

  const [recordsRes, visitsRes] = await Promise.all([
    supabase.from('health_records').select('*, student:students(full_name, lrn)').limit(100),
    supabase.from('clinic_visits').select('*, student:students(full_name, lrn)').order('visit_date', { ascending: false }).limit(50)
  ])
  if (recordsRes.error) throw recordsRes.error
  if (visitsRes.error) throw visitsRes.error

  return {
    records: recordsRes.data || [],
    visits: visitsRes.data || []
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/dataService.js
git commit -m "Add fetchHealthRecords pulling from health_records + clinic_visits"
```

### Task 22: Wire all new fetches into DataContext

**Files:**
- Modify: `src/context/DataContext.jsx`

- [ ] **Step 1: Replace the entire file with the expanded version**

```jsx
// src/context/DataContext.jsx — full rewrite
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import {
  fetchStudents, fetchTeachers, fetchAlerts, fetchSchoolMetrics,
  fetchPredictions, fetchAcademics, fetchAttendance, fetchHealthRecords,
  chartData, dataMode
} from '../services/dataService.js'

const DataContext = createContext(null)
export const useData = () => useContext(DataContext)

const INITIAL = {
  loading: true,
  error: null,
  students: [],
  teachers: [],
  alerts: [],
  metrics: null,
  predictions: [],
  academics: { bySubject: [], byGrade: [], honorRoll: [] },
  attendance: { byDay: [], bySection: [] },
  healthRecords: { records: [], visits: [] },
  charts: chartData,
  mode: dataMode
}

export function DataProvider({ children }) {
  const [state, setState] = useState(INITIAL)

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const [students, teachers, alerts, metrics, predictions, academics, attendance, healthRecords] = await Promise.all([
        fetchStudents(),
        fetchTeachers(),
        fetchAlerts(),
        fetchSchoolMetrics(),
        fetchPredictions(),
        fetchAcademics(),
        fetchAttendance(),
        fetchHealthRecords()
      ])
      setState((s) => ({
        ...s,
        loading: false,
        students, teachers, alerts, metrics,
        predictions, academics, attendance, healthRecords
      }))
    } catch (err) {
      console.error('Data load failed', err)
      setState((s) => ({ ...s, loading: false, error: err.message || 'Failed to load data' }))
    }
  }, [])

  useEffect(() => { load() }, [load])

  return <DataContext.Provider value={{ ...state, retry: load }}>{children}</DataContext.Provider>
}
```

Note: this version adds a `retry` function exposed to consumers — `<ErrorState onRetry={retry} />` works in every view.

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -10
```

Expected: clean build with no errors. If imports fail, ensure Phase 3's earlier tasks added the corresponding `fetchX` exports to `dataService.js`.

- [ ] **Step 3: Commit**

```bash
git add src/context/DataContext.jsx
git commit -m "Expose predictions, academics, attendance, healthRecords + retry from DataContext"
```

---

## Phase 4 — View Migration

**Owner:** Three subagents in parallel (VIEWS-A, VIEWS-B, VIEWS-C).
**Estimated wall-clock:** 25-35 min.
**Dependency:** Phase 2 + Phase 3 finished.

### Subagent VIEWS-A — Teachers, Predictive, Academics

#### Task 23: Restyle Teachers view

**Files:**
- Modify: `src/views/Teachers.jsx`

- [ ] **Step 1: Read current `src/views/Teachers.jsx`**

- [ ] **Step 2: Replace mock import with `useData()`**

Find the import line `import { TEACHERS } from '../data/mockData.js'` and replace usage with `const { teachers } = useData()`. The shape returned by `fetchTeachers` (in dataService.js) already matches what the view expects.

- [ ] **Step 3: Restyle using new components**

Replace inline KPI/card JSX with `KPICard`, `ChartCard`, `DataTable`. Use `PageHeader` at the top. Wrap in `LoadingState`/`ErrorState` based on `useData()`'s loading/error flags.

Pattern:
```jsx
import { PageHeader, KPICard, DataTable, LoadingState, ErrorState } from '../components/ui'
import { useData } from '../context/DataContext.jsx'
import { Users, Award } from 'lucide-react'

export default function Teachers() {
  const { teachers, loading, error, retry } = useData()
  if (loading) return <div className="p-6"><LoadingState variant="kpis" /></div>
  if (error) return <div className="p-6"><ErrorState message={error} onRetry={retry} /></div>
  // ...
}
```

- [ ] **Step 4: Verify**

In dev server, sign in as Administrator, navigate to Teachers. Confirm all 8 teachers render. Confirm sortable, searchable.

- [ ] **Step 5: Commit**

```bash
git add src/views/Teachers.jsx
git commit -m "Wire Teachers view to live data and restyle"
```

#### Task 24: Restyle Predictive view

**Files:**
- Modify: `src/views/Predictive.jsx`

- [ ] **Step 1: Read current view to understand its layout**

- [ ] **Step 2: Replace mock import with `useData()` + use `predictions` from context**

```jsx
import { useData } from '../context/DataContext.jsx'
const { predictions } = useData()
```

- [ ] **Step 3: Restyle**

Layout: PageHeader + KPI row (count by risk level) + DataTable of predictions sorted by risk_score desc, with `RiskBadge` in the risk column.

- [ ] **Step 4: Verify and commit**

```bash
npm run build
git add src/views/Predictive.jsx
git commit -m "Wire Predictive view to live predictions and restyle"
```

#### Task 25: Restyle Academics view

**Files:**
- Modify: `src/views/Academics.jsx`

- [ ] **Step 1: Read current view**

- [ ] **Step 2: Use `academics` from `useData()`**

```jsx
const { academics } = useData()
// academics = { bySubject, byGrade, honorRoll }
```

- [ ] **Step 3: Restyle**

PageHeader + 2 ChartCards side-by-side (BarChart by subject, BarChart by grade) + DataTable of honor roll.

- [ ] **Step 4: Verify and commit**

```bash
git add src/views/Academics.jsx
git commit -m "Wire Academics view to live grades and restyle"
```

### Subagent VIEWS-B — Alerts, Attendance, HealthRecords

#### Task 26: Restyle Alerts view

**Files:**
- Modify: `src/views/Alerts.jsx`

- [ ] **Step 1: Read view**
- [ ] **Step 2: Replace mock with `useData().alerts`** (already exists in DataContext)
- [ ] **Step 3: Restyle**

Layout: PageHeader + filter pills (All / High / Medium / Low) + list of `AlertItem` components.

- [ ] **Step 4: Verify and commit**

```bash
git add src/views/Alerts.jsx
git commit -m "Wire Alerts view to live data and restyle"
```

#### Task 27: Restyle Attendance view

**Files:**
- Modify: `src/views/Attendance.jsx`

- [ ] **Step 1: Read view**
- [ ] **Step 2: Use `attendance` from `useData()`**
- [ ] **Step 3: Restyle**

Layout: PageHeader + KPI row (today's % present, % absent, % tardy, total students) + LineChart of byDay + DataTable of bySection.

- [ ] **Step 4: Verify and commit**

```bash
git add src/views/Attendance.jsx
git commit -m "Wire Attendance view to live data and restyle"
```

#### Task 28: Restyle HealthRecords view

**Files:**
- Modify: `src/views/HealthRecords.jsx`

- [ ] **Step 1: Read view**
- [ ] **Step 2: Use `healthRecords` from `useData()`**
- [ ] **Step 3: Restyle**

Layout: PageHeader + 2 KPIs (records count, recent visits count) + 2 DataTables (records, visits). If both are empty (because the tables exist but are unseeded), show `EmptyState` with "No health records yet — populate via Settings → Import."

- [ ] **Step 4: Verify and commit**

```bash
git add src/views/HealthRecords.jsx
git commit -m "Wire HealthRecords view to live data and restyle"
```

### Subagent VIEWS-C — Dashboard, Students, Enrollment, MyProgress, AuthScreen, Reports, Settings

#### Task 29: Restyle Dashboard view

**Files:**
- Modify: `src/views/Dashboard.jsx`

- [ ] **Step 1: Read view (largest of all views — has KPIs + charts + alerts list)**
- [ ] **Step 2: Replace inline JSX with primitives**

Use `PageHeader`, 4 `KPICard`s in a grid, `ChartCard` wrapping the recharts BarChart for attendance, `ChartCard` wrapping a list of `AlertItem`s on the right.

- [ ] **Step 3: Verify and commit**

```bash
git add src/views/Dashboard.jsx
git commit -m "Restyle Dashboard with new design system"
```

#### Task 30: Restyle Students view

**Files:**
- Modify: `src/views/Students.jsx`

- [ ] **Step 1: Read view**
- [ ] **Step 2: Replace its existing table with `<DataTable>`**

Columns: LRN, Name, Grade, Section, Attendance%, Average, Risk (using `RiskBadge`).

- [ ] **Step 3: Verify and commit**

```bash
git add src/views/Students.jsx
git commit -m "Restyle Students view with DataTable"
```

#### Task 31: Restyle Enrollment view

**Files:**
- Modify: `src/views/Enrollment.jsx`

- [ ] **Step 1: Read view**
- [ ] **Step 2: Apply primitives** (PageHeader, KPICards for enrollment counts, DataTable for roster per section)
- [ ] **Step 3: Verify and commit**

```bash
git add src/views/Enrollment.jsx
git commit -m "Restyle Enrollment view"
```

#### Task 32: Restyle MyProgress view

**Files:**
- Modify: `src/views/MyProgress.jsx`

- [ ] **Step 1: Read view**
- [ ] **Step 2: Apply primitives** for the student-facing layout (PageHeader, KPIs for own attendance/avg, DataTable of own grades by quarter)
- [ ] **Step 3: Verify and commit**

```bash
git add src/views/MyProgress.jsx
git commit -m "Restyle MyProgress view"
```

#### Task 33: Restyle AuthScreen

**Files:**
- Modify: `src/views/AuthScreen.jsx`

- [ ] **Step 1: Read current AuthScreen**
- [ ] **Step 2: Update colors to `bi-*` tokens**

The structure is fine (split-pane brand left + form right). Just swap brand-* and slate-* color classes for bi-* equivalents:
- `bg-gradient-to-br from-brand-700 ...` → `bg-gradient-to-br from-bi-primary to-bi-primary-hover`
- `text-slate-700` → `text-bi-text-soft`
- `bg-slate-50` → `bg-bi-bg`
- `bg-brand-600 hover:bg-brand-700` → `bg-bi-primary hover:bg-bi-primary-hover`

- [ ] **Step 3: Verify and commit**

```bash
git add src/views/AuthScreen.jsx
git commit -m "Restyle AuthScreen with bi-* tokens"
```

#### Task 34: Build Reports view from stub

**Files:**
- Modify: `src/views/Reports.jsx`

- [ ] **Step 1: Read current stub**

- [ ] **Step 2: Build a useful Reports page**

Layout: PageHeader + grid of report cards. Each card describes a pre-built report (Attendance Summary, Academic Performance, At-Risk Students, Honor Roll, Health Records Summary) with a "Generate" button that:
- For now, opens a print dialog of the relevant data via `window.print()` after rendering a printable view
- OR exports CSV using a small inline helper

```jsx
// src/views/Reports.jsx
import { PageHeader, ChartCard } from '../components/ui'
import { useData } from '../context/DataContext.jsx'
import { FileText, Download } from 'lucide-react'

const REPORTS = [
  { id: 'attendance',  title: 'Attendance Summary',     desc: 'Last 30 days, by section', source: 'attendance.bySection' },
  { id: 'academics',   title: 'Academic Performance',   desc: 'Subject averages + grade trends', source: 'academics.bySubject' },
  { id: 'at-risk',     title: 'At-Risk Students',       desc: 'Students with risk_level = High', source: 'predictions' },
  { id: 'honor-roll',  title: 'Honor Roll',             desc: 'Students with avg ≥ 90',          source: 'academics.honorRoll' },
  { id: 'enrollment',  title: 'Enrollment Roster',      desc: 'Full student list by section',    source: 'students' }
]

function toCSV(rows) {
  if (!rows.length) return ''
  const keys = Object.keys(rows[0])
  return [keys.join(','), ...rows.map((r) => keys.map((k) => JSON.stringify(r[k] ?? '')).join(','))].join('\n')
}
function download(name, content) {
  const blob = new Blob([content], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}

export default function Reports() {
  const data = useData()

  function generate(report) {
    const path = report.source.split('.')
    let value = data
    for (const p of path) value = value?.[p]
    const rows = Array.isArray(value) ? value : []
    download(`${report.id}.csv`, toCSV(rows))
  }

  return (
    <div className="p-6">
      <PageHeader title="Reports" subtitle="Generate exports of school data" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
        {REPORTS.map((r) => (
          <ChartCard key={r.id} title={r.title} subtitle={r.desc}>
            <button
              onClick={() => generate(r)}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-bi-primary text-white rounded hover:bg-bi-primary-hover"
            >
              <Download className="w-3.5 h-3.5" /> Generate CSV
            </button>
          </ChartCard>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify** — visit /reports, click each generate button, confirm CSV downloads with the expected columns.

- [ ] **Step 4: Commit**

```bash
git add src/views/Reports.jsx
git commit -m "Build Reports view with CSV export of 5 standard reports"
```

#### Task 35: Build Settings view from stub

**Files:**
- Modify: `src/views/Settings.jsx`

- [ ] **Step 1: Read current stub**

- [ ] **Step 2: Build a settings page with two sections**

```jsx
// src/views/Settings.jsx
import { PageHeader, ChartCard } from '../components/ui'
import { useAuth } from '../context/AuthContext.jsx'

export default function Settings() {
  const { profile, signOut } = useAuth()
  return (
    <div className="p-6 max-w-3xl">
      <PageHeader title="Settings" subtitle="Account and school configuration" />

      <div className="space-y-3">
        <ChartCard title="Account">
          <dl className="text-sm space-y-2">
            <div className="flex justify-between"><dt className="text-bi-text-mute">Name</dt><dd className="text-bi-text font-medium">{profile?.full_name || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-bi-text-mute">Email</dt><dd className="text-bi-text font-medium">{profile?.email || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-bi-text-mute">Role</dt><dd className="text-bi-text font-medium capitalize">{profile?.role || '—'}</dd></div>
          </dl>
          <button onClick={signOut} className="mt-4 px-3 py-1.5 text-xs font-semibold bg-bi-bad-soft text-bi-bad rounded hover:bg-bi-bad hover:text-white transition-colors">
            Sign out
          </button>
        </ChartCard>

        <ChartCard title="School profile" subtitle="Basic information shown across the dashboard">
          <dl className="text-sm space-y-2">
            <div className="flex justify-between"><dt className="text-bi-text-mute">School name</dt><dd className="text-bi-text font-medium">Bagong Ilog Elementary School</dd></div>
            <div className="flex justify-between"><dt className="text-bi-text-mute">Location</dt><dd className="text-bi-text font-medium">Pasig City</dd></div>
            <div className="flex justify-between"><dt className="text-bi-text-mute">School year</dt><dd className="text-bi-text font-medium">2025-2026</dd></div>
          </dl>
        </ChartCard>

        <ChartCard title="Risk model" subtitle="Predictive analytics configuration">
          <dl className="text-sm space-y-2">
            <div className="flex justify-between"><dt className="text-bi-text-mute">Model version</dt><dd className="text-bi-text font-medium">v2.3</dd></div>
            <div className="flex justify-between"><dt className="text-bi-text-mute">Last computed</dt><dd className="text-bi-text font-medium">On seed</dd></div>
          </dl>
        </ChartCard>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify and commit**

```bash
git add src/views/Settings.jsx
git commit -m "Build Settings view with account, school, and model sections"
```

#### Task 36: Rewrite Sidebar with grouped NavGroups

**Files:**
- Modify: `src/components/Sidebar.jsx`

- [ ] **Step 1: Read current Sidebar**

- [ ] **Step 2: Rewrite using NavItem + NavGroup**

```jsx
// src/components/Sidebar.jsx — full rewrite
import { Home, Users, Brain, BookOpen, Calendar, Heart, GraduationCap, Briefcase, FileText, AlertTriangle, Settings as SettingsIcon, School } from 'lucide-react'
import { NavItem, NavGroup } from './ui'

const ITEMS = {
  dashboard:  { icon: Home,         label: 'Dashboard',  group: 'Overview' },
  myprogress: { icon: GraduationCap, label: 'My Progress', group: 'Overview' },
  students:   { icon: Users,        label: 'Students',   group: 'Overview' },
  predictive: { icon: Brain,        label: 'Predictive', group: 'Overview' },
  academics:  { icon: BookOpen,     label: 'Academics',  group: 'Records' },
  attendance: { icon: Calendar,     label: 'Attendance', group: 'Records' },
  health:     { icon: Heart,        label: 'Health',     group: 'Records' },
  enrollment: { icon: Briefcase,    label: 'Enrollment', group: 'Manage' },
  teachers:   { icon: School,       label: 'Teachers',   group: 'Manage' },
  alerts:     { icon: AlertTriangle, label: 'Alerts',     group: 'Manage' },
  reports:    { icon: FileText,     label: 'Reports',    group: 'Manage' },
  settings:   { icon: SettingsIcon, label: 'Settings',   group: 'System' }
}

export default function Sidebar({ active, onNavigate, allowed }) {
  const groups = ['Overview', 'Records', 'Manage', 'System']
  return (
    <aside className="w-[200px] bg-bi-card border-r border-bi-border h-screen sticky top-0 p-3 flex-shrink-0">
      <div className="flex items-center gap-2 px-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-bi-primary-soft text-bi-primary flex items-center justify-center">
          <School className="w-4 h-4" />
        </div>
        <div>
          <div className="text-sm font-bold text-bi-text leading-tight">Bagong Ilog</div>
          <div className="text-[10px] text-bi-text-mute">SY 25–26</div>
        </div>
      </div>
      {groups.map((group) => {
        const items = Object.entries(ITEMS).filter(([key, v]) => v.group === group && allowed.includes(key))
        if (items.length === 0) return null
        return (
          <NavGroup key={group} label={group}>
            {items.map(([key, v]) => (
              <NavItem
                key={key}
                icon={v.icon}
                label={v.label}
                active={active === key}
                onClick={() => onNavigate(key)}
              />
            ))}
          </NavGroup>
        )
      })}
    </aside>
  )
}
```

- [ ] **Step 3: Verify** — load each role's session, confirm only their permitted items show.

- [ ] **Step 4: Commit**

```bash
git add src/components/Sidebar.jsx
git commit -m "Rewrite Sidebar with NavGroups and bi-* tokens"
```

#### Task 37: Restyle TopBar

**Files:**
- Modify: `src/components/TopBar.jsx`

- [ ] **Step 1: Read current TopBar**

- [ ] **Step 2: Use PageHeader inside, drop redundant styling**

```jsx
// src/components/TopBar.jsx
import { PageHeader } from './ui'

export default function TopBar({ title, subtitle, actions }) {
  return (
    <div className="bg-bi-bg px-6 pt-6">
      <PageHeader title={title} subtitle={subtitle} actions={actions} />
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/TopBar.jsx
git commit -m "TopBar uses PageHeader primitive"
```

---

## Phase 5 — Polish

**Owner:** Single subagent (sequential — touches App.jsx and several views).
**Estimated wall-clock:** 15-20 min.
**Dependency:** Phase 4 done.

### Task 38: Add mobile drawer behavior to Sidebar + App

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/Sidebar.jsx`

- [ ] **Step 1: Add drawer state to App**

In `App.jsx`'s `ProtectedShell`, add:
```jsx
const [drawerOpen, setDrawerOpen] = useState(false)
```

Pass `drawerOpen` and `setDrawerOpen` to Sidebar. In TopBar, add a hamburger button visible only on `md:hidden` that toggles the drawer.

- [ ] **Step 2: Update Sidebar for drawer mode**

Wrap the existing sidebar in:
```jsx
<>
  {drawerOpen && <div className="md:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setDrawerOpen(false)} />}
  <aside className={`
    fixed md:sticky inset-y-0 left-0 z-50 w-[200px] bg-bi-card border-r border-bi-border h-screen p-3 transition-transform
    ${drawerOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
  `}>
    {/* existing content */}
  </aside>
</>
```

- [ ] **Step 3: Verify in browser** at <768px width — drawer slides in/out, backdrop closes it.

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx src/components/Sidebar.jsx src/components/TopBar.jsx
git commit -m "Add mobile drawer for sidebar below 768px"
```

### Task 39: Pass loading/empty/error states across all views

**Files:** all 11 view files.

- [ ] **Step 1: Audit each view**

Open each view in `src/views/`. For each one:
- If it fetches data, ensure `loading` shows `<LoadingState />`
- If the result is empty, show `<EmptyState />`
- If error, show `<ErrorState />`

Some views already do this from Phase 4. Add it to any that don't.

- [ ] **Step 2: Commit**

```bash
git add src/views/
git commit -m "Pass loading/empty/error states across all views"
```

---

## Phase 6 — Verification & Deploy

### Task 40: Final smoke test

- [ ] **Step 1: Run smoke test**

```bash
node scripts/smoke-test.js > docs/smoke-test-report-final.md 2>&1
```

Confirm: anon access locked down, all expected tables, signup flow works.

- [ ] **Step 2: Run production build**

```bash
npm run build
```

Confirm: clean build, dist/ produced.

- [ ] **Step 3: Manual UI walkthrough**

Sign in as Administrator. Visit every nav item. Confirm:
- KPIs render with real numbers
- Charts render
- Tables paginate/sort/search
- No console errors
- Mobile drawer works

- [ ] **Step 4: Commit final report**

```bash
git add docs/smoke-test-report-final.md
git commit -m "Final smoke test passes — Phase 1+2 release ready"
```

### Task 41: Push to feature branch + open PR

- [ ] **Step 1: Push** (user runs in their terminal — hook blocks agent push)

```bash
git push origin main:feat/dashboard-v2
```

- [ ] **Step 2: Open PR**

Visit `https://github.com/MiguelMarcelo25/Multi-Purpose-School-Management/compare/main...feat/dashboard-v2` and create the PR. Description should reference this plan and the spec.

- [ ] **Step 3: Vercel auto-deploys preview**

Wait ~60-90s. Visit the preview URL Vercel posts to the PR. Verify it matches local.

- [ ] **Step 4: After review, merge to main**

Vercel auto-promotes the production deployment.

---

## Out of Scope

Tier 3 items deferred:
- Page transitions / micro-animations
- Full WCAG 2.1 AA accessibility audit
- Print-friendly Reports (CSV export ships in Task 34)
- Internationalization
- Real ML model (heuristic stays)
