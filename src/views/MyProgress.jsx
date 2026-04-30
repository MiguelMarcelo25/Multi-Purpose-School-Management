import { useMemo } from 'react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts'
import {
  GraduationCap, CalendarCheck, Sparkles, Award, BookOpen, Heart, Syringe
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useData } from '../context/DataContext.jsx'
import { HEALTH_RECORDS, IMMUNIZATIONS } from '../data/mockData.js'

export default function MyProgress() {
  const { profile } = useAuth()
  const { students } = useData()

  // In demo mode, just pick the first student to showcase the view.
  // In live mode this would come from `students.find(s => s.profileId === profile.id)`
  const me = students[0]

  if (!me) {
    return <div className="p-8"><p className="text-sm text-slate-500">No student record linked to this account yet. Ask the school admin to link your account.</p></div>
  }

  const subjectData = useMemo(
    () => Object.entries(me.grades || {}).map(([subject, grade]) => ({ subject, grade })),
    [me]
  )

  // Mocked quarter trend
  const quarterTrend = [
    { quarter: 'Q1', avg: Math.max(60, me.average - 4) },
    { quarter: 'Q2', avg: Math.max(60, me.average - 1) },
    { quarter: 'Q3', avg: me.average },
    { quarter: 'Q4 (proj.)', avg: me.risk?.projectedAverage }
  ]

  const myHealth = HEALTH_RECORDS.find((h) => h.studentId === me.id)
  const myImmun = IMMUNIZATIONS.filter((i) => i.studentId === me.id)

  return (
    <div className="p-8 space-y-6">
      {/* Greeting */}
      <div className="rounded-2xl bg-gradient-to-br from-brand-700 via-brand-600 to-purple-600 p-6 text-white shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-xl font-bold">
              {me.name.split(' ').map(n => n[0]).slice(0,2).join('')}
            </div>
            <div>
              <p className="text-xs uppercase text-brand-100 font-semibold">Welcome back</p>
              <h2 className="text-2xl font-bold leading-tight">{profile?.full_name || me.name}</h2>
              <p className="text-brand-100 text-sm mt-1">Grade {me.grade} – {me.section} · LRN {me.id}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-brand-100 uppercase font-semibold">Overall Average</p>
            <p className="text-4xl font-bold">{me.average.toFixed(1)}</p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Mini label="My Average"     value={`${me.average.toFixed(1)}%`}        icon={GraduationCap} tone="brand" />
        <Mini label="Attendance"     value={`${me.attendance}%`}                icon={CalendarCheck} tone="green" />
        <Mini label="Predicted Avg." value={me.risk?.projectedAverage ?? '—'}   icon={Sparkles}      tone="purple" sub="Next quarter" />
        <Mini label="Honor Roll"     value={me.average >= 90 ? 'Yes' : 'No'}    icon={Award}         tone="amber" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-base font-bold text-slate-900 mb-1">My Grade Trend</h3>
          <p className="text-xs text-slate-500 mb-4">Quarter-over-quarter average</p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={quarterTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="quarter" stroke="#64748b" fontSize={12} />
              <YAxis domain={[60, 100]} stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: 8 }} />
              <Line type="monotone" dataKey="avg" stroke="#2563eb" strokeWidth={3} dot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <h3 className="text-base font-bold text-slate-900 mb-1">Subject Breakdown</h3>
          <p className="text-xs text-slate-500 mb-4">Your performance by subject</p>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={subjectData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: '#64748b' }} />
              <PolarRadiusAxis angle={90} domain={[60, 100]} tick={{ fontSize: 10 }} />
              <Radar dataKey="grade" stroke="#2563eb" fill="#2563eb" fillOpacity={0.4} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Subject grades list */}
      <div className="card p-6">
        <h3 className="text-base font-bold text-slate-900 mb-4">My Subject Grades</h3>
        <div className="space-y-3">
          {subjectData.map((s) => (
            <div key={s.subject} className="flex items-center gap-4">
              <span className="w-24 text-sm font-medium text-slate-700">{s.subject}</span>
              <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${s.grade < 75 ? 'bg-red-500' : s.grade < 85 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${s.grade}%` }}
                />
              </div>
              <span className={`w-12 text-right text-sm font-bold ${s.grade < 75 ? 'text-red-600' : 'text-slate-700'}`}>
                {s.grade}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Health snapshot */}
      {myHealth && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Heart className="w-5 h-5 text-red-500" />
              <h3 className="text-base font-bold text-slate-900">My Health Snapshot</h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <SmallStat label="Height" value={`${myHealth.heightCm} cm`} />
              <SmallStat label="Weight" value={`${myHealth.weightKg} kg`} />
              <SmallStat label="BMI"    value={myHealth.bmi} sub={myHealth.bmiCategory} />
              <SmallStat label="Blood"  value={myHealth.bloodType} />
              <SmallStat label="Vision" value={myHealth.vision} />
              <SmallStat label="Allergies" value={myHealth.allergies} />
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Syringe className="w-5 h-5 text-brand-600" />
              <h3 className="text-base font-bold text-slate-900">My Immunizations</h3>
            </div>
            <div className="space-y-2 max-h-[260px] overflow-y-auto">
              {myImmun.map((i, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                  <span className="text-sm text-slate-800">{i.vaccine}</span>
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
      )}
    </div>
  )
}

function Mini({ label, value, icon: Icon, tone, sub }) {
  const tones = {
    brand:  'bg-brand-50 text-brand-700',
    green:  'bg-emerald-50 text-emerald-700',
    amber:  'bg-amber-50 text-amber-700',
    purple: 'bg-purple-50 text-purple-700'
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

function SmallStat({ label, value, sub }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3 text-center">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-bold text-slate-900 mt-1">{value}</p>
      {sub && <p className="text-[10px] text-slate-500">{sub}</p>}
    </div>
  )
}
