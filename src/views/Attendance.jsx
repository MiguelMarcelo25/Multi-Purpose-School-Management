import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine
} from 'recharts'
import { CalendarCheck, AlertCircle, TrendingDown, Users } from 'lucide-react'
import { ATTENDANCE_BY_MONTH, STUDENTS_WITH_RISK, SCHOOL_METRICS } from '../data/mockData.js'

// Linear projection for next 2 months
const ATTENDANCE_PROJECTED = (() => {
  const data = ATTENDANCE_BY_MONTH
  const xs = data.map((_, i) => i)
  const ys = data.map((d) => d.attendance)
  const n = xs.length
  const sx = xs.reduce((a, b) => a + b, 0)
  const sy = ys.reduce((a, b) => a + b, 0)
  const sxy = xs.reduce((a, b, i) => a + b * ys[i], 0)
  const sxx = xs.reduce((a, b) => a + b * b, 0)
  const m = (n * sxy - sx * sy) / (n * sxx - sx * sx)
  const c = (sy - m * sx) / n
  return [
    ...data.map((d) => ({ ...d, projected: null })),
    { month: 'May', attendance: null, projected: Math.round((m * n + c) * 10) / 10 },
    { month: 'Jun', attendance: null, projected: Math.round((m * (n + 1) + c) * 10) / 10 }
  ]
})()

const ATTENDANCE_BY_GRADE = (() => {
  const buckets = {}
  for (let g = 1; g <= 6; g++) buckets[g] = []
  STUDENTS_WITH_RISK.forEach((s) => buckets[s.grade].push(s.attendance))
  return Object.entries(buckets).map(([g, arr]) => ({
    grade: `Grade ${g}`,
    attendance: Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10
  }))
})()

const chronicAbsentees = STUDENTS_WITH_RISK.filter((s) => s.attendance < 80)
  .sort((a, b) => a.attendance - b.attendance)
  .slice(0, 10)

export default function Attendance() {
  return (
    <div className="p-8 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Mini label="Present Today"      value={`${SCHOOL_METRICS.avgAttendance}%`} icon={CalendarCheck} tone="green" />
        <Mini label="Chronic Absentees"  value={chronicAbsentees.length}            icon={AlertCircle}    tone="red"   sub="< 80% attendance" />
        <Mini label="Tardiness Cases"    value={STUDENTS_WITH_RISK.filter(s => s.tardiness > 5).length} icon={TrendingDown} tone="amber" />
        <Mini label="Perfect Attendance" value={STUDENTS_WITH_RISK.filter(s => s.attendance === 100).length} icon={Users} tone="brand" />
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Attendance Trend & Predicted Outlook</h3>
            <p className="text-xs text-slate-500">Solid = actual, dashed = forecast (linear regression)</p>
          </div>
          <span className="badge-blue">Forecast next 2 months</span>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={ATTENDANCE_PROJECTED}>
            <defs>
              <linearGradient id="atActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="atProj" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a855f7" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
            <YAxis domain={[80, 100]} stroke="#64748b" fontSize={12} />
            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }} />
            <ReferenceLine y={90} stroke="#94a3b8" strokeDasharray="3 3" label={{ value: 'Target 90%', position: 'right', fontSize: 10, fill: '#64748b' }} />
            <Area type="monotone" dataKey="attendance" stroke="#10b981" strokeWidth={3} fill="url(#atActual)" />
            <Area type="monotone" dataKey="projected"  stroke="#a855f7" strokeWidth={3} strokeDasharray="6 4" fill="url(#atProj)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-base font-bold text-slate-900 mb-1">Attendance by Grade Level</h3>
          <p className="text-xs text-slate-500 mb-4">Identify grades needing intervention</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={ATTENDANCE_BY_GRADE}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="grade" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} domain={[80, 100]} />
              <Tooltip contentStyle={{ borderRadius: 8 }} />
              <ReferenceLine y={90} stroke="#ef4444" strokeDasharray="3 3" />
              <Bar dataKey="attendance" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <h3 className="text-base font-bold text-slate-900 mb-4">Chronic Absentees</h3>
          <div className="space-y-2 max-h-[260px] overflow-y-auto">
            {chronicAbsentees.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-100">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{s.name}</p>
                  <p className="text-xs text-slate-600">Grade {s.grade}-{s.section} · {s.tardiness} tardies</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-red-600">{s.attendance}%</p>
                  <p className="text-[10px] uppercase text-slate-400">attendance</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function Mini({ label, value, icon: Icon, tone, sub }) {
  const tones = {
    green: 'bg-emerald-50 text-emerald-700',
    red:   'bg-red-50 text-red-700',
    amber: 'bg-amber-50 text-amber-700',
    brand: 'bg-brand-50 text-brand-700'
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
