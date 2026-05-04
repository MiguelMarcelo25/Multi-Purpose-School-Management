import { useMemo, useState } from 'react'
import { Bell, AlertTriangle } from 'lucide-react'
import {
  PageHeader, KPICard, AlertItem, EmptyState,
  LoadingState, ErrorState
} from '../components/ui'
import { useData } from '../context/DataContext.jsx'

const SEVERITY_FILTERS = ['All', 'High', 'Medium', 'Low']

export default function Alerts() {
  const { alerts, loading, error, retry } = useData()
  const [filter, setFilter] = useState('All')

  const filtered = useMemo(() => {
    if (filter === 'All') return alerts
    return alerts.filter((a) => a.severity === filter)
  }, [alerts, filter])

  const counts = useMemo(() => ({
    total: alerts.length,
    high:   alerts.filter((a) => a.severity === 'High').length,
    medium: alerts.filter((a) => a.severity === 'Medium').length,
    low:    alerts.filter((a) => a.severity === 'Low').length
  }), [alerts])

  return (
    <div className="p-4 md:p-6 space-y-5">
      <PageHeader
        title="Alerts"
        subtitle="Active notifications flagged by the early-warning system"
      />

      {loading && (
        <>
          <LoadingState variant="kpis" />
          <LoadingState rows={6} />
        </>
      )}

      {error && !loading && (
        <ErrorState
          title="Could not load alerts"
          message={error}
          onRetry={retry}
        />
      )}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <KPICard label="Active Alerts" value={counts.total}  icon={Bell} />
            <KPICard label="High Severity" value={counts.high}   icon={AlertTriangle} emphasis={counts.high > 0 ? 'danger' : 'default'} />
            <KPICard label="Medium"        value={counts.medium} icon={AlertTriangle} />
            <KPICard label="Low"           value={counts.low}    icon={AlertTriangle} />
          </div>

          <div className="bg-bi-card border border-bi-border rounded-[10px] p-3 sm:p-[14px]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
              <h3 className="text-sm font-semibold text-bi-text">All Alerts</h3>
              <div className="flex items-center gap-1 flex-wrap">
                {SEVERITY_FILTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilter(s)}
                    className={`text-xs font-semibold px-2.5 py-1 rounded transition-colors ${
                      filter === s
                        ? 'bg-bi-primary text-white'
                        : 'bg-bi-tint text-bi-text-soft hover:bg-bi-border'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {filtered.length === 0 ? (
              <EmptyState
                icon={Bell}
                title="No alerts"
                message={filter === 'All' ? 'No active alerts at this time.' : `No ${filter.toLowerCase()}-severity alerts.`}
              />
            ) : (
              <div>
                {filtered.map((a) => (
                  <AlertItem
                    key={a.id}
                    severity={a.severity}
                    studentName={a.student}
                    type={`${a.type}${a.grade ? ` · Grade ${a.grade}-${a.section}` : ''}`}
                    detectedAt={a.detectedAt}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
