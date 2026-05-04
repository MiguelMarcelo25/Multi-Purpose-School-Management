import { useMemo } from 'react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine
} from 'recharts'
import { CalendarCheck, AlertCircle, Clock, Users } from 'lucide-react'
import {
  PageHeader, KPICard, ChartCard, DataTable,
  EmptyState, LoadingState, ErrorState
} from '../components/ui'
import { useData } from '../context/DataContext.jsx'

export default function Attendance() {
  const { attendance, metrics, loading, error, retry } = useData()
  const byDay = attendance?.byDay || []
  const bySection = attendance?.bySection || []

  // Compute today's KPI from latest day if available, else fall back to school metric
  const latest = byDay.length > 0 ? byDay[byDay.length - 1] : null
  const presentPct = latest ? latest.attendance_pct : (metrics?.avgAttendance ?? 0)
  const absentPct  = latest ? Math.round((100 - latest.attendance_pct) * 10) / 10 : null
  const tardyPct   = useMemo(() => {
    // Approximate: not in this dataset; show em-dash
    return null
  }, [])
  const totalStudents = metrics?.totalStudents ?? 0

  const sectionColumns = [
    { key: 'section', header: 'Section' },
    {
      key: 'attendance_pct',
      header: 'Attendance %',
      render: (r) => {
        const v = r.attendance_pct
        const tone = v >= 95 ? 'text-bi-good' : v >= 90 ? 'text-bi-text' : v >= 85 ? 'text-bi-warn' : 'text-bi-bad'
        return <span className={`font-semibold tabular-nums ${tone}`}>{v}%</span>
      }
    }
  ]

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        title="Attendance"
        subtitle="Daily presence tracking and per-section breakdown"
      />

      {loading && (
        <>
          <LoadingState variant="kpis" />
          <LoadingState rows={4} />
        </>
      )}

      {error && !loading && (
        <ErrorState
          title="Could not load attendance"
          message={error}
          onRetry={retry}
        />
      )}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <KPICard
              label="% Present Today"
              value={`${presentPct}%`}
              icon={CalendarCheck}
            />
            <KPICard
              label="% Absent Today"
              value={absentPct == null ? '—' : `${absentPct}%`}
              icon={AlertCircle}
              emphasis={absentPct != null && absentPct > 10 ? 'danger' : 'default'}
            />
            <KPICard
              label="% Tardy Today"
              value={tardyPct == null ? '—' : `${tardyPct}%`}
              icon={Clock}
            />
            <KPICard
              label="Total Students"
              value={totalStudents}
              icon={Users}
            />
          </div>

          <ChartCard
            title="Attendance Trend"
            subtitle="Daily attendance percentage over the last 30 days"
          >
            {byDay.length === 0 ? (
              <EmptyState
                icon={CalendarCheck}
                title="No attendance data yet"
                message="Daily attendance will appear here once records are imported."
              />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={byDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                  <ReferenceLine y={90} stroke="#94a3b8" strokeDasharray="3 3" label={{ value: 'Target 90%', position: 'right', fontSize: 10, fill: '#64748b' }} />
                  <Line
                    type="monotone"
                    dataKey="attendance_pct"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard
            title="Attendance by Section"
            subtitle="Average attendance percentage per section"
          >
            {bySection.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No section data yet"
                message="Per-section breakdown will appear once attendance is recorded."
              />
            ) : (
              <DataTable
                columns={sectionColumns}
                rows={bySection}
                pageSize={15}
                emptyMessage="No sections to display"
              />
            )}
          </ChartCard>
        </>
      )}
    </div>
  )
}
