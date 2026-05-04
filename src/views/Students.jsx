import { useMemo, useState } from 'react'
import { X, Download, UserPlus } from 'lucide-react'
import { recommendInterventions } from '../data/mockData.js'
import { useData } from '../context/DataContext.jsx'
import {
  PageHeader, DataTable, RiskBadge,
  EmptyState, LoadingState, ErrorState
} from '../components/ui'

export default function Students() {
  const { students, loading, error, retry } = useData()
  const [grade, setGrade] = useState('all')
  const [risk, setRisk] = useState('all')
  const [selected, setSelected] = useState(null)

  const filtered = useMemo(() => {
    let list = students
    if (grade !== 'all') list = list.filter((s) => s.grade === Number(grade))
    if (risk !== 'all')  list = list.filter((s) => s.risk.level === risk)
    return list
  }, [students, grade, risk])

  const columns = useMemo(() => ([
    { key: 'id',         header: 'LRN',         render: (r) => <span className="font-mono text-xs text-bi-text-soft">{r.id}</span> },
    { key: 'name',       header: 'Name',
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-bi-primary-soft text-bi-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0">
            {r.name.split(' ').map(n => n[0]).slice(0,2).join('')}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setSelected(r) }}
            className="font-medium text-bi-text hover:text-bi-primary text-left"
          >
            {r.name}
          </button>
        </div>
      )
    },
    { key: 'grade',      header: 'Grade',       render: (r) => `Grade ${r.grade}` },
    { key: 'section',    header: 'Section' },
    { key: 'attendance', header: 'Attendance %',
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="w-14 h-1.5 bg-bi-tint rounded-full overflow-hidden">
            <div
              className={`h-full ${r.attendance < 80 ? 'bg-bi-bad' : r.attendance < 90 ? 'bg-bi-warn' : 'bg-bi-good'}`}
              style={{ width: `${r.attendance}%` }}
            />
          </div>
          <span className="text-xs tabular-nums">{r.attendance}%</span>
        </div>
      )
    },
    { key: 'average',    header: 'Average',
      render: (r) => (
        <span className={`font-semibold tabular-nums ${
          r.average < 75 ? 'text-bi-bad' : r.average < 85 ? 'text-bi-warn' : 'text-bi-good'
        }`}>
          {r.average.toFixed(1)}
        </span>
      )
    },
    { key: 'risk',       header: 'Risk',
      render: (r) => <RiskBadge level={r.risk.level} />
    }
  ]), [])

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <PageHeader title="Students" subtitle="Roster of enrolled learners" />
        <LoadingState rows={6} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 space-y-4">
        <PageHeader title="Students" subtitle="Roster of enrolled learners" />
        <ErrorState title="Failed to load students" message={error} onRetry={retry} />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Students"
        subtitle={`${filtered.length} of ${students.length} students`}
        actions={
          <>
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-bi-text-soft bg-bi-card border border-bi-border rounded hover:bg-bi-tint">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-bi-primary text-white rounded hover:bg-bi-primary-hover">
              <UserPlus className="w-3.5 h-3.5" /> Add Student
            </button>
          </>
        }
      />

      {/* Filter bar */}
      <div className="bg-bi-card border border-bi-border rounded-[10px] p-3 flex flex-wrap items-center gap-2">
        <select
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          className="text-xs border border-bi-border rounded px-2 py-1.5 bg-bi-bg text-bi-text"
        >
          <option value="all">All Grades</option>
          {[1,2,3,4,5,6].map((g) => <option key={g} value={g}>Grade {g}</option>)}
        </select>
        <select
          value={risk}
          onChange={(e) => setRisk(e.target.value)}
          className="text-xs border border-bi-border rounded px-2 py-1.5 bg-bi-bg text-bi-text"
        >
          <option value="all">All Risk Levels</option>
          <option value="High">High Risk</option>
          <option value="Medium">Medium Risk</option>
          <option value="Low">Low Risk</option>
        </select>
      </div>

      {students.length === 0 ? (
        <EmptyState title="No students" message="Once enrollment data is loaded, students will appear here." />
      ) : (
        <DataTable
          columns={columns}
          rows={filtered}
          searchable
          pageSize={25}
          onRowClick={(r) => setSelected(r)}
          emptyMessage="No students match the current filters"
        />
      )}

      {/* Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 z-30 flex justify-end">
          <div className="absolute inset-0 bg-bi-text/40" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-lg bg-bi-card h-full overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-bi-card border-b border-bi-border p-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-bi-text">{selected.name}</h3>
                <p className="text-xs text-bi-text-mute font-mono">{selected.id} · Grade {selected.grade}-{selected.section}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 hover:bg-bi-tint rounded-lg"><X className="w-5 h-5 text-bi-text-soft" /></button>
            </div>

            <div className="p-5 space-y-5">
              {/* Risk Card */}
              <div className={`rounded-[10px] p-4 border ${
                selected.risk.level === 'High'   ? 'bg-bi-bad-soft border-bi-bad/20' :
                selected.risk.level === 'Medium' ? 'bg-bi-warn-soft border-bi-warn/20' :
                'bg-bi-good-soft border-bi-good/20'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase font-semibold text-bi-text-soft">Predictive Risk Score</p>
                    <p className="text-3xl font-bold text-bi-text mt-1 tabular-nums">{selected.risk.score}<span className="text-base text-bi-text-mute">/100</span></p>
                  </div>
                  <RiskBadge level={selected.risk.level} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-bi-text-mute">Predicted Avg. (next quarter)</p>
                    <p className="text-base font-bold text-bi-text">{selected.risk.projectedAverage}</p>
                  </div>
                  <div>
                    <p className="text-bi-text-mute">Failing Subjects</p>
                    <p className="text-base font-bold text-bi-text">{selected.risk.failingSubjects}</p>
                  </div>
                </div>
              </div>

              {/* Profile */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Info label="Guardian" value={selected.guardian} />
                <Info label="Contact" value={selected.contact} />
                <Info label="Address" value={selected.address} full />
                <Info label="Enrolled Since" value={selected.enrolled} />
                <Info label="Behavior" value={selected.behavior} />
                <Info label="Attendance" value={`${selected.attendance}%`} />
                <Info label="Tardiness" value={`${selected.tardiness} days`} />
                <Info label="Household Income" value={selected.householdIncome} />
                <Info label="Parent Involvement" value={selected.parentInvolvement} />
              </div>

              {/* Grades */}
              <div>
                <h4 className="text-sm font-bold text-bi-text mb-2">Subject Grades</h4>
                <div className="space-y-2">
                  {Object.entries(selected.grades).map(([subj, g]) => (
                    <div key={subj} className="flex items-center gap-3">
                      <span className="w-20 text-xs text-bi-text-soft">{subj}</span>
                      <div className="flex-1 h-2 bg-bi-tint rounded-full overflow-hidden">
                        <div className={`h-full ${g < 75 ? 'bg-bi-bad' : g < 85 ? 'bg-bi-warn' : 'bg-bi-good'}`} style={{ width: `${g}%` }} />
                      </div>
                      <span className={`w-10 text-right text-sm font-semibold tabular-nums ${g < 75 ? 'text-bi-bad' : 'text-bi-text'}`}>{g}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div>
                <h4 className="text-sm font-bold text-bi-text mb-2">AI-Recommended Interventions</h4>
                <ul className="space-y-2">
                  {recommendInterventions(selected).map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm bg-bi-primary-soft border border-bi-primary/15 rounded-[10px] p-2.5">
                      <span className="w-5 h-5 rounded-full bg-bi-primary text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i+1}</span>
                      <span className="text-bi-text-soft">{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Info({ label, value, full }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <p className="text-xs text-bi-text-mute">{label}</p>
      <p className="text-sm font-medium text-bi-text">{value}</p>
    </div>
  )
}
