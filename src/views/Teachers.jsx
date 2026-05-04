import { useMemo } from 'react'
import { Star, Users, BookOpen, Award } from 'lucide-react'
import {
  PageHeader, KPICard, DataTable, LoadingState, ErrorState, EmptyState
} from '../components/ui'
import { useData } from '../context/DataContext.jsx'

export default function Teachers() {
  const { teachers, loading, error, retry } = useData()

  const stats = useMemo(() => {
    if (!teachers || teachers.length === 0) {
      return { total: 0, avgRating: 0, subjects: 0 }
    }
    const total = teachers.length
    const avgRating = teachers.reduce((sum, t) => sum + (t.rating || 0), 0) / total
    const subjects = new Set(teachers.map((t) => t.subject).filter(Boolean)).size
    return { total, avgRating, subjects }
  }, [teachers])

  const columns = useMemo(() => ([
    {
      key: 'name',
      header: 'Name',
      render: (t) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-bi-tint text-bi-text flex items-center justify-center text-xs font-bold flex-shrink-0">
            {(t.name || '').split(' ').slice(-2).map((n) => n[0]).join('')}
          </div>
          <div>
            <div className="text-sm font-semibold text-bi-text leading-tight">{t.name}</div>
            <div className="text-xs text-bi-text-mute">{t.id}</div>
          </div>
        </div>
      )
    },
    { key: 'subject', header: 'Subject' },
    {
      key: 'grade',
      header: 'Grade',
      render: (t) => `Grade ${t.grade}`
    },
    { key: 'sections', header: 'Sections' },
    {
      key: 'yearsExp',
      header: 'Years Exp.',
      render: (t) => `${t.yearsExp} yrs`
    },
    {
      key: 'rating',
      header: 'Rating',
      render: (t) => (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                className={`w-3.5 h-3.5 ${
                  i <= Math.round(t.rating)
                    ? 'text-bi-warn fill-bi-warn'
                    : 'text-bi-border'
                }`}
              />
            ))}
          </div>
          <span className="text-xs font-semibold text-bi-text tabular-nums">
            {(t.rating || 0).toFixed(1)}
          </span>
        </div>
      )
    }
  ]), [])

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader title="Teachers" subtitle="Faculty directory and performance" />
        <LoadingState variant="kpis" />
        <LoadingState rows={6} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <PageHeader title="Teachers" subtitle="Faculty directory and performance" />
        <ErrorState message={error} onRetry={retry} />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Teachers"
        subtitle="Faculty directory and performance"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <KPICard label="Total Faculty" value={stats.total} icon={Users} />
        <KPICard
          label="Avg. Rating"
          value={`${stats.avgRating.toFixed(1)} / 5`}
          icon={Star}
        />
        <KPICard label="Subjects Taught" value={stats.subjects} icon={BookOpen} />
        <KPICard label="Master's Degree" value="68%" icon={Award} />
      </div>

      {teachers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No teachers found"
          message="Faculty roster will appear here once data is loaded."
        />
      ) : (
        <DataTable
          columns={columns}
          rows={teachers}
          searchable
          pageSize={25}
          emptyMessage="No teachers match your search."
        />
      )}
    </div>
  )
}
