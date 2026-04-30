import {
  Users, GraduationCap, CalendarCheck, AlertTriangle, Brain, TrendingUp,
  ArrowRight, Sparkles
} from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts'
import StatCard from '../components/StatCard.jsx'
import { useData } from '../context/DataContext.jsx'

export default function Dashboard({ onNavigate }) {
  const { metrics, alerts, charts } = useData()

  // Build risk distribution from current metrics so it stays in sync with live data
  const riskDistribution = [
    { name: 'Low Risk',    value: metrics.lowRisk,    color: '#10b981' },
    { name: 'Medium Risk', value: metrics.mediumRisk, color: '#f59e0b' },
    { name: 'High Risk',   value: metrics.highRisk,   color: '#ef4444' }
  ]

  return (
    <div className="p-8 space-y-6">
      {/* Hero / AI Summary */}
      <div className="rounded-2xl bg-gradient-to-br from-brand-700 via-brand-600 to-blue-500 p-6 text-white shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">AI Insight — School Year 2025–2026</h2>
              <p className="text-brand-100 text-sm mt-1 max-w-2xl">
                The predictive model identifies <span className="font-bold text-white">{metrics.highRisk} students</span> at
                high dropout risk this quarter. Attendance trend remains stable at{' '}
                <span className="font-bold text-white">{metrics.avgAttendance}%</span>. Recommended focus:
                Grade 4 Mathematics and Grade 6 attendance interventions.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('predictive')}
            className="bg-white text-brand-700 hover:bg-brand-50 px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 shadow"
          >
            View AI Predictions <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Students"     value={metrics.totalStudents}        icon={Users}         trend={4.2}  tone="brand" sub={`${metrics.sections} sections, ${metrics.grades} grades`} />
        <StatCard label="Avg. Performance"   value={`${metrics.avgGrade}%`}       icon={GraduationCap} trend={2.1}  tone="green" sub="Quarterly average across subjects" />
        <StatCard label="Attendance Rate"    value={`${metrics.avgAttendance}%`}  icon={CalendarCheck} trend={-0.8} tone="amber" sub="School year to date" />
        <StatCard label="High-Risk Students" value={metrics.highRisk}             icon={AlertTriangle} trend={-6.2} tone="red"   sub={`${metrics.dropoutRiskPct}% of population`} />
      </div>

      {/* Main charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Enrollment Trend & Forecast</h3>
              <p className="text-xs text-slate-500">Linear projection for SY 2026–2027 and 2027–2028</p>
            </div>
            <span className="badge-blue"><Brain className="w-3 h-3" /> AI Forecast</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={charts.enrollmentForecast}>
              <defs>
                <linearGradient id="grdActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="grdProj" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="year" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="students"  stroke="#2563eb" strokeWidth={2.5} fill="url(#grdActual)" name="Actual" />
              <Area type="monotone" dataKey="projected" stroke="#a855f7" strokeWidth={2.5} strokeDasharray="6 4" fill="url(#grdProj)" name="Projected" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900">Risk Distribution</h3>
            <p className="text-xs text-slate-500">Predictive risk levels (current quarter)</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={riskDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}>
                {riskDistribution.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {riskDistribution.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                  <span className="text-slate-700">{d.name}</span>
                </div>
                <span className="font-semibold text-slate-900">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Secondary row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Monthly Attendance Trend</h3>
              <p className="text-xs text-slate-500">School year 2025–2026</p>
            </div>
            <span className="badge-green"><TrendingUp className="w-3 h-3" /> Stable</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={charts.attendanceByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} domain={[80, 100]} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }} />
              <Line type="monotone" dataKey="attendance" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900">Performance by Grade</h3>
            <p className="text-xs text-slate-500">Average across all subjects</p>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={charts.gradePerformance} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" stroke="#64748b" fontSize={12} domain={[70, 95]} />
              <YAxis type="category" dataKey="grade" stroke="#64748b" fontSize={12} width={70} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }} />
              <Bar dataKey="average" fill="#2563eb" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Alerts */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent AI-Generated Alerts</h3>
            <p className="text-xs text-slate-500">High-priority interventions detected by predictive engine</p>
          </div>
          <button onClick={() => onNavigate('alerts')} className="text-sm text-brand-700 font-semibold hover:underline flex items-center gap-1">
            View all <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className="divide-y divide-slate-100">
          {alerts.slice(0, 5).map((alert) => (
            <div key={alert.id} className="py-3 flex items-center gap-4">
              <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900">{alert.student}</p>
                  <span className="badge-slate">Grade {alert.grade}-{alert.section}</span>
                  <span className="badge-red">{alert.type}</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{alert.note}</p>
              </div>
              <span className="text-xs text-slate-400">{alert.detectedAt}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
