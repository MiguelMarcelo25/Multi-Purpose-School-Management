import { Heart, Stethoscope } from 'lucide-react'
import {
  PageHeader, KPICard, ChartCard, DataTable,
  EmptyState, LoadingState, ErrorState
} from '../components/ui'
import { useData } from '../context/DataContext.jsx'

export default function HealthRecords() {
  const { healthRecords, loading, error, retry } = useData()
  const records = healthRecords?.records || []
  const visits  = healthRecords?.visits  || []
  const isEmpty = records.length === 0 && visits.length === 0

  const recordColumns = [
    {
      key: 'student',
      header: 'Student',
      render: (r) => r.student?.full_name || '—'
    },
    {
      key: 'lrn',
      header: 'LRN',
      render: (r) => <span className="font-mono text-xs text-bi-text-soft">{r.student?.lrn || '—'}</span>
    },
    {
      key: 'height_cm',
      header: 'Height',
      render: (r) => r.height_cm != null ? `${r.height_cm} cm` : '—'
    },
    {
      key: 'weight_kg',
      header: 'Weight',
      render: (r) => r.weight_kg != null ? `${r.weight_kg} kg` : '—'
    },
    {
      key: 'bmi',
      header: 'BMI',
      render: (r) => r.bmi != null ? <span className="font-semibold tabular-nums">{r.bmi}</span> : '—'
    },
    {
      key: 'bmi_category',
      header: 'Category',
      render: (r) => r.bmi_category || '—'
    },
    {
      key: 'blood_type',
      header: 'Blood',
      render: (r) => r.blood_type || '—'
    }
  ]

  const visitColumns = [
    {
      key: 'visit_date',
      header: 'Date',
      render: (v) => <span className="font-mono text-xs">{v.visit_date || '—'}</span>
    },
    {
      key: 'student',
      header: 'Student',
      render: (v) => v.student?.full_name || '—'
    },
    { key: 'reason', header: 'Reason', render: (v) => v.reason || '—' },
    { key: 'treatment', header: 'Treatment', render: (v) => <span className="text-xs text-bi-text-soft">{v.treatment || '—'}</span> },
    {
      key: 'sent_home',
      header: 'Sent Home',
      render: (v) => v.sent_home
        ? <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-bi-warn-soft text-bi-warn">Yes</span>
        : <span className="text-xs text-bi-text-mute">No</span>
    }
  ]

  return (
    <div className="p-4 md:p-6 space-y-5">
      <PageHeader
        title="Health Records"
        subtitle="Student health profiles and clinic visit log"
      />

      {loading && (
        <>
          <LoadingState variant="kpis" />
          <LoadingState rows={4} />
        </>
      )}

      {error && !loading && (
        <ErrorState
          title="Could not load health records"
          message={error}
          onRetry={retry}
        />
      )}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <KPICard label="Records on File" value={records.length} icon={Heart} />
            <KPICard label="Recent Clinic Visits" value={visits.length} icon={Stethoscope} />
          </div>

          {isEmpty ? (
            <div className="bg-bi-card border border-bi-border rounded-[10px] p-[14px]">
              <EmptyState
                icon={Heart}
                title="No health records yet"
                message="Populate via Settings → Import."
              />
            </div>
          ) : (
            <>
              <ChartCard title="Health Records" subtitle="Anthropometric measurements per student">
                <DataTable
                  columns={recordColumns}
                  rows={records}
                  searchable
                  pageSize={20}
                  emptyMessage="No health records to display"
                />
              </ChartCard>

              <ChartCard title="Recent Clinic Visits" subtitle="Most recent 50 visits">
                <DataTable
                  columns={visitColumns}
                  rows={visits}
                  pageSize={15}
                  emptyMessage="No clinic visits to display"
                />
              </ChartCard>
            </>
          )}
        </>
      )}
    </div>
  )
}
