import { useMemo, useState } from 'react'
import {
  Heart, Activity, Syringe, Stethoscope, Search, Filter, X,
  Ruler, Weight, Droplet, AlertCircle
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell
} from 'recharts'
import { HEALTH_RECORDS, IMMUNIZATIONS, CLINIC_VISITS } from '../data/mockData.js'
import { useData } from '../context/DataContext.jsx'

export default function HealthRecords() {
  const { students } = useData()
  const [query, setQuery] = useState('')
  const [bmiFilter, setBmiFilter] = useState('all')
  const [selected, setSelected] = useState(null)

  // Join students with health records
  const enriched = useMemo(() => {
    const byId = Object.fromEntries(HEALTH_RECORDS.map((h) => [h.studentId, h]))
    return students
      .map((s) => ({ ...s, health: byId[s.id] }))
      .filter((s) => s.health)
  }, [students])

  const filtered = useMemo(() => {
    let list = enriched
    if (bmiFilter !== 'all') list = list.filter((s) => s.health.bmiCategory === bmiFilter)
    if (query) {
      const q = query.toLowerCase()
      list = list.filter((s) => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q))
    }
    return list
  }, [enriched, bmiFilter, query])

  // BMI distribution chart
  const bmiDistribution = useMemo(() => {
    const counts = {}
    enriched.forEach((s) => { counts[s.health.bmiCategory] = (counts[s.health.bmiCategory] || 0) + 1 })
    const colors = { Wasted: '#3b82f6', Normal: '#10b981', Overweight: '#f59e0b', Obese: '#ef4444' }
    return Object.entries(counts).map(([name, value]) => ({ name, value, fill: colors[name] }))
  }, [enriched])

  // Immunization status counts
  const immunizationStats = useMemo(() => {
    const counts = { completed: 0, pending: 0, overdue: 0 }
    IMMUNIZATIONS.forEach((i) => { counts[i.status] = (counts[i.status] || 0) + 1 })
    return [
      { name: 'Completed', value: counts.completed, fill: '#10b981' },
      { name: 'Pending',   value: counts.pending,   fill: '#f59e0b' },
      { name: 'Overdue',   value: counts.overdue,   fill: '#ef4444' }
    ]
  }, [])

  return (
    <div className="p-8 space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Mini label="Records on File"   value={enriched.length} icon={Heart} tone="red" />
        <Mini label="Healthy Range BMI" value={enriched.filter((s) => s.health.bmiCategory === 'Normal').length} icon={Activity} tone="green" />
        <Mini label="Immunizations"     value={IMMUNIZATIONS.length} icon={Syringe} tone="brand" sub={`${IMMUNIZATIONS.filter((i) => i.status === 'overdue').length} overdue`} />
        <Mini label="Clinic Visits (30d)" value={CLINIC_VISITS.length} icon={Stethoscope} tone="amber" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-base font-bold text-slate-900 mb-1">BMI Distribution</h3>
          <p className="text-xs text-slate-500 mb-4">Nutritional status across the school</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={bmiDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: 8 }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {bmiDistribution.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <h3 className="text-base font-bold text-slate-900 mb-1">Immunization Status</h3>
          <p className="text-xs text-slate-500 mb-4">All vaccine doses tracked</p>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={immunizationStats} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3}>
                {immunizationStats.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2 text-xs">
            {immunizationStats.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.fill }} />
                <span className="text-slate-700">{d.name} ({d.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent clinic visits */}
      <div className="card p-6">
        <h3 className="text-base font-bold text-slate-900 mb-4">Recent Clinic Visits</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="table-th">Date</th>
                <th className="table-th">Student</th>
                <th className="table-th">Grade & Section</th>
                <th className="table-th">Reason</th>
                <th className="table-th">Treatment</th>
                <th className="table-th">Sent Home</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {CLINIC_VISITS.slice(0, 12).map((v) => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="table-td font-mono text-xs">{v.visitDate}</td>
                  <td className="table-td font-semibold">{v.studentName}</td>
                  <td className="table-td">Grade {v.grade} – {v.section}</td>
                  <td className="table-td"><span className="badge-blue">{v.reason}</span></td>
                  <td className="table-td text-xs text-slate-600">{v.treatment}</td>
                  <td className="table-td">
                    {v.sentHome
                      ? <span className="badge-amber">Yes</span>
                      : <span className="badge-slate">No</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Health records list */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search students…"
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </div>
        <Filter className="w-4 h-4 text-slate-400" />
        <select value={bmiFilter} onChange={(e) => setBmiFilter(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white">
          <option value="all">All BMI Categories</option>
          <option value="Wasted">Wasted</option>
          <option value="Normal">Normal</option>
          <option value="Overweight">Overweight</option>
          <option value="Obese">Obese</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
          <table className="w-full">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="table-th">Student</th>
                <th className="table-th">Grade</th>
                <th className="table-th">Height</th>
                <th className="table-th">Weight</th>
                <th className="table-th">BMI</th>
                <th className="table-th">Blood</th>
                <th className="table-th">Allergies</th>
                <th className="table-th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filtered.slice(0, 100).map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="table-td font-semibold">{s.name}</td>
                  <td className="table-td">Grade {s.grade}</td>
                  <td className="table-td">{s.health.heightCm} cm</td>
                  <td className="table-td">{s.health.weightKg} kg</td>
                  <td className="table-td">
                    <span className="font-bold text-slate-900">{s.health.bmi}</span>
                    <span className={`ml-2 ${
                      s.health.bmiCategory === 'Normal' ? 'badge-green' :
                      s.health.bmiCategory === 'Wasted' ? 'badge-blue' :
                      s.health.bmiCategory === 'Overweight' ? 'badge-amber' : 'badge-red'
                    }`}>{s.health.bmiCategory}</span>
                  </td>
                  <td className="table-td">{s.health.bloodType}</td>
                  <td className="table-td text-xs">{s.health.allergies}</td>
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
                <p className="text-xs text-slate-500">Grade {selected.grade}-{selected.section}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-3 gap-3">
                <Stat icon={Ruler}   label="Height" value={`${selected.health.heightCm} cm`} />
                <Stat icon={Weight}  label="Weight" value={`${selected.health.weightKg} kg`} />
                <Stat icon={Droplet} label="Blood"  value={selected.health.bloodType} />
              </div>

              <div className={`rounded-xl p-4 border ${
                selected.health.bmiCategory === 'Normal' ? 'bg-emerald-50 border-emerald-200' :
                selected.health.bmiCategory === 'Wasted' ? 'bg-blue-50 border-blue-200' :
                selected.health.bmiCategory === 'Overweight' ? 'bg-amber-50 border-amber-200' :
                'bg-red-50 border-red-200'
              }`}>
                <p className="text-xs uppercase text-slate-600 font-semibold">BMI</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  {selected.health.bmi}
                  <span className="text-base text-slate-500 ml-2">{selected.health.bmiCategory}</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <Info label="Allergies" value={selected.health.allergies} />
                <Info label="Medical Conditions" value={selected.health.medicalConditions || 'None'} />
                <Info label="Vision" value={selected.health.vision} />
                <Info label="Hearing" value={selected.health.hearing} />
                <Info label="Last Measured" value={selected.health.measuredOn} full />
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-2">Immunization Record</h4>
                <div className="space-y-2">
                  {IMMUNIZATIONS.filter((i) => i.studentId === selected.id).map((i, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Syringe className="w-4 h-4 text-slate-500" />
                        <span className="text-sm text-slate-800">{i.vaccine}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500">{i.administeredOn || '—'}</span>
                        <span className={
                          i.status === 'completed' ? 'badge-green' :
                          i.status === 'pending' ? 'badge-amber' : 'badge-red'
                        }>{i.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3 text-center">
      <Icon className="w-4 h-4 mx-auto text-slate-400" />
      <p className="text-xs text-slate-500 mt-1">{label}</p>
      <p className="text-base font-bold text-slate-900">{value}</p>
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

function Mini({ label, value, icon: Icon, tone, sub }) {
  const tones = {
    red:    'bg-red-50 text-red-700',
    green:  'bg-emerald-50 text-emerald-700',
    brand:  'bg-brand-50 text-brand-700',
    amber:  'bg-amber-50 text-amber-700'
  }
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase text-slate-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">{value}</p>
          {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tones[tone]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  )
}
