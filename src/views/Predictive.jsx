import { useMemo } from 'react'
import { Brain, AlertTriangle, ShieldAlert, ShieldCheck } from 'lucide-react'
import {
  PageHeader, KPICard, DataTable, RiskBadge,
  LoadingState, ErrorState, EmptyState
} from '../components/ui'
import { useData } from '../context/DataContext.jsx'

export default function Predictive() {
  const { predictions, loading, error, retry } = useData()

  const kpis = useMemo(() => {
    const list = predictions || []
    const high = list.filter((p) => p.riskLevel === 'High').length
    const medium = list.filter((p) => p.riskLevel === 'Medium').length
    const low = list.filter((p) => p.riskLevel === 'Low').length
    return { total: list.length, high, medium, low }
  }, [predictions])

  const sorted = useMemo(() => {
    return [...(predictions || [])].sort(
      (a, b) => (b.riskScore || 0) - (a.riskScore || 0)
    )
  }, [predictions])

  const columns = useMemo(() => ([
    {
      key: 'studentName',
      header: 'Student',
      render: (p) => (
        <div>
          <div className="text-sm font-semibold text-bi-text leading-tight">
            {p.studentName || '—'}
          </div>
          <div className="text-xs text-bi-text-mute font-mono">{p.lrn || ''}</div>
        </div>
      )
    },
    {
      key: 'grade',
      header: 'Grade / Section',
      render: (p) =>
        p.grade != null
          ? `Grade ${p.grade}${p.section ? ' – ' + p.section : ''}`
          : '—'
    },
    {
      key: 'riskLevel',
      header: 'Risk',
      render: (p) => <RiskBadge level={p.riskLevel} />
    },
    {
      key: 'riskScore',
      header: 'Score',
      render: (p) => (
        <span className="font-bold tabular-nums text-bi-text">
          {p.riskScore != null ? p.riskScore : '—'}
        </span>
      )
    },
    {
      key: 'projectedAverage',
      header: 'Projected Avg.',
      render: (p) => {
        // Supabase numeric columns can come back as strings; coerce defensively.
        const v = Number(p.projectedAverage)
        return Number.isFinite(v) && v > 0
          ? <span className="tabular-nums">{v.toFixed(1)}</span>
          : '—'
      }
    },
    {
      key: 'failingSubjects',
      header: 'Failing',
      render: (p) => (
        <span className="tabular-nums">
          {p.failingSubjects ?? 0}
        </span>
      )
    }
  ]), [])

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader
          title="Predictive Analytics"
          subtitle="Risk forecasts and early-warning indicators"
        />
        <LoadingState variant="kpis" />
        <LoadingState rows={6} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <PageHeader
          title="Predictive Analytics"
          subtitle="Risk forecasts and early-warning indicators"
        />
        <ErrorState message={error} onRetry={retry} />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Predictive Analytics"
        subtitle="Risk forecasts and early-warning indicators"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <KPICard label="Predictions" value={kpis.total} icon={Brain} />
        <KPICard
          label="High Risk"
          value={kpis.high}
          icon={AlertTriangle}
          emphasis="danger"
        />
        <KPICard label="Medium Risk" value={kpis.medium} icon={ShieldAlert} />
        <KPICard label="Low Risk" value={kpis.low} icon={ShieldCheck} />
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={Brain}
          title="No predictions available"
          message="Risk forecasts will appear here once the model has been run."
        />
      ) : (
        <DataTable
          columns={columns}
          rows={sorted}
          searchable
          pageSize={25}
          emptyMessage="No predictions match your search."
        />
      )}
    </div>
  )
}
