import { AlertTriangle, Bell, CheckCircle, Clock } from 'lucide-react'
import { ALERTS, STUDENTS_WITH_RISK } from '../data/mockData.js'

const allAlerts = [
  ...ALERTS,
  ...STUDENTS_WITH_RISK.filter((s) => s.risk.level === 'Medium').slice(0, 12).map((s, i) => ({
    id: `M-${i}`,
    student: s.name,
    studentId: s.id,
    grade: s.grade,
    section: s.section,
    type: s.attendance < 88 ? 'Attendance' : s.average < 82 ? 'Academic' : 'Tardiness',
    severity: 'Medium',
    detectedAt: `2026-04-${(15 + i) % 30}`,
    note: `Watchlist: ${s.name} flagged with risk score ${Math.round(s.risk.score)}.`
  }))
]

export default function Alerts() {
  return (
    <div className="p-8 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Mini label="Active Alerts"  value={allAlerts.length} icon={Bell} tone="red" />
        <Mini label="High Severity"  value={ALERTS.length}    icon={AlertTriangle} tone="red" />
        <Mini label="Resolved"       value="34" icon={CheckCircle} tone="green" />
        <Mini label="Avg. Response"  value="2.1d" icon={Clock} tone="amber" />
      </div>

      <div className="card p-6">
        <h3 className="text-base font-bold text-slate-900 mb-4">All Alerts</h3>
        <div className="divide-y divide-slate-100">
          {allAlerts.map((a) => {
            const sev = a.severity === 'High' ? 'red' : 'amber'
            const tones = { red: 'bg-red-50 text-red-700 border-red-200', amber: 'bg-amber-50 text-amber-700 border-amber-200' }
            return (
              <div key={a.id} className="py-4 flex items-start gap-4">
                <div className={`w-10 h-10 rounded-full border flex items-center justify-center flex-shrink-0 ${tones[sev]}`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-slate-900">{a.student}</p>
                    <span className="badge-slate font-mono">{a.studentId}</span>
                    <span className="badge-slate">Grade {a.grade}-{a.section}</span>
                    <span className={a.severity === 'High' ? 'badge-red' : 'badge-amber'}>{a.severity}</span>
                    <span className="badge-blue">{a.type}</span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">{a.note}</p>
                  <p className="text-xs text-slate-400 mt-1">{a.detectedAt}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button className="btn-ghost text-xs">Dismiss</button>
                  <button className="btn-primary text-xs py-1.5">Take Action</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Mini({ label, value, icon: Icon, tone }) {
  const tones = {
    red:   'bg-red-50 text-red-700',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700'
  }
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase text-slate-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tones[tone]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  )
}
