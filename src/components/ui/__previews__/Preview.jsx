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
