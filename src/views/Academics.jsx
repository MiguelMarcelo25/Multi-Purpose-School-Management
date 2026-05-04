import { useMemo } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip
} from 'recharts'
import { GraduationCap, Award, BookOpen } from 'lucide-react'
import {
  PageHeader, KPICard, ChartCard, DataTable,
  LoadingState, ErrorState, EmptyState
} from '../components/ui'
import { useData } from '../context/DataContext.jsx'

const CHART_COLOR = '#b45309' // bi-primary

export default function Academics() {
  const { academics, loading, error, retry } = useData()

  const { bySubject, byGrade, honorRoll } = academics || {
    bySubject: [], byGrade: [], honorRoll: []
  }

  const stats = useMemo(() => {
    const subj = bySubject || []
    const honor = honorRoll || []
    const schoolAvg = subj.length > 0
      ? Math.round((subj.reduce((sum, s) => sum + (s.average || 0), 0) / subj.length) * 10) / 10
      : 0
    return {
      schoolAvg,
      honorCount: honor.length,
      subjectCount: subj.length
    }
  }, [bySubject, honorRoll])

  const honorColumns = useMemo(() => ([
    {
      key: 'rank',
      header: 'Rank',
      render: (s) => (
        <span className="inline-flex w-7 h-7 rounded-full items-center justify-center text-xs font-bold bg-bi-tint text-bi-text">
          {s.rank}
        </span>
      )
    },
    {
      key: 'name',
      header: 'Student',
      render: (s) => (
        <div>
          <div className="text-sm font-semibold text-bi-text leading-tight">{s.name}</div>
          {s.lrn && <div className="text-xs text-bi-text-mute font-mono">{s.lrn}</div>}
        </div>
      )
    },
    {
      key: 'average',
      header: 'Average',
      render: (s) => (
        <span className="font-bold text-bi-good tabular-nums">
          {(s.average || 0).toFixed(1)}
        </span>
      )
    }
  ]), [])

  const honorRows = useMemo(
    () => (honorRoll || []).map((s, i) => ({ ...s, rank: i + 1 })),
    [honorRoll]
  )

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader title="Academics" subtitle="Subject performance and honor roll" />
        <LoadingState variant="kpis" />
        <LoadingState rows={6} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <PageHeader title="Academics" subtitle="Subject performance and honor roll" />
        <ErrorState message={error} onRetry={retry} />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Academics"
        subtitle="Subject performance and honor roll"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <KPICard
          label="School Average"
          value={`${stats.schoolAvg.toFixed(1)}%`}
          icon={GraduationCap}
        />
        <KPICard
          label="Honor Roll"
          value={stats.honorCount}
          icon={Award}
        />
        <KPICard
          label="Subjects Tracked"
          value={stats.subjectCount}
          icon={BookOpen}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Performance by Subject"
          subtitle="Average grade per subject"
        >
          {bySubject.length === 0 ? (
            <EmptyState
              title="No subject data"
              message="Subject averages will appear once grades are recorded."
            />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={bySubject}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e4dc" />
                <XAxis dataKey="subject" stroke="#a8a29e" fontSize={12} />
                <YAxis stroke="#a8a29e" fontSize={12} domain={[60, 100]} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid #e8e4dc',
                    background: '#ffffff',
                    fontSize: 12
                  }}
                />
                <Bar dataKey="average" fill={CHART_COLOR} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Performance by Grade Level"
          subtitle="Average grade per cohort"
        >
          {byGrade.length === 0 ? (
            <EmptyState
              title="No grade-level data"
              message="Grade-level averages will appear once grades are recorded."
            />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={byGrade}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e4dc" />
                <XAxis dataKey="grade" stroke="#a8a29e" fontSize={12} />
                <YAxis stroke="#a8a29e" fontSize={12} domain={[60, 100]} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid #e8e4dc',
                    background: '#ffffff',
                    fontSize: 12
                  }}
                />
                <Bar dataKey="average" fill={CHART_COLOR} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <ChartCard
        title="Honor Roll"
        subtitle="Students with average ≥ 90"
      >
        {honorRows.length === 0 ? (
          <EmptyState
            icon={Award}
            title="No honor roll students yet"
            message="Top performers will be listed here once grades meet the threshold."
          />
        ) : (
          <DataTable
            columns={honorColumns}
            rows={honorRows}
            searchable
            pageSize={25}
            emptyMessage="No students match your search."
          />
        )}
      </ChartCard>
    </div>
  )
}
