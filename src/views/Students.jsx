import { useMemo, useState } from 'react'
import { Search, Filter, X, Download, UserPlus, ArrowUpDown } from 'lucide-react'
import { recommendInterventions } from '../data/mockData.js'
import { useData } from '../context/DataContext.jsx'

function RiskBadge({ level }) {
  if (level === 'High')   return <span className="badge-red">High Risk</span>
  if (level === 'Medium') return <span className="badge-amber">Medium Risk</span>
  return <span className="badge-green">Low Risk</span>
}

export default function Students() {
  const { students } = useData()
  const [query, setQuery] = useState('')
  const [grade, setGrade] = useState('all')
  const [risk, setRisk] = useState('all')
  const [sortKey, setSortKey] = useState('name')
  const [selected, setSelected] = useState(null)

  const filtered = useMemo(() => {
    let list = students
    if (query) {
      const q = query.toLowerCase()
      list = list.filter((s) =>
        s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)
      )
    }
    if (grade !== 'all') list = list.filter((s) => s.grade === Number(grade))
    if (risk !== 'all')  list = list.filter((s) => s.risk.level === risk)

    return [...list].sort((a, b) => {
      if (sortKey === 'risk')       return b.risk.score - a.risk.score
      if (sortKey === 'attendance') return b.attendance - a.attendance
      if (sortKey === 'grade')      return b.average - a.average
      return a.name.localeCompare(b.name)
    })
  }, [students, query, grade, risk, sortKey])

  return (
    <div className="p-8 space-y-5">
      {/* Filter bar */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="text"
            placeholder="Search by name or LRN..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select value={grade} onChange={(e) => setGrade(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white">
            <option value="all">All Grades</option>
            {[1,2,3,4,5,6].map((g) => <option key={g} value={g}>Grade {g}</option>)}
          </select>
          <select value={risk} onChange={(e) => setRisk(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white">
            <option value="all">All Risk Levels</option>
            <option value="High">High Risk</option>
            <option value="Medium">Medium Risk</option>
            <option value="Low">Low Risk</option>
          </select>
          <select value={sortKey} onChange={(e) => setSortKey(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white">
            <option value="name">Sort: Name</option>
            <option value="risk">Sort: Risk Score</option>
            <option value="grade">Sort: Average</option>
            <option value="attendance">Sort: Attendance</option>
          </select>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button className="btn-ghost"><Download className="w-4 h-4" /> Export</button>
          <button className="btn-primary"><UserPlus className="w-4 h-4" /> Add Student</button>
        </div>
      </div>

      <p className="text-xs text-slate-500">Showing <span className="font-semibold text-slate-700">{filtered.length}</span> of {students.length} students</p>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto max-h-[64vh] overflow-y-auto">
          <table className="w-full">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="table-th">Student</th>
                <th className="table-th">LRN</th>
                <th className="table-th">Grade & Section</th>
                <th className="table-th"><span className="inline-flex items-center gap-1">Average <ArrowUpDown className="w-3 h-3" /></span></th>
                <th className="table-th">Attendance</th>
                <th className="table-th">Risk</th>
                <th className="table-th">Predicted Avg.</th>
                <th className="table-th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filtered.slice(0, 200).map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="table-td">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold">
                        {s.name.split(' ').map(n => n[0]).slice(0,2).join('')}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{s.name}</p>
                        <p className="text-xs text-slate-500">{s.gender} · Age {s.age}</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-td font-mono text-xs">{s.id}</td>
                  <td className="table-td">Grade {s.grade} – {s.section}</td>
                  <td className="table-td">
                    <span className={`font-semibold ${s.average < 75 ? 'text-red-600' : s.average < 85 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {s.average.toFixed(1)}
                    </span>
                  </td>
                  <td className="table-td">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${s.attendance < 80 ? 'bg-red-500' : s.attendance < 90 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${s.attendance}%` }} />
                      </div>
                      <span className="text-xs">{s.attendance}%</span>
                    </div>
                  </td>
                  <td className="table-td"><RiskBadge level={s.risk.level} /></td>
                  <td className="table-td">
                    <span className="text-slate-700 font-medium">{s.risk.projectedAverage}</span>
                    <span className="text-xs text-slate-400 ml-1">predicted</span>
                  </td>
                  <td className="table-td">
                    <button onClick={() => setSelected(s)} className="text-xs text-brand-700 font-semibold hover:underline">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 z-30 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{selected.name}</h3>
                <p className="text-xs text-slate-500 font-mono">{selected.id} · Grade {selected.grade}-{selected.section}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5 space-y-5">
              {/* Risk Card */}
              <div className={`rounded-xl p-4 border ${
                selected.risk.level === 'High'   ? 'bg-red-50 border-red-200' :
                selected.risk.level === 'Medium' ? 'bg-amber-50 border-amber-200' :
                'bg-emerald-50 border-emerald-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase font-semibold text-slate-600">Predictive Risk Score</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{selected.risk.score}<span className="text-base text-slate-500">/100</span></p>
                  </div>
                  <RiskBadge level={selected.risk.level} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-slate-500">Predicted Avg. (next quarter)</p>
                    <p className="text-base font-bold text-slate-900">{selected.risk.projectedAverage}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Failing Subjects</p>
                    <p className="text-base font-bold text-slate-900">{selected.risk.failingSubjects}</p>
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
                <h4 className="text-sm font-bold text-slate-900 mb-2">Subject Grades</h4>
                <div className="space-y-2">
                  {Object.entries(selected.grades).map(([subj, g]) => (
                    <div key={subj} className="flex items-center gap-3">
                      <span className="w-20 text-xs text-slate-600">{subj}</span>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${g < 75 ? 'bg-red-500' : g < 85 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${g}%` }} />
                      </div>
                      <span className={`w-10 text-right text-sm font-semibold ${g < 75 ? 'text-red-600' : 'text-slate-700'}`}>{g}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-2">AI-Recommended Interventions</h4>
                <ul className="space-y-2">
                  {recommendInterventions(selected).map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm bg-brand-50 border border-brand-100 rounded-lg p-2.5">
                      <span className="w-5 h-5 rounded-full bg-brand-600 text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i+1}</span>
                      <span className="text-slate-700">{r}</span>
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
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-medium text-slate-800">{value}</p>
    </div>
  )
}
